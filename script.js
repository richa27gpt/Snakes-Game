// Classic Snake - HTML5 Canvas
// Updated: Ensure restart after Game Over only works via overlay button click or Enter key.
// Author: ChatGPT (for richa27gpt)

(() => {
  // Elements
  const canvas = document.getElementById('game');
  const startBtn = document.getElementById('startBtn');
  const pauseBtn = document.getElementById('pauseBtn');
  const restartBtn = document.getElementById('restartBtn'); // side-panel restart
  const restartBtnOverlay = document.getElementById('restartBtnOverlay'); // overlay restart (only active after Game Over)
  const scoreEl = document.getElementById('score');
  const overlay = document.getElementById('overlay');
  const overlayTitle = document.getElementById('overlay-title');
  const overlayScore = document.getElementById('overlay-score');

  const ctx = canvas.getContext('2d');

  // Config
  const CELL = 20;            // logical cell size (px)
  const BASE_SPEED = 120;     // ms per movement tick (lower = faster)
  const INITIAL_LENGTH = 4;
  const SNAKE_COLORS = {
    body: '#43b047',         // green
    head: '#2fa33a',
    eye: '#ffffff',
    eyePupil: '#0b0b0b',
  };
  const BG_COLOR = '#02040a';
  const GRID_SHOW = false;    // subtle grid (false for clean)
  const APPLE_COLOR = '#ff2b2b';
  const APPLE_LEAF = '#2fa33a';

  // Game state
  let cols = 0, rows = 0;
  let widthPx = 0, heightPx = 0;
  let dpr = Math.max(1, window.devicePixelRatio || 1);

  let snake = [];
  let direction = { x: 1, y: 0 }; // moving right initially
  let nextDirection = { x: 1, y: 0 }; // used to prevent immediate 180
  let food = null;
  let running = false;
  let paused = false;
  let lastTick = 0;
  let tickInterval = BASE_SPEED;
  let animationId = null;
  let score = 0;

  // Responsive canvas sizing (keeps square)
  function fitCanvas() {
    const maxSize = 640;
    const padding = 28;
    const available = Math.min(window.innerWidth - padding * 2, maxSize);
    const cssSize = Math.max(200, Math.floor(available));
    const alignedCssSize = Math.floor(cssSize / CELL) * CELL;

    canvas.style.width = alignedCssSize + 'px';
    canvas.style.height = alignedCssSize + 'px';

    dpr = Math.max(1, window.devicePixelRatio || 1);
    widthPx = alignedCssSize * dpr;
    heightPx = alignedCssSize * dpr;
    canvas.width = widthPx;
    canvas.height = heightPx;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    cols = alignedCssSize / CELL;
    rows = alignedCssSize / CELL;
  }

  // Initialize snake in center
  function resetGame() {
    fitCanvas();
    snake = [];
    const centerX = Math.floor(cols / 2);
    const centerY = Math.floor(rows / 2);
    for (let i = INITIAL_LENGTH - 1; i >= 0; i--) {
      snake.push({ x: centerX - i, y: centerY });
    }
    direction = { x: 1, y: 0 };
    nextDirection = { x: 1, y: 0 };
    spawnFood();
    score = 0;
    updateScore();
    paused = false;
    lastTick = performance.now();
    tickInterval = BASE_SPEED;
  }

  // Random food spawn not on snake
  function spawnFood() {
    const occupied = new Set(snake.map(s => `${s.x},${s.y}`));
    let tries = 0;
    while (tries < 10000) {
      const x = Math.floor(Math.random() * cols);
      const y = Math.floor(Math.random() * rows);
      if (!occupied.has(`${x},${y}`)) {
        food = { x, y };
        return;
      }
      tries++;
    }
    food = null;
  }

  // Drawing helpers
  function clearBoard() {
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, canvas.width / dpr, canvas.height / dpr);
  }

  function drawSegment(x, y, radius = 6, fill = SNAKE_COLORS.body) {
    const px = x * CELL;
    const py = y * CELL;
    const w = CELL;
    const h = CELL;
    const r = Math.min(radius, w / 2, h / 2);

    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.moveTo(px + r, py);
    ctx.arcTo(px + w, py, px + w, py + h, r);
    ctx.arcTo(px + w, py + h, px, py + h, r);
    ctx.arcTo(px, py + h, px, py, r);
    ctx.arcTo(px, py, px + w, py, r);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(0,0,0,0.06)';
    ctx.fillRect(px + w * 0.05, py + h * 0.55, w * 0.9, h * 0.15);
  }

  function drawHead(x, y, dir) {
    drawSegment(x, y, 7, SNAKE_COLORS.head);

    const cx = x * CELL;
    const cy = y * CELL;

    const eyeSize = Math.max(2, CELL * 0.12);

    let ex1, ey1, ex2, ey2;
    if (dir.x === 1) {
      ex1 = cx + CELL * 0.65; ey1 = cy + CELL * 0.28;
      ex2 = cx + CELL * 0.65; ey2 = cy + CELL * 0.72;
    } else if (dir.x === -1) {
      ex1 = cx + CELL * 0.35; ey1 = cy + CELL * 0.28;
      ex2 = cx + CELL * 0.35; ey2 = cy + CELL * 0.72;
    } else if (dir.y === 1) {
      ex1 = cx + CELL * 0.3; ey1 = cy + CELL * 0.65;
      ex2 = cx + CELL * 0.7; ey2 = cy + CELL * 0.65;
    } else {
      ex1 = cx + CELL * 0.3; ey1 = cy + CELL * 0.35;
      ex2 = cx + CELL * 0.7; ey2 = cy + CELL * 0.35;
    }

    ctx.fillStyle = SNAKE_COLORS.eye;
    ctx.beginPath();
    ctx.arc(ex1, ey1, eyeSize, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(ex2, ey2, eyeSize, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = SNAKE_COLORS.eyePupil;
    ctx.beginPath();
    ctx.arc(ex1 + eyeSize * 0.15, ey1, eyeSize * 0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(ex2 + eyeSize * 0.15, ey2, eyeSize * 0.55, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawApple(x, y) {
    const cx = x * CELL + CELL / 2;
    const cy = y * CELL + CELL / 2;
    const r = CELL * 0.36;

    const grad = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.4, r * 0.1, cx, cy, r);
    grad.addColorStop(0, '#ff6b6b');
    grad.addColorStop(0.6, APPLE_COLOR);
    grad.addColorStop(1, '#c41d1d');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.beginPath();
    ctx.ellipse(cx - r * 0.25, cy - r * 0.35, r * 0.22, r * 0.14, -0.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = APPLE_LEAF;
    ctx.beginPath();
    ctx.ellipse(cx + r * 0.3, cy - r * 0.6, r * 0.26, r * 0.14, -0.9, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#5a2d18';
    ctx.lineWidth = Math.max(1, CELL * 0.06);
    ctx.beginPath();
    ctx.moveTo(cx + r * 0.1, cy - r * 0.4);
    ctx.lineTo(cx + r * 0.18, cy - r * 0.9);
    ctx.stroke();
  }

  // Draw everything
  function render() {
    clearBoard();

    if (food) drawApple(food.x, food.y);

    for (let i = 0; i < snake.length - 1; i++) {
      const seg = snake[i];
      drawSegment(seg.x, seg.y, 6, SNAKE_COLORS.body);
    }
    const head = snake[snake.length - 1];
    drawHead(head.x, head.y, direction);
  }

  // Game logic tick
  function update() {
    if (!(nextDirection.x === -direction.x && nextDirection.y === -direction.y)) {
      direction = { ...nextDirection };
    }
    const head = snake[snake.length - 1];
    const newHead = { x: head.x + direction.x, y: head.y + direction.y };

    if (newHead.x < 0 || newHead.x >= cols || newHead.y < 0 || newHead.y >= rows) {
      gameOver();
      return;
    }

    for (let i = 0; i < snake.length; i++) {
      const s = snake[i];
      if (s.x === newHead.x && s.y === newHead.y) {
        gameOver();
        return;
      }
    }

    snake.push(newHead);

    if (food && newHead.x === food.x && newHead.y === food.y) {
      score += 1;
      updateScore();
      spawnFood();

      if (score % 5 === 0 && tickInterval > 45) {
        tickInterval = Math.max(45, tickInterval - 8);
      }
    } else {
      snake.shift();
    }
  }

  function updateScore() {
    scoreEl.textContent = score;
  }

  // Overlay visibility helper
  function isOverlayVisible() {
    return !overlay.classList.contains('hidden');
  }

  function gameOver() {
    running = false;
    paused = false;

    // Disable all other controls while overlay is visible.
    startBtn.disabled = true;
    pauseBtn.disabled = true;
    restartBtn.disabled = true; // side-panel restart disabled while game-over overlay active

    showOverlay('Game Over', `Score: ${score}`);

    // Ensure overlay restart button is enabled and focused so the user can click it or press Enter
    restartBtnOverlay.disabled = false;
    // Focus the overlay card so Enter key is accessible and screen readers notice dialog
    const card = overlay.querySelector('.overlay-card');
    if (card) card.focus();

    cancelAnimationFrame(animationId);
  }

  function showOverlay(title, scoreText) {
    overlayTitle.textContent = title;
    overlayScore.textContent = scoreText;
    overlay.classList.remove('hidden');
  }

  function hideOverlay() {
    overlay.classList.add('hidden');
    // re-enable side-panel buttons when overlay hidden (they'll be set accordingly by restart/start)
    restartBtnOverlay.disabled = true;
  }

  // Main loop using requestAnimationFrame; only update on tick interval
  function loop(timestamp) {
    if (!running || paused) {
      animationId = requestAnimationFrame(loop);
      lastTick = timestamp;
      return;
    }
    if (!lastTick) lastTick = timestamp;
    const elapsed = timestamp - lastTick;
    if (elapsed >= tickInterval) {
      lastTick = timestamp;
      update();
      render();
    }
    animationId = requestAnimationFrame(loop);
  }

  // Controls
  startBtn.addEventListener('click', () => {
    if (!running) {
      hideOverlay();
      if (!snake.length) resetGame();
      running = true;
      paused = false;
      startBtn.disabled = true;
      pauseBtn.disabled = false;
      restartBtn.disabled = false;
      pauseBtn.textContent = 'Pause';
      lastTick = performance.now();
      cancelAnimationFrame(animationId);
      animationId = requestAnimationFrame(loop);
    }
  });

  pauseBtn.addEventListener('click', () => {
    if (!running) return;
    paused = !paused;
    pauseBtn.textContent = paused ? 'Resume' : 'Pause';
  });

  function restart() {
    // Called by either overlay button (allowed when overlay visible) or by the side-panel restart when overlay is not visible.
    running = false;
    paused = false;

    // After restart, side-panel controls should be usable as normal.
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    restartBtn.disabled = false;
    pauseBtn.textContent = 'Pause';

    hideOverlay();
    resetGame();
    render();
    cancelAnimationFrame(animationId);
  }

  restartBtn.addEventListener('click', (e) => {
    // Side-panel restart should only work when overlay is not visible.
    if (isOverlayVisible()) {
      // ignore clicks on side-panel restart while overlay is visible
      e.preventDefault();
      return;
    }
    restart();
  });

  restartBtnOverlay.addEventListener('click', () => {
    // Overlay restart is the only allowed restart action after Game Over.
    if (isOverlayVisible()) {
      restart();
    }
  });

  // Keyboard input - arrow keys and Enter handling.
  window.addEventListener('keydown', (e) => {
    const key = e.key;

    // If overlay visible (Game Over), only allow Enter to trigger restart.
    if (isOverlayVisible()) {
      if (key === 'Enter') {
        e.preventDefault();
        restartBtnOverlay.click();
      }
      // ignore all other keys while overlay is up
      return;
    }

    // If not game-over overlay:
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) {
      e.preventDefault();
      let nd = { ...nextDirection };
      if (key === 'ArrowUp') nd = { x: 0, y: -1 };
      if (key === 'ArrowDown') nd = { x: 0, y: 1 };
      if (key === 'ArrowLeft') nd = { x: -1, y: 0 };
      if (key === 'ArrowRight') nd = { x: 1, y: 0 };

      if (nd.x === -direction.x && nd.y === -direction.y) {
        return;
      }
      nextDirection = nd;

      if (!running) {
        startBtn.click();
      }
    }

    // space to pause/resume (only when overlay not visible)
    if ((key === ' ' || key === 'Spacebar') && !isOverlayVisible()) {
      if (running) pauseBtn.click();
    }
  });

  // Pause when window/tab loses focus
  window.addEventListener('blur', () => {
    if (running && !paused) {
      paused = true;
      pauseBtn.textContent = 'Resume';
    }
  });

  // Resize handling
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const wasRunning = running;
      if (wasRunning && !paused) {
        paused = true;
        pauseBtn.textContent = 'Resume';
      }
      fitCanvas();
      render();
    }, 120);
  });

  // Initialize & render initial frame
  resetGame();
  render();
  // overlay restart disabled by default until Game Over
  restartBtnOverlay.disabled = true;

  // Expose for debugging (optional)
  window.__snakeGame = {
    start: () => startBtn.click(),
    pause: () => pauseBtn.click(),
    restart: () => restartBtn.click(),
  };
})();
