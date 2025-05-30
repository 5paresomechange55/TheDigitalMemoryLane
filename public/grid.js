const canvas = document.getElementById("pixelCanvas");
const ctx = canvas.getContext("2d");
const canvasContainer = document.getElementById("canvasContainer");

const pixelSize = 10;
const gridWidth = 1000;
const gridHeight = 3000;
canvas.width = gridWidth;
canvas.height = gridHeight;

let selectedPixels = new Set();
let undoStack = [];

let scale = 1;
let offset = { x: 0, y: 0 };
let isDragging = false;
let dragStart = { x: 0, y: 0 };

const nostalgicColor = "#fcd34d";
const pixelColor = "#1d4ed8";
const backgroundColor = "#fef3c7";

function drawGrid() {
    ctx.save();
    ctx.setTransform(scale, 0, 0, scale, offset.x, offset.y);
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let x = 0; x < gridWidth; x += pixelSize) {
        for (let y = 0; y < gridHeight; y += pixelSize) {
            const key = `${x},${y}`;
            ctx.fillStyle = selectedPixels.has(key) ? pixelColor : nostalgicColor;
            ctx.fillRect(x, y, pixelSize - 1, pixelSize - 1);
        }
    }
    ctx.restore();
}

function getPixelCoordinates(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((clientX - rect.left - offset.x) / scale / pixelSize) * pixelSize;
    const y = Math.floor((clientY - rect.top - offset.y) / scale / pixelSize) * pixelSize;
    return `${x},${y}`;
}

// Mouse Controls
canvas.addEventListener("mousedown", (e) => {
    isDragging = true;
    dragStart = { x: e.offsetX - offset.x, y: e.offsetY - offset.y };
});

canvas.addEventListener("mousemove", (e) => {
    if (isDragging) {
        offset.x = e.offsetX - dragStart.x;
        offset.y = e.offsetY - dragStart.y;
        drawGrid();
    }
});

canvas.addEventListener("mouseup", () => isDragging = false);
canvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    scale *= delta;
    drawGrid();
});

// Touch Controls
let touchStartDist = null;
let lastTouchMid = null;

canvas.addEventListener("touchstart", (e) => {
    if (e.touches.length === 1) {
        isDragging = true;
        dragStart = { x: e.touches[0].clientX - offset.x, y: e.touches[0].clientY - offset.y };
    } else if (e.touches.length === 2) {
        isDragging = false;
        touchStartDist = getDistance(e.touches[0], e.touches[1]);
        lastTouchMid = getMidpoint(e.touches[0], e.touches[1]);
    }
});

canvas.addEventListener("touchmove", (e) => {
    e.preventDefault();
    if (e.touches.length === 1 && isDragging) {
        offset.x = e.touches[0].clientX - dragStart.x;
        offset.y = e.touches[0].clientY - dragStart.y;
        drawGrid();
    } else if (e.touches.length === 2) {
        const currentDist = getDistance(e.touches[0], e.touches[1]);
        const currentMid = getMidpoint(e.touches[0], e.touches[1]);
        const zoomFactor = currentDist / touchStartDist;

        scale *= zoomFactor;
        touchStartDist = currentDist;

        drawGrid();
    }
}, { passive: false });

canvas.addEventListener("touchend", (e) => {
    if (e.touches.length < 2) {
        touchStartDist = null;
        lastTouchMid = null;
    }
    isDragging = false;
});

// Helpers
function getDistance(t1, t2) {
    return Math.sqrt((t1.clientX - t2.clientX) ** 2 + (t1.clientY - t2.clientY) ** 2);
}

function getMidpoint(t1, t2) {
    return {
        x: (t1.clientX + t2.clientX) / 2,
        y: (t1.clientY + t2.clientY) / 2
    };
}

canvas.addEventListener("click", (e) => {
    const key = getPixelCoordinates(e.clientX, e.clientY);
    if (selectedPixels.has(key)) {
        selectedPixels.delete(key);
    } else {
        selectedPixels.add(key);
        undoStack.push(key);
    }
    drawGrid();
});

document.getElementById("checkout").addEventListener("click", async () => {
    if (selectedPixels.size === 0) {
        alert("Please select some pixels.");
        return;
    }

    const response = await fetch("/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pixels: selectedPixels.size }),
    });

    const session = await response.json();
    if (session.id) {
        const stripe = Stripe("pk_test_51RTDqT2c0Glb9QyZNKJzKHIZMfZXmAHBPzFVyxhz22a2cPmsOmzEswfHCYsd68z8HXbeASNV8fI0zoRr3SCSIjTC005jaokCP9");
        stripe.redirectToCheckout({ sessionId: session.id });
    } else {
        alert("Checkout session creation failed.");
    }
});

document.getElementById("undo").addEventListener("click", () => {
    const last = undoStack.pop();
    if (last) {
        selectedPixels.delete(last);
        drawGrid();
    }
});

document.getElementById("deselectAll").addEventListener("click", () => {
    selectedPixels.clear();
    undoStack = [];
    drawGrid();
});

drawGrid();
