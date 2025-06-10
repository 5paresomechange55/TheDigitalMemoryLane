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
let isDragging = false;
let dragStart = null;
let lastTouchDist = 0;
let lastTouchCenter = null;

function getCanvasCoordinates(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const x = (clientX - rect.left - offsetX) / scale;
  const y = (clientY - rect.top - offsetY) / scale;
  return { x: Math.floor(x), y: Math.floor(y) };
}

// ZOOM: Mouse wheel
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

// DESKTOP mouse pan + select
canvas.addEventListener("mousedown", (e) => {
  isPanning = e.button === 1 || e.ctrlKey || e.metaKey;
  startX = e.clientX;
  startY = e.clientY;
});

canvas.addEventListener("mouseup", (e) => {
  if (!isPanning) {
    const { x, y } = getCanvasCoordinates(e.clientX, e.clientY);
    togglePixelSelection(x, y);
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

// TOUCH events for mobile
canvas.addEventListener("touchstart", (e) => {
  if (e.touches.length === 2) {
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    lastTouchDist = Math.hypot(dx, dy);
    lastTouchCenter = {
      x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
      y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
    };
  } else if (e.touches.length === 1) {
    isDragging = true;
    dragStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }
}, { passive: false });

canvas.addEventListener("touchmove", (e) => {
  e.preventDefault();
  if (e.touches.length === 2) {
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    const newDist = Math.hypot(dx, dy);
    const newCenter = {
      x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
      y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
    };

    const zoom = newDist / lastTouchDist;
    const canvasX = (newCenter.x - canvas.getBoundingClientRect().left - offsetX) / scale;
    const canvasY = (newCenter.y - canvas.getBoundingClientRect().top - offsetY) / scale;
    scale *= zoom;
    offsetX = newCenter.x - canvasX * scale - canvas.getBoundingClientRect().left;
    offsetY = newCenter.y - canvasY * scale - canvas.getBoundingClientRect().top;

    lastTouchDist = newDist;
    lastTouchCenter = newCenter;
    drawGrid();
  } else if (e.touches.length === 1 && isDragging) {
    const touch = e.touches[0];
    offsetX += touch.clientX - dragStart.x;
    offsetY += touch.clientY - dragStart.y;
    dragStart = { x: touch.clientX, y: touch.clientY };
    drawGrid();
  }
}, { passive: false });

canvas.addEventListener("touchend", (e) => {
  isDragging = false;
  if (e.touches.length === 0 && e.changedTouches.length === 1) {
    const touch = e.changedTouches[0];
    const rect = canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    const coords = getCanvasCoordinates(x + rect.left, y + rect.top);
    togglePixelSelection(coords.x, coords.y);
  }
}, { passive: false });

function togglePixelSelection(x, y) {
  const key = `${x},${y}`;
  if (claimedPixels.has(key)) return;

  const index = selectedPixels.indexOf(key);
  if (index !== -1) {
    selectedPixels.splice(index, 1);
  } else {
    selectedPixels.push(key);
  }
  pixelHistory.push([...selectedPixels]);
  updateCounters();
  drawGrid();
}

function updateCounters() {
  document.getElementById("pixelCount").innerText = selectedPixels.length;
  document.getElementById("claimedPixels").innerText = claimedPixels.size;
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

// Undo selection
document.getElementById("undoButton").addEventListener("click", () => {
  if (pixelHistory.length > 0) {
    pixelHistory.pop();
    selectedPixels = pixelHistory.length > 0 ? pixelHistory[pixelHistory.length - 1] : [];
    updateCounters();
    drawGrid();
  }
});

// Deselect all
document.getElementById("deselectAllButton").addEventListener("click", () => {
  selectedPixels = [];
  pixelHistory = [];
  updateCounters();
  drawGrid();
});

// Payment button
document.getElementById("payButton").addEventListener("click", async () => {
  const errorDisplay = document.getElementById("errorMessage");
  errorDisplay.textContent = "";

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
      const stripe = Stripe("pk_test_51RTDqT2c0Glb9QyZNKJzKHIZMfZXmAHBPzFVyxhz22a2cPmsOmzEswfHCYsd68z8HXbeASNV8fI0zoRr3SCSIjTC005jaokCP9");
      stripe.redirectToCheckout({ sessionId: data.id });
    } else {
      errorDisplay.textContent = "Error creating checkout session.";
    }
  } catch (err) {
    console.error(err);
    errorDisplay.textContent = "Failed to connect to payment server.";
  }
});

// Load claimed pixels
async function fetchClaimedPixels() {
  try {
    const res = await fetch("/claimed-pixels");
    const data = await res.json();
    data.claimed.forEach(coord => claimedPixels.add(coord));
    updateCounters();
    drawGrid();
  } catch (e) {
    console.error("Failed to fetch claimed pixels:", e);
  }
}

fetchClaimedPixels();
drawGrid();
