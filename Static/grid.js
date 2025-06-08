let canvas = document.getElementById("pixelCanvas");
let ctx = canvas.getContext("2d");
let scale = 1;
let offsetX = 0;
let offsetY = 0;
let isDragging = false;
let startX, startY;
let selectedPixels = new Set();
let claimedPixels = new Set(); // Claimed pixels from server
const pricePerPixel = 1;
const pixelSize = 10;

// Load claimed pixels from server
fetch("/claimed_pixels")
  .then(res => res.json())
  .then(data => {
    data.claimed.forEach(p => claimedPixels.add(p));
    drawCanvas();
    updatePixelTracker(); // Initialize pixel tracker
  });

canvas.addEventListener("mousedown", (e) => {
  isDragging = true;
  startX = e.clientX - offsetX;
  startY = e.clientY - offsetY;
});

canvas.addEventListener("mouseup", () => isDragging = false);
canvas.addEventListener("mouseout", () => isDragging = false);

canvas.addEventListener("mousemove", (e) => {
  if (isDragging) {
    offsetX = e.clientX - startX;
    offsetY = e.clientY - startY;
    drawCanvas();
  }
});

canvas.addEventListener("wheel", (e) => {
  e.preventDefault();
  const zoom = e.deltaY < 0 ? 1.1 : 0.9;
  scale *= zoom;
  drawCanvas();
});

canvas.addEventListener("click", (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = Math.floor((e.clientX - rect.left - offsetX) / scale / pixelSize);
  const y = Math.floor((e.clientY - rect.top - offsetY) / scale / pixelSize);
  const key = `${x},${y}`;

  if (claimedPixels.has(key)) return;

  if (selectedPixels.has(key)) {
    selectedPixels.delete(key);
  } else {
    selectedPixels.add(key);
  }

  updatePriceDisplay();
  updatePixelTracker();
  drawCanvas();
});

// Touch support for mobile devices
canvas.addEventListener('touchstart', (e) => onMouseDown(convertTouchToMouse(e)), { passive: false });
canvas.addEventListener('touchmove', (e) => onMouseMove(convertTouchToMouse(e)), { passive: false });
canvas.addEventListener('touchend', (e) => onMouseUp(convertTouchToMouse(e)), { passive: false });

function convertTouchToMouse(e) {
  const touch = e.touches[0] || e.changedTouches[0];
  return {
    clientX: touch.clientX,
    clientY: touch.clientY,
    preventDefault: () => e.preventDefault()
  };
}

function drawCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(offsetX, offsetY);
  ctx.scale(scale, scale);

  for (let x = 0; x < canvas.width / pixelSize; x++) {
    for (let y = 0; y < canvas.height / pixelSize; y++) {
      const key = `${x},${y}`;

      if (claimedPixels.has(key)) {
        ctx.fillStyle = "gray";
      } else if (selectedPixels.has(key)) {
        ctx.fillStyle = "blue";
      } else {
        ctx.fillStyle = "white";
      }

      ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
      ctx.strokeRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
    }
  }

  ctx.restore();
}

function updatePriceDisplay() {
  const count = selectedPixels.size;
  document.getElementById("pixelCount").innerText = count;
  document.getElementById("totalPrice").innerText = count * pricePerPixel;
}

function updatePixelTracker() {
  const totalPixels = canvas.width * canvas.height;
  const claimedCount = claimedPixels.size;
  const selectedCount = selectedPixels.size;
  const totalClaimed = claimedCount + selectedCount;

  const percent = ((totalClaimed / totalPixels) * 100).toFixed(2);
  const tracker = document.getElementById("pixelTracker");

  if (tracker) {
    tracker.innerText = `Pixels claimed: ${totalClaimed} / ${totalPixels} (${percent}%)`;
  }
}

// Stripe payment
document.getElementById("payButton").addEventListener("click", async () => {
  if (selectedPixels.length === 0) {
    displayError("Please select at least one pixel.");
    return;
  }

  const charity = document.getElementById("charitySelect").value;

  try {
    const response = await fetch("/create-checkout-session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ pixels: selectedPixels, charity }),
    });

    const data = await response.json();
    if (data && data.id) {
      const stripe = Stripe("pk_test_..."); // use environment variable or template var in production
      stripe.redirectToCheckout({ sessionId: data.id });
    } else {
      displayError("Error creating Stripe session.");
    }
  } catch (err) {
    console.error(err);
    displayError("Network error while trying to checkout.");
  }
});

// Undo and deselect buttons
document.getElementById("undoButton")?.addEventListener("click", () => {
  selectedPixels.clear();
  updatePriceDisplay();
  updatePixelTracker();
  drawCanvas();
});

document.getElementById("deselectAllButton")?.addEventListener("click", () => {
  selectedPixels.clear();
  updatePriceDisplay();
  updatePixelTracker();
  drawCanvas();
});
