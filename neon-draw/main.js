"use strict";

(function () {
  // ── Constants ──────────────────────────────────────────────────
  const PINCH_THRESHOLD = 0.07;    // normalized distance (0~1), ~40px on 640px stream
  const MIN_MOVE_PX     = 2;       // skip drawing if movement smaller than this (px)
  const GLOW_BLUR_OUTER = 30;      // wide outer glow shadowBlur
  const GLOW_BLUR_MID   = 10;      // mid glow shadowBlur
  const GLOW_BLUR_CORE  = 4;       // tight bright core shadowBlur

  // MediaPipe landmark indices
  const THUMB_TIP  = 4;
  const INDEX_PIP  = 6;   // index finger middle joint
  const INDEX_TIP  = 8;   // index finger tip

  // ── DOM refs ───────────────────────────────────────────────────
  const video       = document.getElementById('webcam');
  const canvas      = document.getElementById('draw-canvas');
  const ctx         = canvas.getContext('2d');
  const statusBadge = document.getElementById('status-badge');
  const statusText  = document.getElementById('status-text');
  const clearBtn    = document.getElementById('clear-btn');
  const sizeSlider  = document.getElementById('brush-size');
  const cameraError = document.getElementById('camera-error');

  // ── State ──────────────────────────────────────────────────────
  let activeColor  = '#00f5ff';
  let brushSize    = 8;
  let isDrawing    = false;   // false = PAUSED, true = DRAWING
  let prevPoint    = null;    // {x, y} last drawn canvas position
  let lastMid      = null;    // midpoint smoothing state
  let wasPinching  = false;   // for edge-trigger pinch detection

  // ── Canvas sizing ──────────────────────────────────────────────
  function resizeCanvas() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    // Note: resizing clears the canvas bitmap — acceptable behavior
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  // ── Coordinate conversion ──────────────────────────────────────
  // MediaPipe returns raw (unmirrored) normalized coords.
  // The <video> is CSS-mirrored (scaleX(-1)), so we flip X to match.
  function toCanvas(lm) {
    return {
      x: (1 - lm.x) * canvas.width,
      y: lm.y * canvas.height
    };
  }

  // ── Pen lift ───────────────────────────────────────────────────
  function liftPen() {
    prevPoint = null;
    lastMid   = null;
  }

  // ── Status badge ───────────────────────────────────────────────
  function updateStatus() {
    if (isDrawing) {
      statusBadge.className = 'status-drawing';
      statusText.textContent = 'DRAWING';
    } else {
      statusBadge.className = 'status-paused';
      statusText.textContent = 'PAUSED';
    }
  }

  // ── Neon stroke (3-pass glow) ──────────────────────────────────
  function drawNeonStroke(from, to) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    if (Math.hypot(dx, dy) < MIN_MOVE_PX) return;

    ctx.save();
    ctx.lineCap  = 'round';
    ctx.lineJoin = 'round';

    // Pass 1: wide outer glow
    ctx.globalAlpha = 0.35;
    ctx.shadowColor = activeColor;
    ctx.shadowBlur  = GLOW_BLUR_OUTER;
    ctx.strokeStyle = activeColor;
    ctx.lineWidth   = brushSize * 2.5;
    drawSegment(from, to);

    // Pass 2: mid glow
    ctx.globalAlpha = 0.65;
    ctx.shadowBlur  = GLOW_BLUR_MID;
    ctx.lineWidth   = brushSize;
    drawSegment(from, to);

    // Pass 3: bright white core
    ctx.globalAlpha = 0.9;
    ctx.shadowBlur  = GLOW_BLUR_CORE;
    ctx.shadowColor = '#ffffff';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth   = Math.max(1, brushSize * 0.4);
    drawSegment(from, to);

    ctx.restore();
  }

  // ── Mid-point smoothing (quadratic bezier) ─────────────────────
  // Connects segments through midpoints to avoid jagged corners.
  function drawSegment(from, to) {
    const mid = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
    ctx.beginPath();
    if (lastMid) {
      ctx.moveTo(lastMid.x, lastMid.y);
      ctx.quadraticCurveTo(from.x, from.y, mid.x, mid.y);
    } else {
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(mid.x, mid.y);
    }
    ctx.stroke();
    lastMid = mid;
  }

  // ── MediaPipe result handler ───────────────────────────────────
  function onHandResults(results) {
    if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
      // Hand left frame or tracking lost — lift pen
      liftPen();
      return;
    }

    const lm = results.multiHandLandmarks[0];

    const thumbTip = lm[THUMB_TIP];
    const indexPIP = lm[INDEX_PIP];
    const indexTip = lm[INDEX_TIP];

    // ── Pinch detection (normalized distance) ──────────────────
    const pinchDist  = Math.hypot(thumbTip.x - indexTip.x, thumbTip.y - indexTip.y);
    const isPinching = pinchDist < PINCH_THRESHOLD;

    // Edge-trigger: only toggle on the transition false→true
    if (isPinching && !wasPinching) {
      isDrawing = !isDrawing;
      liftPen();       // lift pen on mode change to avoid jump lines
      updateStatus();
    }
    wasPinching = isPinching;

    // ── Index finger extended check ────────────────────────────
    // Y=0 is top of frame; tip above PIP means finger is pointing up
    const indexExtended = indexTip.y < indexPIP.y;

    // ── Drawing ────────────────────────────────────────────────
    if (isDrawing && indexExtended && !isPinching) {
      const pt = toCanvas(indexTip);
      if (prevPoint) {
        drawNeonStroke(prevPoint, pt);
      }
      prevPoint = pt;
    } else {
      liftPen();
    }
  }

  // ── MediaPipe Hands init ───────────────────────────────────────
  const hands = new Hands({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
  });

  hands.setOptions({
    maxNumHands:            1,
    modelComplexity:        1,    // 0=lite, 1=full (better accuracy)
    minDetectionConfidence: 0.7,
    minTrackingConfidence:  0.5
  });

  hands.onResults(onHandResults);

  // ── Camera init ────────────────────────────────────────────────
  const camera = new Camera(video, {
    onFrame: async () => {
      await hands.send({ image: video });
    },
    width:  1280,
    height: 720
  });

  camera.start().catch(() => {
    cameraError.classList.remove('hidden');
  });

  // ── UI: color swatches ─────────────────────────────────────────
  document.querySelectorAll('.color-swatch').forEach(function (btn) {
    btn.addEventListener('click', function () {
      activeColor = btn.dataset.color;
      document.querySelectorAll('.color-swatch').forEach(function (b) {
        b.classList.remove('active');
      });
      btn.classList.add('active');
    });
  });

  // ── UI: brush size ─────────────────────────────────────────────
  sizeSlider.addEventListener('input', function () {
    brushSize = parseInt(sizeSlider.value, 10);
  });

  // ── UI: clear ─────────────────────────────────────────────────
  clearBtn.addEventListener('click', function () {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    liftPen();
  });

  // Init status badge
  updateStatus();
})();
