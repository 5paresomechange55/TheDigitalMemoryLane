console.log("CSS-grid version loaded");

const STRIPE_PUBLIC_KEY = window.STRIPE_PUBLIC_KEY || "{{ stripe_public_key }}";

const cols = 1000;
const rows = 3000;

const grid = document.getElementById("grid");
const wrapper = document.getElementById("wrapper");

const selected = new Set();
const claimed = new Set();
const history = [];

const pixelCount = document.getElementById("pixelCount");
const totalPrice = document.getElementById("totalPrice");
const claimedCount = document.getElementById("claimedPixels");
const errorMsg = document.getElementById("errorMessage");

function updateCounts() {
  pixelCount.textContent = selected.size;
  totalPrice.textContent = selected.size;
  claimedCount.textContent = claimed.size;
}

function toggleCell(id) {
  if (claimed.has(id)) return;

  const el = document.getElementById(id);
  if (selected.has(id)) {
    selected.delete(id);
    el.classList.remove("selected");
  } else {
    selected.add(id);
    history.push(id);
    el.classList.add("selected");
  }

  updateCounts();
}

// Build grid (use slice to avoid blocking UI)
let buildIndex = 0;
function buildGridChunk() {
  const frag = document.createDocumentFragment();
  for (let i = 0; i < 20000 && buildIndex < cols * rows; i++, buildIndex++) {
    const x = buildIndex % cols;
    const y = Math.floor(buildIndex / cols);
    const id = `${x},${y}`;
    const div = document.createElement("div");
    div.id = id;
    div.className = "cell";
    div.onclick = () => toggleCell(id);
    frag.appendChild(div);
  }
  grid.appendChild(frag);

  if (buildIndex < cols*rows) {
    requestAnimationFrame(buildGridChunk);
  }
}
buildGridChunk();

// Fetch claimed pixels
fetch("/claimed-pixels")
  .then(res => res.json())
  .then(data => {
    data.claimed.forEach(id => {
      claimed.add(id);
      document.getElementById(id)?.classList.add("claimed");
    });
    updateCounts();
  });

// Buttons
document.getElementById("undoButton").onclick = () => {
  const last = history.pop();
  if (last) {
    selected.delete(last);
    document.getElementById(last)?.classList.remove("selected");
    updateCounts();
  }
};
document.getElementById("deselectAllButton").onclick = () => {
  selected.clear();
  history.length = 0;
  document.querySelectorAll(".cell.selected").forEach(el => el.classList.remove("selected"));
  updateCounts();
};

const stripe = Stripe(STRIPE_PUBLIC_KEY);
document.getElementById("payButton").onclick = async () => {
  errorMsg.textContent = "";
  if (selected.size === 0) {
    errorMsg.textContent = "Please select at least one pixel.";
    return;
  }

  const charity = document.getElementById("charitySelect").value;
  const pixels = Array.from(selected).map(s => s.split(",").map(Number));

  try {
    const res = await fetch("/create-checkout-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pixels, charity }),
    });
    const data = await res.json();
    if (data.error) {
      errorMsg.textContent = data.error;
    } else {
      const { error: stripeError } = await stripe.redirectToCheckout({ sessionId: data.id });
      if (stripeError) errorMsg.textContent = stripeError.message;
    }
  } catch (err) {
    console.error(err);
    errorMsg.textContent = "Error initiating checkout. Try again.";
  }
};
