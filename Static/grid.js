const canvas = document.getElementById("pixelCanvas");
const ctx = canvas.getContext("2d");
const pixelSize = 1;
const width = canvas.width;
const height = canvas.height;
let scale = 1;
let offsetX = 0;
let offsetY = 0;
let isPanning = false;
let startX, startY;
let selectedPixels = [];
let pixelHistory = [];
let claimedPixels = new Set();

// Touch handling
let isTouching = false;
let lastTouchDistance = null;

// Zooming
canvas.addEventListener("wheel", (e) => {
  e.preventDefault();
  const zoomIntensity = 0.1;
  const mouseX = (e.offsetX - offsetX) / scale;
  const mouseY = (e.offsetY - offsetY) / scale;
  const direction = e.deltaY > 0 ? -1 : 1;
  const factor = 1 + zoomIntensity * direction;
  scale *= factor;
  offsetX = e.offsetX - mouseX * scale;
  offsetY = e.offsetY - mouseY * scale;
  drawGrid();
}, { passive: false });

function getCanvasCoordinates(e) {
  const x = (e.clientX - canvas.getBoundingClientRect().left - offsetX) / scale;
  const y = (e.clientY - canvas.getBoundingClientRect().top - offsetY) / scale;
  return { x: Math.floor(x), y: Math.floor(y) };
}

canvas.addEventListener("mousedown", (e) => {
  isPanning = e.button === 1 || e.ctrlKey || e.metaKey;
  startX = e.clientX;
  startY = e.clientY;
});

canvas.addEventListener("mouseup", (e) => {
  if (!isPanning) {
    const { x, y } = getCanvasCoordinates(e);
    selectPixel(x, y);
  }
  isPanning = false;
});

canvas.addEventListener("mousemove", (e) => {
  if (isPanning && e.buttons) {
    offsetX += e.movementX;
    offsetY += e.movementY;
    drawGrid();
  }
});

canvas.addEventListener("touchstart", (e) => {
  if (e.touches.length === 1) {
    isTouching = true;
    const touch = e.touches[0];
    const { x, y } = getCanvasCoordinates(touch);
    selectPixel(x, y);
  } else if (e.touches.length === 2) {
    isTouching = false;
    lastTouchDistance = getTouchDistance(e.touches);
  }
}, { passive: false });

canvas.addEventListener("touchmove", (e) => {
  if (e.touches.length === 2) {
    const newDistance = getTouchDistance(e.touches);
    const delta = newDistance - lastTouchDistance;
    const zoomIntensity = 0.005;
    const factor = 1 + delta * zoomIntensity;
    scale *= factor;
    lastTouchDistance = newDistance;
    drawGrid();
  } else if (isTouching && e.touches.length === 1) {
    const touch = e.touches[0];
    offsetX += e.movementX || 0;
    offsetY += e.movementY || 0;
    drawGrid();
  }
}, { passive: false });

canvas.addEventListener("touchend", () => {
  isTouching = false;
}, { passive: false });

function getTouchDistance(touches) {
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

function selectPixel(x, y) {
  const key = `${x},${y}`;
  if (!claimedPixels.has(key) && !selectedPixels.includes(key)) {
    selectedPixels.push(key);
    pixelHistory.push([...selectedPixels]);
    updateCounters();
    drawGrid();
  }
}

function updateCounters() {
  document.getElementById("pixelCount").innerText = selectedPixels.length;
  document.getElementById("totalPrice").innerText = selectedPixels.length;
}

function drawGrid() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);

  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      const key = `${x},${y}`;
      if (claimedPixels.has(key)) {
        ctx.fillStyle = "#999";
        ctx.fillRect(x, y, pixelSize, pixelSize);
      } else if (selectedPixels.includes(key)) {
        ctx.fillStyle = "#ff6347";
        ctx.fillRect(x, y, pixelSize, pixelSize);
      }
    }
  }

  ctx.restore();
}

document.getElementById("undoButton").addEventListener("click", () => {
  if (pixelHistory.length > 0) {
    pixelHistory.pop();
    selectedPixels = pixelHistory.length > 0 ? pixelHistory[pixelHistory.length - 1] : [];
    updateCounters();
    drawGrid();
  }
});

document.getElementById("deselectAllButton").addEventListener("click", () => {
  selectedPixels = [];
  pixelHistory = [];
  updateCounters();
  drawGrid();
});

document.getElementById("payButton").addEventListener("click", async () => {
  const errorDisplay = document.getElementById("errorMessage");
  if (selectedPixels.length === 0) {
    errorDisplay.textContent = "Please select at least one pixel.";
    return;
  }

  const charity = document.getElementById("charitySelect")?.value || "default";

  try {
    const response = await fetch("/create-checkout-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pixels: selectedPixels, charity }),
    });

    const data = await response.json();
    if (data?.id) {
      const stripe = Stripe("pk_test_..."); // Replace or dynamically inject in production
      stripe.redirectToCheckout({ sessionId: data.id });
    } else {
      errorDisplay.textContent = "Error creating checkout session.";
    }
  } catch (err) {
    console.error(err);
    errorDisplay.textContent = "Failed to connect to payment server.";
  }
});

async function fetchClaimedPixels() {
  const res = await fetch("/claimed-pixels");
  const data = await res.json();
  data.claimed.forEach(coord => claimedPixels.add(coord));
  document.getElementById("claimedPixels").innerText = claimedPixels.size;
  drawGrid();
}

fetchClaimedPixels();
