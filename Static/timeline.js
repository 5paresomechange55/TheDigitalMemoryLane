const TOTAL_SLOTS = 5000;
const SLOT_SIZE = 64; // px
const PRICE_PER_SLOT = 50000; // $500 in cents
const timeline = document.getElementById("timeline");
const timelineLine = document.getElementById("timeline-line");
const payButton = document.getElementById("payButton");
const clearButton = document.getElementById("clearSelection");
const charityDropdown = document.getElementById("charity");

let selectedSlots = new Set();

// Utility to create each slot
function createSlot(index) {
  const slot = document.createElement("div");
  slot.className = `
    slot relative z-10 w-[${SLOT_SIZE}px] h-[${SLOT_SIZE}px] border-2 
    border-yellow-900 bg-yellow-100 text-[10px] text-center 
    flex items-center justify-center cursor-pointer 
    hover:bg-yellow-300 transition
  `;
  slot.textContent = "Click to select time slot";
  slot.dataset.id = index;

  const offset = index % 2 === 0 ? -SLOT_SIZE - 10 : SLOT_SIZE + 10;
  slot.style.transform = `translateY(${offset}px)`;
  slot.style.position = "relative";
  return slot;
}

// Inject all slots into timeline
function renderTimeline() {
  timeline.innerHTML = "";
  timeline.appendChild(timelineLine);

  for (let i = 0; i < TOTAL_SLOTS; i++) {
    const slot = createSlot(i);
    slot.addEventListener("click", () => toggleSlot(slot));
    timeline.appendChild(slot);
  }

  // Load claimed slots
  fetch("/claimed-slots")
    .then(res => res.json())
    .then(data => {
      data.forEach(slotId => {
        const claimedSlot = document.querySelector(`.slot[data-id="${slotId}"]`);
        if (claimedSlot) {
          claimedSlot.classList.add("bg-yellow-700", "text-white", "cursor-default");
          claimedSlot.textContent = "";
          claimedSlot.removeEventListener("click", () => toggleSlot(claimedSlot));
          const img = document.createElement("img");
          img.src = `/static/uploads/${slotId}.jpg`; // assumes uploaded image named after slotId
          img.className = "w-full h-full object-cover";
          claimedSlot.appendChild(img);
        }
      });
    });
}

// Toggle selection
function toggleSlot(slot) {
  const id = slot.dataset.id;
  if (selectedSlots.has(id)) {
    selectedSlots.delete(id);
    slot.classList.remove("bg-yellow-300");
    slot.textContent = "Click to select time slot";
  } else {
    selectedSlots.add(id);
    slot.classList.add("bg-yellow-300");
    slot.textContent = `Selected (#${id})`;
  }
  updatePayButton();
}

// Update pay button text
function updatePayButton() {
  const count = selectedSlots.size;
  payButton.textContent = `Pay & Upload ($${count * 500})`;
}

// Stripe checkout
payButton.addEventListener("click", () => {
  if (selectedSlots.size === 0) return alert("Select at least one slot.");

  fetch("/create-checkout-session", {
    method: "POST",
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      slots: Array.from(selectedSlots),
      price: PRICE_PER_SLOT,
      charity: charityDropdown.value
    })
  })
  .then(res => res.json())
  .then(data => {
    if (data.id) {
      const stripe = Stripe(STRIPE_PUBLIC_KEY);
      stripe.redirectToCheckout({ sessionId: data.id });
    } else {
      alert("Error creating Stripe session");
    }
  });
});

// Deselect all
clearButton.addEventListener("click", () => {
  selectedSlots.forEach(id => {
    const slot = document.querySelector(`.slot[data-id="${id}"]`);
    if (slot) {
      slot.classList.remove("bg-yellow-300");
      slot.textContent = "Click to select time slot";
    }
  });
  selectedSlots.clear();
  updatePayButton();
});

// Initial render
document.addEventListener("DOMContentLoaded", renderTimeline);
