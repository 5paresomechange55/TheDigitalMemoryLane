const canvas = document.getElementById("pixelCanvas");
const ctx = canvas.getContext("2d");
const pixelSize = 1;

let selectedPixels = new Set();
let scale = 1;
let offsetX = 0;
let offsetY = 0;
let isDragging = false;
let dragStart = { x: 0, y: 0 };

const nostalgicColors = ["#ffcc00", "#ff66cc", "#66ccff", "#99ff99", "#cc66ff"];

function getPixelKey(x, y) {
  return `${x},${y}`;
}

function drawPixel(x, y, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, pixelSize, pixelSize);
}

function redrawCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let key of selectedPixels) {
    const [x, y] = key.split(",").map(Number);
    drawPixelTransformed(x, y);
  }
}

function drawPixelTransformed(x, y) {
  const color = nostalgicColors[Math.floor(Math.random() * nostalgicColors.length)];
  ctx.fillStyle = color;
  ctx.fillRect((x + offsetX) * scale, (y + offsetY) * scale, scale, scale);
}

canvas.addEventListener("mousedown", (e) => {
  isDragging = true;
  dragStart = { x: e.clientX, y: e.clientY };
});

canvas.addEventListener("mousemove", (e) => {
  if (isDragging) {
    offsetX += (e.clientX - dragStart.x) / scale;
    offsetY += (e.clientY - dragStart.y) / scale;
    dragStart = { x: e.clientX, y: e.clientY };
    redrawCanvas();
  }
});

canvas.addEventListener("mouseup", () => {
  isDragging = false;
});

canvas.addEventListener("mouseleave", () => {
  isDragging = false;
});

canvas.addEventListener("wheel", (e) => {
  e.preventDefault();
  const zoomIntensity = 0.1;
  const zoom = e.deltaY < 0 ? 1 + zoomIntensity : 1 - zoomIntensity;
  scale *= zoom;

  // Clamp scale for usability
  scale = Math.max(1, Math.min(scale, 20));
  redrawCanvas();
});

canvas.addEventListener("click", (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = Math.floor((e.clientX - rect.left) / scale - offsetX);
  const y = Math.floor((e.clientY - rect.top) / scale - offsetY);
  const key = getPixelKey(x, y);

  if (selectedPixels.has(key)) {
    selectedPixels.delete(key);
  } else {
    selectedPixels.add(key);
  }
  redrawCanvas();
  updateStats();
});

function updateStats() {
  document.getElementById("pixelCount").textContent = selectedPixels.size;
  document.getElementById("totalPrice").textContent = selectedPixels.size * 1;
}

// Stripe integration
const stripe = Stripe("pk_test_51RTDqT2c0Glb9QyZNKJzKHIZMfZXmAHBPzFVyxhz22a2cPmsOmzEswfHCYsd68z8HXbeASNV8fI0zoRr3SCSIjTC005jaokCP9");

document.getElementById("payButton").addEventListener("click", async () => {
  const pixels = selectedPixels.size;

  if (pixels === 0) {
    document.getElementById("errorMessage").textContent = "Please select at least one pixel.";
    return;
  }

  try {
    const res = await fetch("/create-checkout-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pixels }),
    });

    const data = await res.json();

    if (data.id) {
      stripe.redirectToCheckout({ sessionId: data.id });
    } else {
      throw new Error(data.error || "Unknown error");
    }
  } catch (err) {
    document.getElementById("errorMessage").textContent = `Payment error: ${err.message}`;
  }
});
