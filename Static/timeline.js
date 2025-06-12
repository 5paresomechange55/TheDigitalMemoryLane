const totalSlots = 5000;
const timeline = document.getElementById("timeline");
const selectedSlots = new Set();
const stripe = Stripe("pk_test_51RTDqT2c0Glb9QyZNKJzKHIZMfZXmAHBPzFVyxhz22a2cPmsOmzEswfHCYsd68z8HXbeASNV8fI0zoRr3SCSIjTC005jaokCP9");

function renderTimeline(claimed = {}) {
  timeline.innerHTML = '';
  for (let i = 0; i < totalSlots; i++) {
    const slot = document.createElement("div");
    slot.classList.add("slot");
    slot.dataset.id = i;

    if (claimed[i]) {
      slot.classList.add("claimed");
      const img = document.createElement("img");
      img.src = claimed[i];
      slot.appendChild(img);
    } else {
      slot.addEventListener("click", () => {
        if (selectedSlots.has(i)) {
          selectedSlots.delete(i);
          slot.classList.remove("selected");
        } else {
          selectedSlots.add(i);
          slot.classList.add("selected");
        }
      });
    }

    timeline.appendChild(slot);
  }
}

document.getElementById("payButton").addEventListener("click", async () => {
  const charity = document.getElementById("charity").value;
  if (selectedSlots.size === 0) {
    alert("Select at least one slot.");
    return;
  }

  const res = await fetch("/create-checkout-session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      slots: Array.from(selectedSlots),
      charity,
      price: 50000
    })
  });

  const data = await res.json();
  if (data.id) {
    stripe.redirectToCheckout({ sessionId: data.id });
  } else {
    alert("Checkout failed.");
  }
});

async function fetchClaimed() {
  const res = await fetch("/claimed-slots");
  const claimed = await res.json();
  renderTimeline(claimed);
}

fetchClaimed();
