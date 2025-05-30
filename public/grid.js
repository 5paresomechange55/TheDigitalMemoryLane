const canvas = document.getElementById("pixelCanvas");
const ctx = canvas.getContext("2d");

let scale = 1;
let originX = 0;
let originY = 0;
let isDragging = false;
let dragStart = { x: 0, y: 0 };
let selectedPixels = new Set();
const pixelSize = 1;
const pixelPrice = 1;

function drawCanvas() {
  ctx.save();
  ctx.setTransform(scale, 0, 0, scale, originX, originY);
  ctx.clearRect(-originX / scale, -originY / scale, canvas.width / scale, canvas.height / scale);

  ctx.fillStyle = "#fff8dc";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  selectedPixels.forEach(key => {
    const [x, y] = key.split(",").map(Number);
    ctx.fillStyle = "#b5651d"; // nostalgic brown
    ctx.fillRect(x, y, 1, 1);
  });

  ctx.restore();
}

function getPixelCoords(x, y) {
  const realX = (x - originX) / scale;
  const realY = (y - originY) / scale;
  return [Math.floor(realX), Math.floor(realY)];
}

canvas.addEventListener("mousedown", e => {
  isDragging = true;
  dragStart = { x: e.clientX, y: e.clientY };
});

canvas.addEventListener("mousemove", e => {
  if (isDragging) {
    originX += e.clientX - dragStart.x;
    originY += e.clientY - dragStart.y;
    dragStart = { x: e.clientX, y: e.clientY };
    drawCanvas();
  }
});

canvas.addEventListener("mouseup", () => {
  isDragging = false;
});

canvas.addEventListener("wheel", e => {
  e.preventDefault();
  const zoomFactor = 1.1;
  const zoom = e.deltaY < 0 ? zoomFactor : 1 / zoomFactor;
  const mouseX = e.offsetX;
  const mouseY = e.offsetY;

  originX = mouseX - (mouseX - originX) * zoom;
  originY = mouseY - (mouseY - originY) * zoom;
  scale *= zoom;
  drawCanvas();
}, { passive: false });

canvas.addEventListener("click", e => {
  const [x, y] = getPixelCoords(e.offsetX, e.offsetY);
  const key = `${x},${y}`;
  if (selectedPixels.has(key)) {
    selectedPixels.delete(key);
  } else {
    selectedPixels.add(key);
  }
  updateUI();
  drawCanvas();
});

// Mobile touch support
let lastTouchDist = 0;
let lastTouchCenter = null;

canvas.addEventListener("touchstart", e => {
  if (e.touches.length === 2) {
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    lastTouchDist = Math.hypot(dx, dy);
    lastTouchCenter = {
      x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
      y: (e.touches[0].clientY + e.touches[1].clientY) / 2
    };
  } else if (e.touches.length === 1) {
    isDragging = true;
    dragStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }
}, { passive: false });

canvas.addEventListener("touchmove", e => {
  e.preventDefault();
  if (e.touches.length === 2) {
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    const newDist = Math.hypot(dx, dy);
    const newCenter = {
      x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
      y: (e.touches[0].clientY + e.touches[1].clientY) / 2
    };

    const zoom = newDist / lastTouchDist;
    originX = newCenter.x - (newCenter.x - originX) * zoom;
    originY = newCenter.y - (newCenter.y - originY) * zoom;
    scale *= zoom;

    lastTouchDist = newDist;
    lastTouchCenter = newCenter;
    drawCanvas();
  } else if (e.touches.length === 1 && isDragging) {
    const touch = e.touches[0];
    originX += touch.clientX - dragStart.x;
    originY += touch.clientY - dragStart.y;
    dragStart = { x: touch.clientX, y: touch.clientY };
    drawCanvas();
  }
}, { passive: false });

canvas.addEventListener("touchend", e => {
  isDragging = false;
  if (e.touches.length === 0 && e.changedTouches.length === 1) {
    const touch = e.changedTouches[0];
    const rect = canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    const [px, py] = getPixelCoords(x, y);
    const key = `${px},${py}`;
    if (selectedPixels.has(key)) {
      selectedPixels.delete(key);
    } else {
      selectedPixels.add(key);
    }
    updateUI();
    drawCanvas();
  }
}, { passive: false });

function updateUI() {
  const count = selectedPixels.size;
  document.getElementById("pixelCount").innerText = count;
  document.getElementById("totalPrice").innerText = count * pixelPrice;
}

document.getElementById("payButton").addEventListener("click", async () => {
  const pixelCount = selectedPixels.size;
  if (pixelCount === 0) return;

  const response = await fetch("/create-checkout-session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pixels: pixelCount }),
  });

  const data = await response.json();
  if (data.id) {
    const stripe = Stripe("pk_test_51RTDqT2c0Glb9QyZNKJzKHIZMfZXmAHBPzFVyxhz22a2cPmsOmzEswfHCYsd68z8HXbeASNV8fI0zoRr3SCSIjTC005jaokCP9");
    stripe.redirectToCheckout({ sessionId: data.id });
  } else {
    document.getElementById("errorMessage").innerText = data.error;
  }
});

drawCanvas();

