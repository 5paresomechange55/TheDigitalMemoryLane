const canvas = document.getElementById("pixelCanvas");
const ctx = canvas.getContext("2d");

const pixelSize = 10; // one grid square is 10x10 visual pixels
const cols = canvas.width / pixelSize;
const rows = canvas.height / pixelSize;

const selectedPixels = new Set();
let isDragging = false;

function drawGrid() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            const key = `${x},${y}`;
            ctx.fillStyle = selectedPixels.has(key) ? "blue" : "gray";
            ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
            ctx.strokeStyle = "#ccc";
            ctx.strokeRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
        }
    }
}

function updateCounts() {
    document.getElementById("pixelCount").textContent = selectedPixels.size;
    document.getElementById("totalPrice").textContent = selectedPixels.size * 1;
}

canvas.addEventListener("mousedown", (e) => {
    isDragging = true;
    togglePixel(e);
});

canvas.addEventListener("mousemove", (e) => {
    if (isDragging) {
        togglePixel(e);
    }
});

canvas.addEventListener("mouseup", () => {
    isDragging = false;
});

function togglePixel(e) {
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / pixelSize);
    const y = Math.floor((e.clientY - rect.top) / pixelSize);
    const key = `${x},${y}`;
    selectedPixels.add(key); // make sure it's always added, no toggling
    drawGrid();
    updateCounts();
}

drawGrid();

document.getElementById("payButton").addEventListener("click", async () => {
    const pixelCount = selectedPixels.size;
    if (pixelCount === 0) {
        document.getElementById("errorMessage").textContent = "Please select at least one pixel.";
        return;
    }

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
        document.getElementById("errorMessage").textContent = data.error || "Payment failed.";
    }
});
