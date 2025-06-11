const canvas = document.getElementById("pixelCanvas");
const ctx = canvas.getContext("2d");
const pixelSize = 1;
const width = canvas.width;
const height = canvas.height;
const selectedPixels = new Set();
let claimedPixels = new Set();
let history = [];

let scale = 1;
let originX = 0;
let originY = 0;
let isDragging = false;
let dragStart = { x: 0, y: 0 };

// Setup touch pinch
let lastTouchDistance = null;

const stripe = Stripe(STRIPE_PUBLIC_KEY);

// ====== Helpers ======
function drawGrid() {
  ctx.clearRect(0, 0, width, height);

  // Draw all pixels
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const key = `${x},${y}`;
      if (claimedPixels.has(key)) {
        ctx.fillStyle = "#666";
      } else if (selectedPixels.has(key)) {
        ctx.fillStyle = "#ff0000";
      } else {
        ctx.fillStyle = "#fff";
      }
      ctx.fillRect(x, y, 1, 1);
    }
  }

  updatePixelCounter();
}

function screenToCanvas(x, y) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: Math.floor((x - rect.left - originX) / scale),
    y: Math.floor((y - rect.top - originY) / scale),
  };
}

function updatePixelCounter() {
  document.getElementById("pixelCount").textContent = selectedPixels.size;
  document.getElementById("totalPrice").textContent = selectedPixels.size;
  document.getElementById("claimedPixels").textContent = claimedPixels.size;
}

// ====== Pixel Interaction ======
function togglePixel(x, y) {
  const key = `${x},${y}`;
  if (claimedPixels.has(key)) return;

  if (selectedPixels.has(key)) {
    selectedPixels.delete(key);
  } else {
    selectedPixels.add(key);
    history.push(key);
  }
  drawGrid();
}

canvas.addEventListener("click", (e) => {
  const { x, y } = screenToCanvas(e.clientX, e.clientY);
  if (x >= 0 && y >= 0 && x < width && y < height) {
    togglePixel(x, y);
  }
});

// ====== Stripe Checkout ======
document.getElementById("payButton").addEventListener("click", async () => {
  const charity = document.getElementById("charitySelect").value;
  const pixels = Array.from(selectedPixels).map((key) =>
    key.split(",").map(Number)
  );

  if (pixels.length === 0) {
    document.getElementById("errorMessage").textContent = "No pixels selected.";
    return;
  }

  try {
    const res = await fetch("/create-checkout-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pixels, charity }),
    });

    const data = await res.json();

    if (data.error) {
      document.getElementById("errorMessage").textContent = data.error;
      return;
    }

    const result = await stripe.redirectToCheckout({ sessionId: data.id });
    if (result.error) {
      document.getElementById("errorMessage").textContent = result.error.message;
    }
  } catch (error) {
    document.getElementById("errorMessage").textContent = error.message;
  }
});

// ====== Undo and Deselect ======
document.getElementById("undoButton").addEventListener("click", () => {
  const last = history.pop();
  if (last) {
    selectedPixels.delete(last);
    drawGrid();
  }
});

document.getElementById("deselectAllButton").addEventListener("click", () => {
  selectedPixels.clear();
  history = [];
  drawGrid();
});

// ====== Zoom and Pan ======
canvas.addEventListener("wheel", (e) => {
  e.preventDefault();
  const scaleAmount = -e.deltaY * 0.001;
  const mouse = screenToCanvas(e.clientX, e.clientY);

  const newScale = Math.max(0.1, Math.min(5, scale + scaleAmount));
  const scaleFactor = newScale / scale;
  originX -= mouse.x * (scaleFactor - 1) * scale;
  originY -= mouse.y * (scaleFactor - 1) * scale;
  scale = newScale;

  updateTransform();
});

canvas.addEventListener("mousedown", (e) => {
  isDragging = true;
  dragStart = { x: e.clientX, y: e.clientY };
});

window.addEventListener("mouseup", () => (isDragging = false));
window.addEventListener("mousemove", (e) => {
  if (!isDragging) return;
  originX += e.clientX - dragStart.x;
  originY += e.clientY - dragStart.y;
  dragStart = { x: e.clientX, y: e.clientY };
  updateTransform();
});

// ====== Touch Support ======
canvas.addEventListener("touchstart", (e) => {
  if (e.touches.length === 2) {
    lastTouchDistance = getTouchDistance(e.touches);
  } else if (e.touches.length === 1) {
    const touch = e.touches[0];
    const { x, y } = screenToCanvas(touch.clientX, touch.clientY);
    togglePixel(x, y);
  }
});

canvas.addEventListener("touchmove", (e) => {
  e.preventDefault();
  if (e.touches.length === 2) {
    const newDistance = getTouchDistance(e.touches);
    if (lastTouchDistance !== null) {
      const scaleFactor = newDistance / lastTouchDistance;
      const mid = {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
      };
      const canvasMid = screenToCanvas(mid.x, mid.y);

      scale *= scaleFactor;
      originX -= canvasMid.x * (scaleFactor - 1) * scale;
      originY -= canvasMid.y * (scaleFactor - 1) * scale;
      updateTransform();
    }
    lastTouchDistance = newDistance;
  } else if (e.touches.length === 1 && isDragging) {
    const touch = e.touches[0];
    originX += touch.clientX - dragStart.x;
    originY += touch.clientY - dragStart.y;
    dragStart = { x: touch.clientX, y: touch.clientY };
    updateTransform();
  }
}, { passive: false });

canvas.addEventListener("touchend", () => {
  lastTouchDistance = null;
});

// ====== Helpers ======
function getTouchDistance(touches) {
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

function updateTransform() {
  ctx.setTransform(scale, 0, 0, scale, originX, originY);
  drawGrid();
}

async function fetchClaimedPixels() {
  try {
    const res = await fetch("/claimed-pixels");
    const data = await res.json();
    claimedPixels = new Set(data.claimed);
    drawGrid();
  } catch (err) {
    console.error("Error fetching claimed pixels", err);
  }
}

fetchClaimedPixels();
