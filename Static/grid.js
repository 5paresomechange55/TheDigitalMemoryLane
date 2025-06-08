const canvas = document.getElementById('pixelCanvas');
const ctx = canvas.getContext('2d');
const pixelSize = 10;
const rows = canvas.height / pixelSize;
const cols = canvas.width / pixelSize;
const selectedPixels = new Set();
let claimedPixels = new Set();
let undoStack = [];

let scale = 1;
let offsetX = 0;
let offsetY = 0;
let isDragging = false;
let dragStart = { x: 0, y: 0 };

function drawGrid() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(offsetX, offsetY);
  ctx.scale(scale, scale);

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const key = `${x},${y}`;
      if (claimedPixels.has(key)) {
        ctx.fillStyle = '#8b5e3c';
      } else if (selectedPixels.has(key)) {
        ctx.fillStyle = '#facc15';
      } else {
        ctx.fillStyle = '#fff';
      }
      ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
      ctx.strokeStyle = '#deb887';
      ctx.strokeRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
    }
  }

  ctx.restore();
  updateTracker();
}

function getMousePos(evt) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (evt.clientX - rect.left - offsetX) / scale,
    y: (evt.clientY - rect.top - offsetY) / scale
  };
}

canvas.addEventListener('click', (e) => {
  const pos = getMousePos(e);
  const x = Math.floor(pos.x / pixelSize);
  const y = Math.floor(pos.y / pixelSize);
  const key = `${x},${y}`;

  if (claimedPixels.has(key)) return;

  if (selectedPixels.has(key)) {
    selectedPixels.delete(key);
  } else {
    selectedPixels.add(key);
    undoStack.push(key);
  }

  drawGrid();
});

document.getElementById('undoButton')?.addEventListener('click', () => {
  const last = undoStack.pop();
  if (last) {
    selectedPixels.delete(last);
    drawGrid();
  }
});

document.getElementById('deselectAllButton')?.addEventListener('click', () => {
  selectedPixels.clear();
  undoStack = [];
  drawGrid();
});

document.getElementById('payButton').addEventListener('click', async () => {
  if (selectedPixels.size === 0) return;

  const response = await fetch('/create-checkout-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      pixels: Array.from(selectedPixels),
      charity: document.getElementById('charitySelect')?.value || 'None'
    })
  });

  const data = await response.json();
  if (data.sessionId) {
    const stripe = Stripe(data.publicKey);
    stripe.redirectToCheckout({ sessionId: data.sessionId });
  } else {
    document.getElementById('errorMessage').textContent = 'Checkout failed.';
  }
});

canvas.addEventListener('mousedown', (e) => {
  isDragging = true;
  dragStart = { x: e.clientX - offsetX, y: e.clientY - offsetY };
});

canvas.addEventListener('mousemove', (e) => {
  if (isDragging) {
    offsetX = e.clientX - dragStart.x;
    offsetY = e.clientY - dragStart.y;
    drawGrid();
  }
});

canvas.addEventListener('mouseup', () => isDragging = false);
canvas.addEventListener('mouseleave', () => isDragging = false);

canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const delta = e.deltaY < 0 ? 1.1 : 0.9;
  scale *= delta;
  drawGrid();
});

canvas.addEventListener('touchstart', (e) => {
  if (e.touches.length === 1) {
    dragStart = {
      x: e.touches[0].clientX - offsetX,
      y: e.touches[0].clientY - offsetY
    };
    isDragging = true;
  }
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
  if (isDragging && e.touches.length === 1) {
    offsetX = e.touches[0].clientX - dragStart.x;
    offsetY = e.touches[0].clientY - dragStart.y;
    drawGrid();
  }
}, { passive: false });

canvas.addEventListener('touchend', () => {
  isDragging = false;
});

function updateTracker() {
  document.getElementById('pixelCount').textContent = selectedPixels.size;
  document.getElementById('totalPrice').textContent = selectedPixels.size;
  document.getElementById('claimedCount').textContent = claimedPixels.size;
  const total = rows * cols;
  const percent = ((claimedPixels.size / total) * 100).toFixed(2);
  document.getElementById('claimedPercent').textContent = percent;
}

async function loadClaimedPixels() {
  const res = await fetch('/claimed');
  const data = await res.json();
  claimedPixels = new Set(data.claimed);
  drawGrid();
}

loadClaimedPixels();
