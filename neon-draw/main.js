"use strict";

(function () {

  // ══════════════════════════════════════════════
  // Constants
  // ══════════════════════════════════════════════
  const PINCH_THRESHOLD  = 0.07;   // normalized: fingers close = pinch (grab / draw)
  const RELEASE_DIST     = 0.30;   // normalized: hand open = release object
  // Between PINCH_THRESHOLD and RELEASE_DIST → scale mode
  const ERASE_RADIUS     = 28;     // px
  const GRAB_RADIUS      = 160;    // px, max distance to grab an object
  const EMOJI_SIZE       = 64;     // base emoji font size px
  const SCALE_MIN        = 0.15;
  const SCALE_MAX        = 6.0;

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
  const video         = document.getElementById('webcam');
  const drawCanvas    = document.getElementById('draw-canvas');
  const overlayCanvas = document.getElementById('overlay-canvas');
  const dCtx          = drawCanvas.getContext('2d');
  const oCtx          = overlayCanvas.getContext('2d');
  const statusBadge   = document.getElementById('status-badge');
  const statusText    = document.getElementById('status-text');
  const instrText     = document.getElementById('instruction-text');
  const drawPanel     = document.getElementById('draw-panel');
  const emojiPanel    = document.getElementById('emoji-panel');
  const movePanel     = document.getElementById('move-panel');

  // ══════════════════════════════════════════════
  // Modes
  // ══════════════════════════════════════════════
  const MODE = { DRAW: 'draw', ERASE: 'erase', MOVE: 'move', EMOJI: 'emoji' };
  let currentMode = MODE.DRAW;

  const MODE_CONFIG = {
    [MODE.DRAW]:  { label: 'DRAW',  instruction: '☝️ 검지 펴서 그리기  |  🤏 핀치로 펜 UP/DOWN' },
    [MODE.ERASE]: { label: 'ERASE', instruction: '☝️ 검지로 획 지우기  |  손가락 내리면 정지' },
    [MODE.MOVE]:  { label: 'MOVE',  instruction: '🤏 핀치 → 잡기/이동  |  손가락 벌리기 → 크기 조절  |  손 활짝 → 놓기' },
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
  //
  // Stroke: {
  //   type:'stroke', paths:[[{x,y},...]], color, size,
  //   cx, cy,          ← centroid of original points (computed at finalize)
  //   offsetX, offsetY ← accumulated position delta
  //   scale            ← size multiplier (1 = original)
  // }
  // Emoji: {
  //   type:'emoji', char, x, y, size,
  //   offsetX, offsetY, scale
  // }
  // ══════════════════════════════════════════════
  const scene = [];
  let currentStroke = null;
  let lastPt        = null;

  // ══════════════════════════════════════════════
  // Move / Scale state
  // ══════════════════════════════════════════════
  let selectedObj    = null;
  let isHolding      = false;
  let holdPhase      = 'idle';   // 'moving' | 'scaling'
  let lastMoveX      = 0;
  let lastMoveY      = 0;
  let spreadRefDist  = 0;        // pinch dist when scaling phase started
  let spreadRefScale = 1;        // obj.scale when scaling phase started

  // ══════════════════════════════════════════════
  // Emoji placement state
  // ══════════════════════════════════════════════
  let pendingEmoji = null;

  // ══════════════════════════════════════════════
  // Cursor / hand state
  // ══════════════════════════════════════════════
  let cursorX         = -1;
  let cursorY         = -1;
  let handVisible     = false;
  let latestLandmarks = null;

  let sceneDirty = true;
  function markDirty() { sceneDirty = true; }

  // ══════════════════════════════════════════════
  // Canvas resize
  // ══════════════════════════════════════════════
  function resizeCanvases() {
    drawCanvas.width     = window.innerWidth;
    drawCanvas.height    = window.innerHeight;
    overlayCanvas.width  = window.innerWidth;
    overlayCanvas.height = window.innerHeight;
    markDirty();
  }
  window.addEventListener('resize', resizeCanvases);
  resizeCanvases();

  // ══════════════════════════════════════════════
  // Coordinate helpers
  // ══════════════════════════════════════════════
  function toCanvas(lm) {
    return {
      x: (1 - lm.x) * drawCanvas.width,
      y: lm.y        * drawCanvas.height
    };
  }

  // ══════════════════════════════════════════════
  // Scene object factories
  // ══════════════════════════════════════════════
  function createStroke(color, size) {
    return {
      type: 'stroke', paths: [[]],
      color, size,
      cx: 0, cy: 0,         // computed at finalize
      offsetX: 0, offsetY: 0,
      scale: 1
    };
  }

  function createEmoji(char, x, y) {
    return {
      type: 'emoji', char, x, y, size: EMOJI_SIZE,
      offsetX: 0, offsetY: 0,
      scale: 1
    };
  }

  // Compute centroid and store in stroke when pen lifts
  function finalizeStroke(stroke) {
    let sx = 0, sy = 0, n = 0;
    for (const path of stroke.paths)
      for (const p of path) { sx += p.x; sy += p.y; n++; }
    stroke.cx = n ? sx / n : 0;
    stroke.cy = n ? sy / n : 0;
  }

  // ══════════════════════════════════════════════
  // Object geometry helpers
  // ══════════════════════════════════════════════
  function getCenter(obj) {
    if (obj.type === 'emoji')  return { x: obj.x  + obj.offsetX, y: obj.y  + obj.offsetY };
    if (obj.type === 'stroke') return { x: obj.cx + obj.offsetX, y: obj.cy + obj.offsetY };
    return { x: 0, y: 0 };
  }

  function findNearest(x, y) {
    let nearest = null, minDist = GRAB_RADIUS;
    for (const obj of scene) {
      const c = getCenter(obj);
      const d = Math.hypot(c.x - x, c.y - y);
      if (d < minDist) { minDist = d; nearest = obj; }
    }
    return nearest;
  }

  // ══════════════════════════════════════════════
  // Eraser — accounts for each stroke's scale transform
  // ══════════════════════════════════════════════
  function eraseAt(wx, wy) {
    let changed = false;
    for (let i = scene.length - 1; i >= 0; i--) {
      const obj = scene[i];
      if (obj.type !== 'stroke') continue;

      const s  = obj.scale || 1;
      const cx = obj.cx + obj.offsetX;
      const cy = obj.cy + obj.offsetY;

      // Transform world-space eraser pos → object (unscaled) space
      const lx = (wx - cx) / s + obj.cx;
      const ly = (wy - cy) / s + obj.cy;
      const lr = ERASE_RADIUS / s;

      const newPaths = [];
      for (const path of obj.paths) {
        newPaths.push(...splitPathByRadius(path, lx, ly, lr));
      }
      const filtered = newPaths.filter(p => p.length > 1);
      if (filtered.length !== obj.paths.filter(p => p.length > 1).length) changed = true;
      obj.paths = filtered;
      if (obj.paths.length === 0) { scene.splice(i, 1); changed = true; }
    }
    if (changed) markDirty();
  }

  function splitPathByRadius(path, cx, cy, r) {
    const result = [];
    let cur = [];
    for (const pt of path) {
      if (Math.hypot(pt.x - cx, pt.y - cy) < r) {
        if (cur.length > 1) result.push(cur);
        cur = [];
      } else {
        cur.push(pt);
      }
    }
    if (cur.length > 1) result.push(cur);
    return result;
  }

  // ══════════════════════════════════════════════
  // Rendering — draw canvas (scene graph)
  // ══════════════════════════════════════════════
  function renderScene() {
    dCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
    for (const obj of scene) {
      if      (obj.type === 'stroke') renderStroke(obj);
      else if (obj.type === 'emoji')  renderEmoji(obj);
    }

    // Highlight selected object
    if (selectedObj && currentMode === MODE.MOVE) {
      const c     = getCenter(selectedObj);
      const scale = selectedObj.scale || 1;
      dCtx.save();
      dCtx.globalAlpha = 0.55;
      dCtx.strokeStyle = '#fff';
      dCtx.lineWidth   = 1.5;
      dCtx.shadowBlur  = 0;
      dCtx.setLineDash([5, 4]);
      dCtx.beginPath();
      // Circle radius grows with scale
      dCtx.arc(c.x, c.y, Math.max(22, 32 * Math.sqrt(scale)), 0, Math.PI * 2);
      dCtx.stroke();
      dCtx.restore();
    }
  }

  // 3-pass neon stroke with scale + offset transform
  function renderStroke(stroke) {
    dCtx.save();
    const s  = stroke.scale || 1;
    const cx = stroke.cx + stroke.offsetX;
    const cy = stroke.cy + stroke.offsetY;
    // Scale around the stroke's centroid
    dCtx.translate(cx, cy);
    dCtx.scale(s, s);
    dCtx.translate(-stroke.cx, -stroke.cy);

    dCtx.lineCap  = 'round';
    dCtx.lineJoin = 'round';

    for (const path of stroke.paths) {
      if (path.length < 2) continue;
      neonPass(stroke.color, stroke.size * 2.5, GLOW_OUTER, stroke.color, 0.35, path);
      neonPass(stroke.color, stroke.size,       GLOW_MID,   stroke.color, 0.65, path);
      neonPass('#fff',       Math.max(1, stroke.size * 0.4), GLOW_CORE, '#fff', 0.9, path);
    }
    dCtx.restore();
  }

  function neonPass(strokeColor, lineWidth, blur, shadowColor, alpha, pts) {
    dCtx.globalAlpha = alpha;
    dCtx.shadowBlur  = blur;
    dCtx.shadowColor = shadowColor;
    dCtx.strokeStyle = strokeColor;
    dCtx.lineWidth   = lineWidth;
    drawSmoothPath(pts);
  }

  function drawSmoothPath(pts) {
    dCtx.beginPath();
    dCtx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length - 1; i++) {
      const mx = (pts[i].x + pts[i + 1].x) / 2;
      const my = (pts[i].y + pts[i + 1].y) / 2;
      dCtx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
    }
    dCtx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
    dCtx.stroke();
  }

  // Emoji: scale applied to font size, rendered at offset position
  function renderEmoji(emoji) {
    const s = emoji.scale || 1;
    dCtx.save();
    dCtx.globalAlpha  = 1;
    dCtx.shadowBlur   = 0;
    dCtx.font         = `${Math.round(emoji.size * s)}px serif`;
    dCtx.textAlign    = 'center';
    dCtx.textBaseline = 'middle';
    dCtx.fillText(emoji.char, emoji.x + emoji.offsetX, emoji.y + emoji.offsetY);
    dCtx.restore();
  }

  // ══════════════════════════════════════════════
  // Rendering — overlay canvas (skeleton + cursor)
  // ══════════════════════════════════════════════
  function renderOverlay() {
    oCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    if (!handVisible) return;

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
      // Pending emoji preview
      oCtx.globalAlpha  = 0.75;
      oCtx.font         = `${EMOJI_SIZE}px serif`;
      oCtx.textAlign    = 'center';
      oCtx.textBaseline = 'middle';
      oCtx.shadowBlur   = 0;
      oCtx.fillText(pendingEmoji, cursorX, cursorY);

    } else if (currentMode === MODE.MOVE && isHolding && holdPhase === 'scaling') {
      // Scale indicator — show percentage above cursor
      const pct = Math.round((selectedObj ? (selectedObj.scale || 1) : 1) * 100);
      oCtx.globalAlpha = 0.85;
      oCtx.shadowBlur  = 0;
      oCtx.fillStyle   = '#fff01f';
      oCtx.font        = 'bold 15px monospace';
      oCtx.textAlign   = 'center';
      oCtx.textBaseline = 'middle';
      oCtx.fillText(`${pct}%`, cursorX, cursorY - 36);

      // Scale cursor rings (show spread)
      oCtx.globalAlpha = 0.4;
      oCtx.strokeStyle = '#fff01f';
      oCtx.lineWidth   = 1.5;
      oCtx.beginPath();
      oCtx.arc(cursorX, cursorY, 12, 0, Math.PI * 2);
      oCtx.stroke();
      oCtx.beginPath();
      oCtx.arc(cursorX, cursorY, 24, 0, Math.PI * 2);
      oCtx.stroke();

    } else {
      // Default cursor dot
      const dotColor = currentMode === MODE.DRAW ? activeColor : '#fff';
      oCtx.globalAlpha = 0.85;
      oCtx.shadowColor = dotColor;
      oCtx.shadowBlur  = 18;
      oCtx.fillStyle   = dotColor;
      oCtx.beginPath();
      oCtx.arc(cursorX, cursorY, 5, 0, Math.PI * 2);
      oCtx.fill();

      // Hover hint in move mode
      if (currentMode === MODE.MOVE && !isHolding) {
        const hover = findNearest(cursorX, cursorY);
        if (hover) {
          const c = getCenter(hover);
          oCtx.globalAlpha = 0.3;
          oCtx.strokeStyle = '#fff01f';
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
    oCtx.globalAlpha = 0.28;
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
  // RAF loop
  // ══════════════════════════════════════════════
  function loop() {
    if (sceneDirty) { renderScene(); sceneDirty = false; }
    renderOverlay();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  // ══════════════════════════════════════════════
  // Gesture handlers
  // ══════════════════════════════════════════════
  function handleDraw(isPinching, indexExtended, pt) {
    const shouldDraw = indexExtended && !isPinching;
    if (shouldDraw) {
      if (!penDown) {
        penDown       = true;
        currentStroke = createStroke(activeColor, brushSize);
        scene.push(currentStroke);
        lastPt = null;
      }
      const path = currentStroke.paths[currentStroke.paths.length - 1];
      if (lastPt) {
        if (Math.hypot(pt.x - lastPt.x, pt.y - lastPt.y) >= 2) {
          path.push(pt); lastPt = pt; markDirty();
        }
      } else {
        path.push(pt); lastPt = pt;
      }
    } else {
      if (penDown) {
        penDown = false;
        if (currentStroke) {
          const total = currentStroke.paths.reduce((s, p) => s + p.length, 0);
          if (total < 2) scene.splice(scene.indexOf(currentStroke), 1);
          else           finalizeStroke(currentStroke);
          currentStroke = null; lastPt = null; markDirty();
        }
      }
    }
  }

  function handleErase(isPinching, indexExtended, pt) {
    if (indexExtended && !isPinching) eraseAt(pt.x, pt.y);
  }

  // ─────────────────────────────────────────────
  // MOVE + SCALE
  //
  // Gesture zones (normalized pinch distance):
  //   < PINCH_THRESHOLD  → pinching  → grab & move
  //   PINCH ~ RELEASE    → spreading → scale (ratio controls size)
  //   >= RELEASE_DIST    → open hand → release
  // ─────────────────────────────────────────────
  function handleMove(isPinching, pinchDist, pt) {
    // ── Start grab (pinch leading edge, nothing held) ──
    if (isPinching && !wasPinching && !isHolding) {
      const obj = findNearest(pt.x, pt.y);
      if (obj) {
        selectedObj   = obj;
        isHolding     = true;
        holdPhase     = 'moving';
        lastMoveX     = pt.x;
        lastMoveY     = pt.y;
        markDirty();
      }
      return;
    }

    if (!isHolding || !selectedObj) return;

    // ── Release: hand fully open ──
    if (pinchDist >= RELEASE_DIST) {
      // Delete if dragged onto toolbar zone (left edge)
      if (getCenter(selectedObj).x < 80) {
        const idx = scene.indexOf(selectedObj);
        if (idx > -1) scene.splice(idx, 1);
      }
      selectedObj = null;
      isHolding   = false;
      holdPhase   = 'idle';
      markDirty();
      return;
    }

    // ── Move: fingers closed (pinching) ──
    if (pinchDist < PINCH_THRESHOLD) {
      if (holdPhase !== 'moving') {
        // Transition: scaling → moving (reset move anchor to avoid jump)
        holdPhase = 'moving';
        lastMoveX = pt.x;
        lastMoveY = pt.y;
      }
      const dx = pt.x - lastMoveX;
      const dy = pt.y - lastMoveY;
      if (dx !== 0 || dy !== 0) {
        selectedObj.offsetX += dx;
        selectedObj.offsetY += dy;
        lastMoveX = pt.x;
        lastMoveY = pt.y;
        markDirty();
      }
    }

    // ── Scale: fingers spread (between pinch and release thresholds) ──
    else {
      if (holdPhase !== 'scaling') {
        // Transition: moving → scaling (capture reference)
        holdPhase      = 'scaling';
        spreadRefDist  = pinchDist;
        spreadRefScale = selectedObj.scale || 1;
      }
      const newScale = Math.max(SCALE_MIN, Math.min(SCALE_MAX,
        spreadRefScale * (pinchDist / spreadRefDist)));
      if (Math.abs(newScale - selectedObj.scale) > 0.005) {
        selectedObj.scale = newScale;
        markDirty();
      }
    }
  }

  function handleEmoji(isPinching, pt) {
    if (!pendingEmoji) return;
    if (isPinching && !wasPinching) {
      scene.push(createEmoji(pendingEmoji, pt.x, pt.y));
      pendingEmoji = null;
      document.querySelectorAll('.emoji-btn').forEach(b => b.classList.remove('active'));
      markDirty();
    }
  }

  // ── Hand lost handler ──
  function onHandLost() {
    cursorX = cursorY = -1;
    // Lift pen
    if (penDown) {
      penDown = false;
      if (currentStroke) {
        const total = currentStroke.paths.reduce((s, p) => s + p.length, 0);
        if (total < 2) scene.splice(scene.indexOf(currentStroke), 1);
        else           finalizeStroke(currentStroke);
        currentStroke = null; lastPt = null; markDirty();
      }
    }
    // Drop held object in place
    if (isHolding && selectedObj) {
      selectedObj = null; isHolding = false; holdPhase = 'idle'; markDirty();
    }
    wasPinching = false;
  }

  // ══════════════════════════════════════════════
  // MediaPipe result handler
  // ══════════════════════════════════════════════
  function onHandResults(results) {
    handVisible     = !!(results.multiHandLandmarks && results.multiHandLandmarks.length > 0);
    latestLandmarks = handVisible ? results.multiHandLandmarks[0] : null;

    if (!handVisible) { onHandLost(); return; }

    const lm       = latestLandmarks;
    const thumbTip = lm[THUMB_TIP];
    const indexPIP = lm[INDEX_PIP];
    const indexTip = lm[INDEX_TIP];

    const pinchDist     = Math.hypot(thumbTip.x - indexTip.x, thumbTip.y - indexTip.y);
    const isPinching    = pinchDist < PINCH_THRESHOLD;
    const indexExtended = indexTip.y < indexPIP.y;

    const pt = toCanvas(indexTip);
    cursorX  = pt.x;
    cursorY  = pt.y;

    if      (currentMode === MODE.DRAW)  handleDraw(isPinching, indexExtended, pt);
    else if (currentMode === MODE.ERASE) handleErase(isPinching, indexExtended, pt);
    else if (currentMode === MODE.MOVE)  handleMove(isPinching, pinchDist, pt);
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
      else           finalizeStroke(currentStroke);
      currentStroke = null; lastPt = null; markDirty();
    }
    if (isHolding) {
      selectedObj = null; isHolding = false; holdPhase = 'idle'; markDirty();
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

    // Body class + badge + instruction
    document.body.className = `mode-${mode}`;
    const cfg = MODE_CONFIG[mode];
    statusBadge.className  = `status-${mode}`;
    statusText.textContent = cfg.label;
    instrText.textContent  = cfg.instruction;
  }

  // ══════════════════════════════════════════════
  // UI event listeners
  // ══════════════════════════════════════════════
  document.querySelectorAll('.tool-btn[data-mode]').forEach(btn => {
    btn.addEventListener('click', () => setMode(btn.dataset.mode));
  });

  document.getElementById('clear-all-btn').addEventListener('click', () => {
    scene.length  = 0;
    currentStroke = null; lastPt = null;
    penDown       = false;
    selectedObj   = null; isHolding = false; holdPhase = 'idle';
    pendingEmoji  = null;
    document.querySelectorAll('.emoji-btn').forEach(b => b.classList.remove('active'));
    markDirty();
  });

  document.querySelectorAll('.color-swatch').forEach(btn => {
    btn.addEventListener('click', () => {
      activeColor = btn.dataset.color;
      document.querySelectorAll('.color-swatch').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  document.getElementById('brush-size').addEventListener('input', function () {
    brushSize = parseInt(this.value, 10);
  });

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
