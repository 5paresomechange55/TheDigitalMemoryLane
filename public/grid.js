const canvas = document.getElementById("pixelCanvas");
const ctx = canvas.getContext("2d");
let scale = 1, offsetX = 0, offsetY = 0;
let selectedPixels = [];
let actionStack = [];
const pixelSize = 1;
const width = 1000, height = 3000;
canvas.width = width; canvas.height = height;

function drawGrid() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.scale(scale, scale);
  ctx.translate(offsetX, offsetY);
  for (const [x, y] of selectedPixels) {
    ctx.fillStyle = "#00FF00";
    ctx.fillRect(x, y, pixelSize, pixelSize);
  }
  ctx.restore();
}

canvas.addEventListener("click", (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = Math.floor((e.clientX - rect.left) / scale - offsetX);
  const y = Math.floor((e.clientY - rect.top) / scale - offsetY);
  const key = selectedPixels.find(([px, py]) => px === x && py === y);
  if (!key) {
    selectedPixels.push([x, y]);
    actionStack.push([x, y]);
  }
  drawGrid();
});

let isDragging = false, dragStart = { x: 0, y: 0 };
canvas.addEventListener("mousedown", (e) => {
  isDragging = true;
  dragStart.x = e.clientX;
  dragStart.y = e.clientY;
});
canvas.addEventListener("mouseup", () => isDragging = false);
canvas.addEventListener("mousemove", (e) => {
  if (!isDragging) return;
  const dx = (e.clientX - dragStart.x) / scale;
  const dy = (e.clientY - dragStart.y) / scale;
  offsetX += dx;
  offsetY += dy;
  dragStart.x = e.clientX;
  dragStart.y = e.clientY;
  drawGrid();
});

canvas.addEventListener("wheel", (e) => {
  e.preventDefault();
  const delta = e.deltaY < 0 ? 1.1 : 0.9;
  scale *= delta;
  drawGrid();
});

let lastTouchDistance = null;
canvas.addEventListener("touchstart", (e) => {
  if (e.touches.length === 2) {
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    lastTouchDistance = Math.sqrt(dx * dx + dy * dy);
  }
});
canvas.addEventListener("touchmove", (e) => {
  e.preventDefault();
  if (e.touches.length === 2 && lastTouchDistance !== null) {
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    const newDistance = Math.sqrt(dx * dx + dy * dy);
    const scaleFactor = newDistance / lastTouchDistance;
    scale *= scaleFactor;
    lastTouchDistance = newDistance;
    drawGrid();
  }
}, { passive: false });

document.getElementById("undoBtn").addEventListener("click", () => {
  const last = actionStack.pop();
  if (last) selectedPixels = selectedPixels.filter(p => !(p[0] === last[0] && p[1] === last[1]));
  drawGrid();
});

document.getElementById("deselectAllBtn").addEventListener("click", () => {
  selectedPixels = [];
  actionStack = [];
  drawGrid();
});

document.getElementById("checkoutBtn").addEventListener("click", async () => {
  const res = await fetch("/create-checkout-session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pixels: selectedPixels.length }),
  });
  const data = await res.json();
  if (data.id) {
    const stripe = Stripe("pk_test_1234567890"); // replace with real key
    stripe.redirectToCheckout({ sessionId: data.id });
  }
});

fetch("/pixel-stats")
  .then(res => res.json())
  .then(data => {
    const total = 1000 * 3000;
    const percent = ((data.sold / total) * 100).toFixed(2);
    document.getElementById("pixel-counter").innerText = `${data.sold} pixels sold (${percent}%)`;
    document.getElementById("pixel-progress").style.width = percent + "%";
  });

drawGrid();

