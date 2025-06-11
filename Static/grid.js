const canvas = document.getElementById("pixelCanvas");
const ctx = canvas.getContext("2d");
const pixelSize = 1;
const rows = canvas.height;
const cols = canvas.width;

let selectedPixels = [];
let undoStack = [];

let claimedPixels = new Set();
let isDragging = false;
let startX, startY;
let offsetX = 0, offsetY = 0;
let scale = 1;
let isTouching = false;

// Initialize
fetch('/claimed-pixels')
  .then(res => res.json())
  .then(data => {
    claimedPixels = new Set(data.claimed.map(p => JSON.stringify(p)));
    drawGrid();
    updatePixelCounter();
  });

function drawGrid() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(offsetX, offsetY);
  ctx.scale(scale, scale);

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const pixelKey = JSON.stringify([x, y]);
      if (claimedPixels.has(pixelKey)) {
        ctx.fillStyle = "#555"; // already claimed
      } else if (selectedPixels.some(p => p[0] === x && p[1] === y)) {
        ctx.fillStyle = "red"; // currently selected
      } else {
        ctx.fillStyle = "#fef6e4"; // unclaimed
      }
      ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
    }
  }

  ctx.restore();
}

function updatePixelCounter() {
  document.getElementById("pixelCount").innerText = selectedPixels.length;
  document.getElementById("totalPrice").innerText = selectedPixels.length;
  document.getElementById("claimedPixels").innerText = claimedPixels.size;
}

function getPixelFromCoords(x, y) {
  const rect = canvas.getBoundingClientRect();
  const canvasX = (x - rect.left - offsetX) / scale;
  const canvasY = (y - rect.top - offsetY) / scale;
  const px = Math.floor(canvasX / pixelSize);
  const py = Math.floor(canvasY / pixelSize);
  return [px, py];
}

function togglePixel(px, py) {
  const key = JSON.stringify([px, py]);
  if (claimedPixels.has(key)) return;

  const index = selectedPixels.findIndex(p => p[0] === px && p[1] === py);
  if (index >= 0) {
    selectedPixels.splice(index, 1);
  } else {
    selectedPixels.push([px, py]);
    undoStack.push([px, py]);
  }

  drawGrid();
  updatePixelCounter();
}

// Event Listeners
canvas.addEventListener("mousedown", (e) => {
  if (e.button === 0) {
    const [px, py] = getPixelFromCoords(e.clientX, e.clientY);
    togglePixel(px, py);
  } else if (e.button === 1 || e.button === 2) {
    isDragging = true;
    startX = e.clientX - offsetX;
    startY = e.clientY - offsetY;
  }
});
canvas.addEventListener("mouseup", () => isDragging = false);
canvas.addEventListener("mouseleave", () => isDragging = false);
canvas.addEventListener("mousemove", (e) => {
  if (isDragging) {
    offsetX = e.clientX - startX;
    offsetY = e.clientY - startY;
    drawGrid();
  }
});

// Touch support
canvas.addEventListener("touchstart", (e) => {
  isTouching = true;
  const touch = e.touches[0];
  const [px, py] = getPixelFromCoords(touch.clientX, touch.clientY);
  togglePixel(px, py);
});
canvas.addEventListener("touchend", () => isTouching = false);

// Zoom with wheel
canvas.addEventListener("wheel", (e) => {
  e.preventDefault();
  const zoomAmount = 0.1;
  scale += e.deltaY > 0 ? -zoomAmount : zoomAmount;
  scale = Math.max(0.5, Math.min(5, scale));
  drawGrid();
}, { passive: false });

// Buttons
document.getElementById("undoButton").addEventListener("click", () => {
  const last = undoStack.pop();
  if (last) {
    selectedPixels = selectedPixels.filter(p => !(p[0] === last[0] && p[1] === last[1]));
    drawGrid();
    updatePixelCounter();
  }
});

document.getElementById("deselectAllButton").addEventListener("click", () => {
  selectedPixels = [];
  undoStack = [];
  drawGrid();
  updatePixelCounter();
});

// Stripe Checkout
document.getElementById("payButton").addEventListener("click", async () => {
  const charity = document.getElementById("charitySelect").value;
  if (selectedPixels.length === 0) {
    document.getElementById("errorMessage").innerText = "Please select pixels first.";
    return;
  }

  try {
    const response = await fetch("/create-checkout-session", {
      method: "POST",
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pixels: selectedPixels, charity })
    });

    const data = await response.json();
    if (data.error) {
      document.getElementById("errorMessage").innerText = data.error;
    } else {
      const stripe = Stripe(STRIPE_PUBLIC_KEY);
      stripe.redirectToCheckout({ sessionId: data.id });
    }
  } catch (err) {
    console.error(err);
    document.getElementById("errorMessage").innerText = "An error occurred. Please try again.";
  }
});
