console.log("grid.js loaded");

const canvas = document.getElementById("pixelCanvas");
const ctx = canvas.getContext("2d");

const pixelSize = 10;
const cols = canvas.width / pixelSize;
const rows = canvas.height / pixelSize;

let selectedPixels = [];
let claimedPixels = new Set();
let undoStack = [];

let offsetX = 0;
let offsetY = 0;
let scale = 1;

let isDragging = false;
let dragStart = { x: 0, y: 0 };

let stripe = Stripe("pk_test_51RTDqT2c0Glb9QyZNKJzKHIZMfZXmAHBPzFVyxhz22a2cPmsOmzEswfHCYsd68z8HXbeASNV8fI0zoRr3SCSIjTC005jaokCP9");

const pixelCountSpan = document.getElementById("pixelCount");
const totalPriceSpan = document.getElementById("totalPrice");
const claimedPixelCountSpan = document.getElementById("claimedPixels");
const errorMessage = document.getElementById("errorMessage");

function drawGrid() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const visibleCols = cols;
  const visibleRows = rows;

  for (let y = 0; y < visibleRows; y++) {
    for (let x = 0; x < visibleCols; x++) {
      const px = x * pixelSize;
      const py = y * pixelSize;

      const pixelKey = `${x},${y}`;

      if (claimedPixels.has(pixelKey)) {
        ctx.fillStyle = "#999";
      } else if (selectedPixels.includes(pixelKey)) {
        ctx.fillStyle = "#ff69b4";
      } else {
        ctx.fillStyle = "#fff";
      }

      ctx.fillRect(px, py, pixelSize, pixelSize);
      ctx.strokeStyle = "#ddd";
      ctx.strokeRect(px, py, pixelSize, pixelSize);
    }
  }
}

function getCanvasCoordinates(evt) {
  const rect = canvas.getBoundingClientRect();
  const x = (evt.clientX - rect.left) / scale;
  const y = (evt.clientY - rect.top) / scale;
  return { x: x - offsetX, y: y - offsetY };
}

function togglePixel(evt) {
  const pos = getCanvasCoordinates(evt);
  const x = Math.floor(pos.x / pixelSize);
  const y = Math.floor(pos.y / pixelSize);
  const pixelKey = `${x},${y}`;

  if (x < 0 || x >= cols || y < 0 || y >= rows) return;
  if (claimedPixels.has(pixelKey)) return;

  const index = selectedPixels.indexOf(pixelKey);
  if (index > -1) {
    selectedPixels.splice(index, 1);
    undoStack.push({ type: "deselect", pixel: pixelKey });
  } else {
    selectedPixels.push(pixelKey);
    undoStack.push({ type: "select", pixel: pixelKey });
  }

  updatePixelCount();
  drawGrid();
}

function updatePixelCount() {
  pixelCountSpan.textContent = selectedPixels.length;
  totalPriceSpan.textContent = selectedPixels.length;
}

function undoLastAction() {
  const last = undoStack.pop();
  if (!last) return;

  if (last.type === "select") {
    selectedPixels = selectedPixels.filter(p => p !== last.pixel);
  } else if (last.type === "deselect") {
    if (!selectedPixels.includes(last.pixel)) {
      selectedPixels.push(last.pixel);
    }
  }

  updatePixelCount();
  drawGrid();
}

function deselectAll() {
  selectedPixels = [];
  undoStack = [];
  updatePixelCount();
  drawGrid();
}

async function fetchClaimedPixels() {
  try {
    const res = await fetch("/claimed-pixels");
    const data = await res.json();
    data.claimed.forEach(p => claimedPixels.add(p));
    claimedPixelCountSpan.textContent = claimedPixels.size;
    drawGrid();
  } catch (e) {
    console.error("Error fetching claimed pixels:", e);
  }
}

async function initiateCheckout() {
  if (selectedPixels.length === 0) {
    errorMessage.textContent = "Please select pixels to purchase.";
    return;
  }

  const charity = document.getElementById("charitySelect").value;
  if (!charity) {
    errorMessage.textContent = "Please select a charity to vote for.";
    return;
  }

  errorMessage.textContent = "";

  try {
    const res = await fetch("/create-checkout-session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        pixels: selectedPixels,
        charity: charity
      })
    });

    const data = await res.json();

    if (data.id) {
      stripe.redirectToCheckout({ sessionId: data.id });
    } else {
      errorMessage.textContent = "Checkout error. Please try again.";
    }
  } catch (e) {
    console.error(e);
    errorMessage.textContent = "Server error. Please try again.";
  }
}

// EVENT LISTENERS
canvas.addEventListener("click", togglePixel);

document.getElementById("undoButton").addEventListener("click", undoLastAction);
document.getElementById("deselectAllButton").addEventListener("click", deselectAll);
document.getElementById("payButton").addEventListener("click", initiateCheckout);

// TOUCH EVENTS FOR MOBILE
canvas.addEventListener("touchstart", function (e) {
  const touch = e.touches[0];
  togglePixel({ clientX: touch.clientX, clientY: touch.clientY });
  e.preventDefault();
});

// INIT
fetchClaimedPixels();
drawGrid();
updatePixelCount();
