const stripe = Stripe('YOUR_STRIPE_PUBLIC_KEY');
const slotContainer = document.getElementById('slotContainer');
const totalCostEl = document.getElementById('totalCost');
const SLOT_COUNT = 5000;
const SLOT_SIZE = 50;
const PRICE_PER_SLOT = 50000; // cents
let selectedSlots = new Set();

async function fetchClaimed() {
  const res = await fetch('/claimed-slots');
  const data = await res.json();
  return new Set(data.claimed.map(n => parseInt(n)));
}

function updateCost() {
  const cost = (selectedSlots.size * PRICE_PER_SLOT) / 100;
  totalCostEl.innerText = `$${cost}`;
}

async function renderSlots() {
  const claimed = await fetchClaimed();
  for (let i = 0; i < SLOT_COUNT; i++) {
    const slot = document.createElement('div');
    slot.className = 'slot';
    slot.dataset.idx = i;
    slot.style.left = `${i * (SLOT_SIZE + 5)}px`;

    if (claimed.has(i)) {
      slot.classList.add('claimed');
      const img = document.createElement('img');
      img.src = `/static/uploads/${i}.jpg`;
      slot.appendChild(img);
    } else {
      slot.innerText = 'click to select\ntime slot';
      slot.addEventListener('click', () => {
        if (selectedSlots.has(i)) {
          selectedSlots.delete(i);
          slot.classList.remove('selected');
        } else {
          selectedSlots.add(i);
          slot.classList.add('selected');
        }
        updateCost();
      });
    }
    slotContainer.appendChild(slot);
  }
}

document.getElementById('payButton').addEventListener('click', async () => {
  if (selectedSlots.size === 0) return alert('Select at least one slot.');

  const res = await fetch('/create-checkout-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      slots: [...selectedSlots],
      charity: document.getElementById('charity').value,
      price: PRICE_PER_SLOT
    })
  });

  const data = await res.json();
  if (data.id) {
    stripe.redirectToCheckout({ sessionId: data.id });
  } else {
    alert('Checkout error.');
  }
});

renderSlots();
