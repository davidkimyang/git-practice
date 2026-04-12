"use strict";

(function () {

  // ══════════════════════════════════════════════
  // Constants
  // ══════════════════════════════════════════════
  const PINCH_THRESHOLD  = 0.07;  // normalized distance for pinch detection
  const MIN_MOVE_PX      = 2;     // minimum movement to record a new point
  const ERASE_RADIUS     = 28;    // eraser brush radius in px
  const GRAB_RADIUS      = 160;   // max distance to grab an object in move mode
  const EMOJI_SIZE       = 64;    // default emoji font size px

  const GLOW_OUTER = 30;
  const GLOW_MID   = 10;
  const GLOW_CORE  = 4;

  // MediaPipe landmark indices
  const THUMB_TIP = 4;
  const INDEX_PIP = 6;
  const INDEX_TIP = 8;

  // ══════════════════════════════════════════════
  // DOM
  // ══════════════════════════════════════════════
  const video       = document.getElementById('webcam');
  const drawCanvas  = document.getElementById('draw-canvas');
  const overlayCanvas = document.getElementById('overlay-canvas');
  const dCtx        = drawCanvas.getContext('2d');
  const oCtx        = overlayCanvas.getContext('2d');
  const statusBadge = document.getElementById('status-badge');
  const statusText  = document.getElementById('status-text');
  const instrText   = document.getElementById('instruction-text');
  const drawPanel   = document.getElementById('draw-panel');
  const emojiPanel  = document.getElementById('emoji-panel');
  const movePanel   = document.getElementById('move-panel');

  // ══════════════════════════════════════════════
  // Modes
  // ══════════════════════════════════════════════
  const MODE = { DRAW: 'draw', ERASE: 'erase', MOVE: 'move', EMOJI: 'emoji' };
  let currentMode = MODE.DRAW;

  const MODE_CONFIG = {
    [MODE.DRAW]:  { label: 'DRAW',  instruction: '☝️ 검지 펴서 그리기  |  🤏 핀치로 펜 UP/DOWN' },
    [MODE.ERASE]: { label: 'ERASE', instruction: '☝️ 검지로 획 지우기  |  손가락 내리면 정지' },
    [MODE.MOVE]:  { label: 'MOVE',  instruction: '🤏 핀치로 오브젝트 잡기 → 이동 → 놓기  |  🗑️ 위로 드래그하면 삭제' },
    [MODE.EMOJI]: { label: 'EMOJI', instruction: '이모티콘 선택 → 손으로 위치 잡기 → 🤏 핀치로 배치' },
  };

  // ══════════════════════════════════════════════
  // Drawing state
  // ══════════════════════════════════════════════
  let activeColor = '#00f5ff';
  let brushSize   = 8;
  let penDown     = false;
  let wasPinching = false;

  // ══════════════════════════════════════════════
  // Scene graph
  // All drawn objects live here. Rendering re-draws
  // all objects every RAF frame from this data.
  //
  // Stroke: { type:'stroke', paths:[[{x,y},...]], color, size, offsetX, offsetY }
  // Emoji:  { type:'emoji',  char, x, y, size, offsetX, offsetY }
  // ══════════════════════════════════════════════
  const scene = [];
  let currentStroke = null; // stroke currently being built
  let lastPt        = null; // last point added to current stroke path

  // ══════════════════════════════════════════════
  // Move state
  // ══════════════════════════════════════════════
  let selectedObj = null;
  let lastMoveX   = 0;
  let lastMoveY   = 0;

  // ══════════════════════════════════════════════
  // Emoji placement state
  // ══════════════════════════════════════════════
  let pendingEmoji = null; // char string waiting to be placed

  // ══════════════════════════════════════════════
  // Cursor / hand state (updated by MediaPipe)
  // ══════════════════════════════════════════════
  let cursorX      = -1;
  let cursorY      = -1;
  let handVisible  = false;
  let latestLandmarks = null;

  // Dirty flag: only re-render draw canvas when scene changes
  let sceneDirty = true;
  function markDirty() { sceneDirty = true; }

  // ══════════════════════════════════════════════
  // Canvas resize
  // ══════════════════════════════════════════════
  function resizeCanvases() {
    drawCanvas.width    = window.innerWidth;
    drawCanvas.height   = window.innerHeight;
    overlayCanvas.width  = window.innerWidth;
    overlayCanvas.height = window.innerHeight;
    markDirty();
  }
  window.addEventListener('resize', resizeCanvases);
  resizeCanvases();

  // ══════════════════════════════════════════════
  // Coordinate helpers
  // ══════════════════════════════════════════════
  // MediaPipe gives raw (unmirrored) normalized coords.
  // Video is CSS-mirrored, so flip X.
  function toCanvas(lm) {
    return {
      x: (1 - lm.x) * drawCanvas.width,
      y: lm.y * drawCanvas.height
    };
  }

  // ══════════════════════════════════════════════
  // Scene object factories
  // ══════════════════════════════════════════════
  function createStroke(color, size) {
    return { type: 'stroke', paths: [[]], color, size, offsetX: 0, offsetY: 0 };
  }

  function createEmoji(char, x, y) {
    return { type: 'emoji', char, x, y, size: EMOJI_SIZE, offsetX: 0, offsetY: 0 };
  }

  // ══════════════════════════════════════════════
  // Object geometry helpers
  // ══════════════════════════════════════════════
  function getCenter(obj) {
    if (obj.type === 'emoji') {
      return { x: obj.x + obj.offsetX, y: obj.y + obj.offsetY };
    }
    let sx = 0, sy = 0, n = 0;
    for (const path of obj.paths) {
      for (const p of path) { sx += p.x + obj.offsetX; sy += p.y + obj.offsetY; n++; }
    }
    return n ? { x: sx / n, y: sy / n } : { x: 0, y: 0 };
  }

  function findNearest(x, y) {
    let nearest = null;
    let minDist = GRAB_RADIUS;
    for (const obj of scene) {
      const c = getCenter(obj);
      const d = Math.hypot(c.x - x, c.y - y);
      if (d < minDist) { minDist = d; nearest = obj; }
    }
    return nearest;
  }

  // ══════════════════════════════════════════════
  // Eraser: remove stroke points within radius,
  // splitting paths where points are removed.
  // ══════════════════════════════════════════════
  function eraseAt(x, y) {
    let changed = false;
    for (let i = scene.length - 1; i >= 0; i--) {
      const obj = scene[i];
      if (obj.type !== 'stroke') continue;

      const ex = x - obj.offsetX;
      const ey = y - obj.offsetY;
      const newPaths = [];

      for (const path of obj.paths) {
        const segs = splitPathByRadius(path, ex, ey, ERASE_RADIUS);
        newPaths.push(...segs);
      }

      const filtered = newPaths.filter(p => p.length > 1);
      if (filtered.length !== obj.paths.length ||
          filtered.some((p, i) => p.length !== obj.paths[i].length)) {
        changed = true;
      }
      obj.paths = filtered;
      if (obj.paths.length === 0) { scene.splice(i, 1); changed = true; }
    }
    if (changed) markDirty();
  }

  // Split a single path into sub-paths, removing points within radius
  function splitPathByRadius(path, cx, cy, r) {
    const result = [];
    let current = [];
    for (const pt of path) {
      if (Math.hypot(pt.x - cx, pt.y - cy) < r) {
        if (current.length > 1) result.push(current);
        current = [];
      } else {
        current.push(pt);
      }
    }
    if (current.length > 1) result.push(current);
    return result;
  }

  // ══════════════════════════════════════════════
  // Rendering: draw canvas (scene graph)
  // ══════════════════════════════════════════════
  function renderScene() {
    dCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
    for (const obj of scene) {
      if (obj.type === 'stroke') renderStroke(obj);
      else if (obj.type === 'emoji') renderEmoji(obj);
    }

    // Highlight selected object in move mode
    if (selectedObj && currentMode === MODE.MOVE) {
      const c = getCenter(selectedObj);
      dCtx.save();
      dCtx.globalAlpha   = 0.5;
      dCtx.strokeStyle   = '#fff';
      dCtx.lineWidth     = 1.5;
      dCtx.shadowBlur    = 0;
      dCtx.setLineDash([5, 4]);
      dCtx.beginPath();
      dCtx.arc(c.x, c.y, 36, 0, Math.PI * 2);
      dCtx.stroke();
      dCtx.restore();
    }
  }

  // 3-pass neon stroke
  function renderStroke(stroke) {
    dCtx.save();
    dCtx.translate(stroke.offsetX, stroke.offsetY);
    dCtx.lineCap  = 'round';
    dCtx.lineJoin = 'round';

    for (const path of stroke.paths) {
      if (path.length < 2) continue;
      neonPass(dCtx, path, stroke.color, stroke.size * 2.5, GLOW_OUTER, stroke.color, 0.35);
      neonPass(dCtx, path, stroke.color, stroke.size,       GLOW_MID,   stroke.color, 0.65);
      neonPass(dCtx, path, '#fff',       Math.max(1, stroke.size * 0.4), GLOW_CORE, '#fff', 0.9);
    }
    dCtx.restore();
  }

  function neonPass(c, pts, strokeColor, lineWidth, blur, shadowColor, alpha) {
    c.globalAlpha = alpha;
    c.shadowBlur  = blur;
    c.shadowColor = shadowColor;
    c.strokeStyle = strokeColor;
    c.lineWidth   = lineWidth;
    drawSmoothPath(c, pts);
  }

  // Quadratic bezier mid-point smoothing
  function drawSmoothPath(c, pts) {
    c.beginPath();
    c.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length - 1; i++) {
      const mx = (pts[i].x + pts[i + 1].x) / 2;
      const my = (pts[i].y + pts[i + 1].y) / 2;
      c.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
    }
    c.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
    c.stroke();
  }

  function renderEmoji(emoji) {
    dCtx.save();
    dCtx.globalAlpha    = 1;
    dCtx.shadowBlur     = 0;
    dCtx.font           = `${emoji.size}px serif`;
    dCtx.textAlign      = 'center';
    dCtx.textBaseline   = 'middle';
    dCtx.fillText(emoji.char, emoji.x + emoji.offsetX, emoji.y + emoji.offsetY);
    dCtx.restore();
  }

  // ══════════════════════════════════════════════
  // Rendering: overlay canvas (cursor + skeleton)
  // ══════════════════════════════════════════════
  function renderOverlay() {
    oCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    if (!handVisible) return;

    // Hand skeleton
    if (latestLandmarks) drawHandSkeleton(latestLandmarks);

    if (cursorX < 0) return;

    oCtx.save();

    if (currentMode === MODE.ERASE) {
      // Eraser circle
      oCtx.globalAlpha = 0.55;
      oCtx.strokeStyle = '#fff';
      oCtx.lineWidth   = 1.5;
      oCtx.shadowBlur  = 0;
      oCtx.beginPath();
      oCtx.arc(cursorX, cursorY, ERASE_RADIUS, 0, Math.PI * 2);
      oCtx.stroke();
    } else if (currentMode === MODE.EMOJI && pendingEmoji) {
      // Pending emoji preview follows cursor
      oCtx.globalAlpha  = 0.8;
      oCtx.font         = `${EMOJI_SIZE}px serif`;
      oCtx.textAlign    = 'center';
      oCtx.textBaseline = 'middle';
      oCtx.shadowBlur   = 0;
      oCtx.fillText(pendingEmoji, cursorX, cursorY);
    } else {
      // Cursor dot
      const dotColor = currentMode === MODE.DRAW ? activeColor : '#fff';
      oCtx.globalAlpha = 0.85;
      oCtx.shadowColor = dotColor;
      oCtx.shadowBlur  = 18;
      oCtx.fillStyle   = dotColor;
      oCtx.beginPath();
      oCtx.arc(cursorX, cursorY, 5, 0, Math.PI * 2);
      oCtx.fill();

      // Hover highlight in move mode
      if (currentMode === MODE.MOVE && !selectedObj) {
        const hover = findNearest(cursorX, cursorY);
        if (hover) {
          const c = getCenter(hover);
          oCtx.globalAlpha = 0.3;
          oCtx.strokeStyle = var_neonYellow;
          oCtx.lineWidth   = 1.5;
          oCtx.shadowBlur  = 0;
          oCtx.setLineDash([4, 3]);
          oCtx.beginPath();
          oCtx.arc(c.x, c.y, 36, 0, Math.PI * 2);
          oCtx.stroke();
        }
      }
    }

    oCtx.restore();
  }

  const var_neonYellow = '#fff01f';

  function drawHandSkeleton(lm) {
    const connections = [
      [0,1],[1,2],[2,3],[3,4],
      [0,5],[5,6],[6,7],[7,8],
      [0,9],[9,10],[10,11],[11,12],
      [0,13],[13,14],[14,15],[15,16],
      [0,17],[17,18],[18,19],[19,20],
      [5,9],[9,13],[13,17]
    ];

    oCtx.save();
    oCtx.globalAlpha = 0.3;
    oCtx.strokeStyle = '#fff';
    oCtx.lineWidth   = 1.2;
    oCtx.shadowBlur  = 0;

    for (const [a, b] of connections) {
      const pa = toCanvas(lm[a]);
      const pb = toCanvas(lm[b]);
      oCtx.beginPath();
      oCtx.moveTo(pa.x, pa.y);
      oCtx.lineTo(pb.x, pb.y);
      oCtx.stroke();
    }

    oCtx.globalAlpha = 0.45;
    oCtx.fillStyle   = '#fff';
    for (const lmk of lm) {
      const p = toCanvas(lmk);
      oCtx.beginPath();
      oCtx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
      oCtx.fill();
    }
    oCtx.restore();
  }

  // ══════════════════════════════════════════════
  // RAF loop: renders both canvases every frame
  // ══════════════════════════════════════════════
  function loop() {
    if (sceneDirty) {
      renderScene();
      sceneDirty = false;
    }
    renderOverlay();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  // ══════════════════════════════════════════════
  // Gesture handlers (called from onHandResults)
  // ══════════════════════════════════════════════
  function handleDraw(isPinching, indexExtended, pt) {
    const shouldDraw = indexExtended && !isPinching;

    if (shouldDraw) {
      if (!penDown) {
        // Start a new stroke
        penDown = true;
        currentStroke = createStroke(activeColor, brushSize);
        scene.push(currentStroke);
        lastPt = null;
      }
      // Add point to current path
      const path = currentStroke.paths[currentStroke.paths.length - 1];
      if (lastPt) {
        if (Math.hypot(pt.x - lastPt.x, pt.y - lastPt.y) >= MIN_MOVE_PX) {
          path.push(pt);
          lastPt = pt;
          markDirty();
        }
      } else {
        path.push(pt);
        lastPt = pt;
      }
    } else {
      if (penDown) {
        penDown = false;
        // Remove stroke if it has too few points
        if (currentStroke) {
          const total = currentStroke.paths.reduce((s, p) => s + p.length, 0);
          if (total < 2) scene.splice(scene.indexOf(currentStroke), 1);
          currentStroke = null;
          lastPt = null;
          markDirty();
        }
      }
    }
  }

  function handleErase(isPinching, indexExtended, pt) {
    if (indexExtended && !isPinching) {
      eraseAt(pt.x, pt.y);
    }
  }

  function handleMove(isPinching, pt) {
    if (isPinching && !wasPinching) {
      // Grab
      selectedObj = findNearest(pt.x, pt.y);
      lastMoveX   = pt.x;
      lastMoveY   = pt.y;
      markDirty();
    } else if (isPinching && selectedObj) {
      // Drag
      const dx = pt.x - lastMoveX;
      const dy = pt.y - lastMoveY;
      selectedObj.offsetX += dx;
      selectedObj.offsetY += dy;
      lastMoveX = pt.x;
      lastMoveY = pt.y;
      markDirty();
    } else if (!isPinching && wasPinching && selectedObj) {
      // Drop — check if dragged to toolbar area (left ~80px) → delete
      const cx = getCenter(selectedObj).x;
      if (cx < 80) {
        scene.splice(scene.indexOf(selectedObj), 1);
      } else {
        // Commit offset into the object's own coordinates
        if (selectedObj.type === 'stroke') {
          for (const path of selectedObj.paths) {
            for (const p of path) { p.x += selectedObj.offsetX; p.y += selectedObj.offsetY; }
          }
          selectedObj.offsetX = 0;
          selectedObj.offsetY = 0;
        } else if (selectedObj.type === 'emoji') {
          selectedObj.x += selectedObj.offsetX;
          selectedObj.y += selectedObj.offsetY;
          selectedObj.offsetX = 0;
          selectedObj.offsetY = 0;
        }
      }
      selectedObj = null;
      markDirty();
    }
  }

  function handleEmoji(isPinching, pt) {
    if (!pendingEmoji) return;
    // Pinch edge → place emoji at cursor
    if (isPinching && !wasPinching) {
      scene.push(createEmoji(pendingEmoji, pt.x, pt.y));
      pendingEmoji = null;
      document.querySelectorAll('.emoji-btn').forEach(b => b.classList.remove('active'));
      markDirty();
    }
  }

  // ══════════════════════════════════════════════
  // MediaPipe result handler
  // ══════════════════════════════════════════════
  function onHandResults(results) {
    handVisible     = !!(results.multiHandLandmarks && results.multiHandLandmarks.length > 0);
    latestLandmarks = handVisible ? results.multiHandLandmarks[0] : null;

    if (!handVisible) {
      cursorX = cursorY = -1;
      // Lift pen if we lose tracking
      if (penDown) {
        penDown = false;
        if (currentStroke) {
          const total = currentStroke.paths.reduce((s, p) => s + p.length, 0);
          if (total < 2) scene.splice(scene.indexOf(currentStroke), 1);
          currentStroke = null; lastPt = null;
          markDirty();
        }
      }
      if (selectedObj) {
        // Drop without deleting if hand disappears
        if (selectedObj.type === 'stroke') {
          for (const path of selectedObj.paths)
            for (const p of path) { p.x += selectedObj.offsetX; p.y += selectedObj.offsetY; }
          selectedObj.offsetX = selectedObj.offsetY = 0;
        } else if (selectedObj.type === 'emoji') {
          selectedObj.x += selectedObj.offsetX; selectedObj.y += selectedObj.offsetY;
          selectedObj.offsetX = selectedObj.offsetY = 0;
        }
        selectedObj = null; markDirty();
      }
      wasPinching = false;
      return;
    }

    const lm       = latestLandmarks;
    const thumbTip = lm[THUMB_TIP];
    const indexPIP = lm[INDEX_PIP];
    const indexTip = lm[INDEX_TIP];

    // Pinch
    const pinchDist  = Math.hypot(thumbTip.x - indexTip.x, thumbTip.y - indexTip.y);
    const isPinching = pinchDist < PINCH_THRESHOLD;

    // Index extended: tip above PIP joint (Y=0 is top of frame)
    const indexExtended = indexTip.y < indexPIP.y;

    // Cursor
    const pt = toCanvas(indexTip);
    cursorX  = pt.x;
    cursorY  = pt.y;

    // Dispatch to mode handler
    if      (currentMode === MODE.DRAW)  handleDraw(isPinching, indexExtended, pt);
    else if (currentMode === MODE.ERASE) handleErase(isPinching, indexExtended, pt);
    else if (currentMode === MODE.MOVE)  handleMove(isPinching, pt);
    else if (currentMode === MODE.EMOJI) handleEmoji(isPinching, pt);

    wasPinching = isPinching;
  }

  // ══════════════════════════════════════════════
  // Mode switching
  // ══════════════════════════════════════════════
  function setMode(mode) {
    currentMode = mode;

    // Reset transient state
    penDown = false;
    if (currentStroke) {
      const total = currentStroke.paths.reduce((s, p) => s + p.length, 0);
      if (total < 2) scene.splice(scene.indexOf(currentStroke), 1);
      currentStroke = null; lastPt = null; markDirty();
    }
    if (selectedObj) {
      if (selectedObj.type === 'stroke') {
        for (const path of selectedObj.paths)
          for (const p of path) { p.x += selectedObj.offsetX; p.y += selectedObj.offsetY; }
        selectedObj.offsetX = selectedObj.offsetY = 0;
      } else if (selectedObj.type === 'emoji') {
        selectedObj.x += selectedObj.offsetX; selectedObj.y += selectedObj.offsetY;
        selectedObj.offsetX = selectedObj.offsetY = 0;
      }
      selectedObj = null; markDirty();
    }
    pendingEmoji = null;
    document.querySelectorAll('.emoji-btn').forEach(b => b.classList.remove('active'));

    // Toolbar buttons
    document.querySelectorAll('.tool-btn[data-mode]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });

    // Side panels
    drawPanel.classList.toggle('hidden',  mode !== MODE.DRAW);
    emojiPanel.classList.toggle('hidden', mode !== MODE.EMOJI);
    movePanel.classList.toggle('hidden',  mode !== MODE.MOVE);

    // Body class for CSS mode theming
    document.body.className = `mode-${mode}`;

    // Status badge + instruction
    const cfg = MODE_CONFIG[mode];
    statusBadge.className  = `status-${mode}`;
    statusText.textContent = cfg.label;
    instrText.textContent  = cfg.instruction;
  }

  // ══════════════════════════════════════════════
  // UI event listeners
  // ══════════════════════════════════════════════
  // Toolbar mode buttons
  document.querySelectorAll('.tool-btn[data-mode]').forEach(btn => {
    btn.addEventListener('click', () => setMode(btn.dataset.mode));
  });

  // Clear all
  document.getElementById('clear-all-btn').addEventListener('click', () => {
    scene.length  = 0;
    currentStroke = null; lastPt = null;
    penDown = false; selectedObj = null;
    pendingEmoji  = null;
    document.querySelectorAll('.emoji-btn').forEach(b => b.classList.remove('active'));
    markDirty();
  });

  // Color swatches
  document.querySelectorAll('.color-swatch').forEach(btn => {
    btn.addEventListener('click', () => {
      activeColor = btn.dataset.color;
      document.querySelectorAll('.color-swatch').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Brush size
  document.getElementById('brush-size').addEventListener('input', function () {
    brushSize = parseInt(this.value, 10);
  });

  // Emoji buttons
  document.querySelectorAll('.emoji-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      pendingEmoji = btn.dataset.emoji;
      document.querySelectorAll('.emoji-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // ══════════════════════════════════════════════
  // MediaPipe init
  // ══════════════════════════════════════════════
  const hands = new Hands({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
  });
  hands.setOptions({
    maxNumHands:            1,
    modelComplexity:        1,
    minDetectionConfidence: 0.7,
    minTrackingConfidence:  0.5
  });
  hands.onResults(onHandResults);

  const camera = new Camera(video, {
    onFrame: async () => { await hands.send({ image: video }); },
    width:  1280,
    height: 720
  });
  camera.start().catch(() => {
    document.getElementById('camera-error').classList.remove('hidden');
  });

  // ══════════════════════════════════════════════
  // Init
  // ══════════════════════════════════════════════
  setMode(MODE.DRAW);

})();
