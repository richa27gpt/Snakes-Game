// Classic Snake - canvas implementation
// - Grid: 30x30
// - Canvas internal size: 600x600 (cell = 20px)
// - Arrow keys/WASD control
// - Prevent immediate 180° turn
// - Start/Reset, Pause on Start when running
// - Game over on wall or self collision
// - Responsive by scaling canvas via CSS (internal resolution stays 600x600)

(() => {
  // Canvas & rendering setup
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');

  // Game constants
  const GRID_SIZE = 30;             // number of cells per row/col
  const CANVAS_SIZE = 600;          // internal pixel size
  const CELL = CANVAS_SIZE / GRID_SIZE;
  const TICK_MS = 100;              // game tick (snake speed)

  // UI
  const scoreEl = document.getElementById('score');
  const startBtn = document.getElementById('startBtn');
  const resetBtn = document.getElementById('resetBtn');
  const overlay = document.getElementById('overlay');
  const overlayReset = document.getElementById('overlayReset');
  const overlayMessage = document.getElementById('overlayMessage');

  // State
  let snake = [];       // array of {x,y} with head at index 0
  let dir = {x: 1, y: 0};    // current direction (unit vector)
  let nextDir = {x: 1, y: 0}; // pending direction from input (applied at next tick)
  let food = null;      // {x,y}
  let score = 0;
  let running = false;
  let gameInterval = null;
  let gameOver = false;

  // Setup canvas internal resolution (so CSS can scale it responsively)
  canvas.width = CANVAS_SIZE;
  canvas.height = CANVAS_SIZE;

  // Initialize game state
  function resetGame() {
    running = false;
    clearInterval(gameInterval);
    gameInterval = null;
    gameOver = false;
    dir = {x: 1, y: 0};
    nextDir = {x: 1, y: 0};
    // center snake (length 4)
    const mid = Math.floor(GRID_SIZE / 2);
    snake = [
      {x: mid + 1, y: mid},
      {x: mid, y: mid},
      {x: mid - 1, y: mid},
      {x: mid - 2, y: mid},
    ];
    placeFood();
    score = 0;
    updateScore();
    overlay.classList.add('hidden');
    startBtn.textContent = 'Start';
    render(); // draw initial
  }

  // Place food on a random empty cell
  function placeFood() {
    const occupied = new Set(snake.map(p => `${p.x},${p.y}`));
    const freeCells = [];
    for (let x = 0; x < GRID_SIZE; x++) {
      for (let y = 0; y < GRID_SIZE; y++) {
        if (!occupied.has(`${x},${y}`)) freeCells.push({x, y});
      }
    }
    if (freeCells.length === 0) {
      food = null;
      return;
    }
    food = freeCells[Math.floor(Math.random() * freeCells.length)];
  }

  // Game tick: move snake, resolve collisions, redraw
  function tick() {
    if (gameOver) return;
    // Apply queued direction but prevent immediate 180-degree turn
    if (!isOpposite(nextDir, dir)) {
      dir = {...nextDir};
    }

    const head = {...snake[0]};
    head.x += dir.x;
    head.y += dir.y;

    // Collision: walls
    if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
      endGame('You hit the wall!');
      return;
    }

    // Collision: self
    if (snake.some(seg => seg.x === head.x && seg.y === head.y)) {
      endGame('You ran into yourself!');
      return;
    }

    // Move: add new head
    snake.unshift(head);

    // Eating food?
    if (food && head.x === food.x && head.y === food.y) {
      score += 1;
      updateScore();
      placeFood();
      // don't pop tail => grows
    } else {
      // normal move: remove tail
      snake.pop();
    }

    render();
  }

  function updateScore() {
    scoreEl.textContent = `Score: ${score}`;
  }

  function endGame(message = 'Game Over') {
    gameOver = true;
    running = false;
    clearInterval(gameInterval);
    gameInterval = null;
    overlayMessage.textContent = message + ` Final score: ${score}`;
    overlay.classList.remove('hidden');
    startBtn.textContent = 'Start';
  }

  // Drawing functions
  function render() {
    // Clear
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // subtle background grid
    drawGrid();

    // Draw food
    if (food) {
      drawFood(food.x, food.y);
    }

    // Draw snake
    for (let i = snake.length - 1; i >= 0; i--) {
      const p = snake[i];
      if (i === 0) drawSegment(p.x, p.y, true); // head
      else drawSegment(p.x, p.y, false);
    }
  }

  function drawGrid() {
    ctx.fillStyle = '#f7fbfb';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // very faint lines for a classic look
    ctx.strokeStyle = 'rgba(11,33,33,0.02)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= GRID_SIZE; i++) {
      const pos = i * CELL;
      // vertical
      ctx.beginPath();
      ctx.moveTo(pos, 0);
      ctx.lineTo(pos, CANVAS_SIZE);
      ctx.stroke();
      // horizontal
      ctx.beginPath();
      ctx.moveTo(0, pos);
      ctx.lineTo(CANVAS_SIZE, pos);
      ctx.stroke();
    }
  }

  function drawSegment(x, y, isHead) {
    const px = x * CELL;
    const py = y * CELL;
    const radius = Math.max(2, CELL * 0.12);

    // fill
    ctx.fillStyle = isHead ? '#154f4d' : '#2b7a78';
    roundRect(ctx, px + 1, py + 1, CELL - 2, CELL - 2, radius);
    ctx.fill();

    // subtle highlight
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  function drawFood(x, y) {
    const cx = x * CELL + CELL / 2;
    const cy = y * CELL + CELL / 2;
    const r = CELL * 0.35;
    // outer glow
    const g = ctx.createRadialGradient(cx, cy, r * 0.1, cx, cy, r * 1.3);
    g.addColorStop(0, '#f8b4b2');
    g.addColorStop(1, 'rgba(217,83,79,0.0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.3, 0, Math.PI * 2);
    ctx.fill();

    // main circle
    ctx.fillStyle = '#d9534f';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    // shine
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath();
    ctx.arc(cx - r * 0.3, cy - r * 0.35, r * 0.22, 0, Math.PI * 2);
    ctx.fill();
  }

  // Helper: rounded rectangle
  function roundRect(ctx, x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  }

  // Utilities
  function isOpposite(a, b) {
    return a.x === -b.x && a.y === -b.y;
  }

  // Input handling
  function onKeyDown(e) {
    const key = e.key;
    let newDir = null;
    if (key === 'ArrowUp' || key === 'w' || key === 'W') newDir = {x: 0, y: -1};
    else if (key === 'ArrowDown' || key === 's' || key === 'S') newDir = {x: 0, y: 1};
    else if (key === 'ArrowLeft' || key === 'a' || key === 'A') newDir = {x: -1, y: 0};
    else if (key === 'ArrowRight' || key === 'd' || key === 'D') newDir = {x: 1, y: 0};
    if (newDir) {
      // Prevent immediate 180-degree turn: ignore if opposite of current direction.
      // Note: we queue nextDir so multiple rapid key presses in between ticks only set the queued direction.
      if (!isOpposite(newDir, dir)) {
        nextDir = newDir;
      }
      e.preventDefault();
    }
  }

  // Start/pause toggle
  function startPause() {
    if (gameOver) {
      // if finished, reset then start
      resetGame();
    }
    if (!running) {
      running = true;
      startBtn.textContent = 'Pause';
      // start interval
      if (!gameInterval) gameInterval = setInterval(tick, TICK_MS);
    } else {
      // pause
      running = false;
      startBtn.textContent = 'Start';
      clearInterval(gameInterval);
      gameInterval = null;
    }
  }

  // Reset handler
  function handleReset() {
    resetGame();
  }

  // overlay reset handler
  function handleOverlayReset() {
    resetGame();
    startPause();
  }

  // Initialize
  function init() {
    resetGame();
    // Event listeners
    window.addEventListener('keydown', onKeyDown);
    startBtn.addEventListener('click', startPause);
    resetBtn.addEventListener('click', handleReset);
    overlayReset.addEventListener('click', handleOverlayReset);

    // For accessibility: focus canvas to receive keyboard input
    canvas.setAttribute('tabindex', '0');
    canvas.addEventListener('keydown', onKeyDown);

    // Start with a nice render
    render();
  }

  // start
  init();
})();