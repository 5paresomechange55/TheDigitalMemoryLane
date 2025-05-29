const canvas = document.getElementById("pixelCanvas");
const ctx = canvas.getContext("2d");
const pixelSize = 1;

let selectedPixels = new Set();
const nostalgicColors = ["#ffcc00", "#ff66cc", "#66ccff", "#99ff99", "#cc66ff"];

function getPixelKey(x, y) {
  return `${x},${y}`;
}

function drawPixel(x, y, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, pixelSize, pixelSize);
}

canvas.addEventListener("click", (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = Math.floor((e.clientX - rect.left) / pixelSize);
  const y = Math.floor((e.clientY - rect.top) / pixelSize);
  const key = getPixelKey(x, y);

  if (selectedPixels.has(key)) {
    selectedPixels.delete(key);
    drawPixel(x, y, "#ffffff"); // Reset to white
  } else {
    selectedPixels.add(key);
    const color = nostalgicColors[Math.floor(Math.random() * nostalgicColors.length)];
    drawPixel(x, y, color);
  }

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
