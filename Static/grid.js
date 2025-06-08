const canvas = document.getElementById('pixelCanvas');
const ctx = canvas.getContext('2d');
const checkoutBtn = document.getElementById('checkoutBtn');
const undoBtn = document.getElementById('undoBtn');
const clearBtn = document.getElementById('clearBtn');
const charitySelect = document.getElementById('charitySelect');
const pixelTracker = document.getElementById('pixelTracker');

const gridWidth = 1000;
const gridHeight = 3000;
const selectedPixels = [];
const claimedPixels = new Set();
const pixelSize = 1;

let zoom = 1;
let offsetX = 0;
let offsetY = 0;
let isDragging = false;
let startDrag = {};

const stripe = Stripe(window.publishableKey);

fetch('/api/claimed-pixels')
  .then(res => res.json())
  .then(pixels => {
    pixels.forEach(([x, y]) => claimedPixels.add(`${x},${y}`));
    updateCanvas();
  });

canvas.addEventListener('mousedown', e => {
  isDragging = true;
  startDrag = { x: e.offsetX, y: e.offsetY };
});

canvas.addEventListener('mouseup', () => {
  isDragging = false;
});

canvas.addEventListener('mousemove', e => {
  if (isDragging) {
    offsetX += (e.offsetX - startDrag.x) / zoom;
    offsetY += (e.offsetY - startDrag.y) / zoom;
    startDrag = { x: e.offsetX, y: e.offsetY };
    updateCanvas();
  }
});

canvas.addEventListener('click', e => {
  const x = Math.floor((e.offsetX / zoom - offsetX));
  const y = Math.floor((e.offsetY / zoom - offsetY));
  const key = `${x},${y}`;

  if (!claimedPixels.has(key)) {
    selectedPixels.push([x, y]);
    updateCanvas();
  }
});

undoBtn.onclick = () => {
  selectedPixels.pop();
  updateCanvas();
};

clearBtn.onclick = () => {
  selectedPixels.length = 0;
  updateCanvas();
};

checkoutBtn.onclick = async () => {
  const vote = charitySelect.value;
  if (!vote || vote === "Select a Charity") {
    alert("Please select a charity.");
    return;
  }

  const res = await fetch('/create-checkout-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pixels: selectedPixels, vote })
  });
  const session = await res.json();
  stripe.redirectToCheckout({ sessionId: session.id });
};

function updateCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(offsetX, offsetY);
  ctx.scale(zoom, zoom);

  for (let i = 0; i < selectedPixels.length; i++) {
    const [x, y] = selectedPixels[i];
    ctx.fillStyle = 'blue';
    ctx.fillRect(x, y, pixelSize, pixelSize);
  }

  claimedPixels.forEach(key => {
    const [x, y] = key.split(',').map(Number);
    ctx.fillStyle = 'gray';
    ctx.fillRect(x, y, pixelSize, pixelSize);
  });

  ctx.restore();
  pixelTracker.textContent = `${claimedPixels.size + selectedPixels.length} / ${gridWidth * gridHeight} pixels claimed`;
}
