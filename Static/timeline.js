const stripe = Stripe('YOUR_STRIPE_PUBLISHABLE_KEY');
const container = document.getElementById('slotContainer');
const totalCostEl = document.getElementById('totalCost');
const SLOT_COUNT = 500;
const SLOT_WIDTH = 60; // slot + spacing
let selected = new Set();
const PRICE_PER_SLOT = 50000; // cents

async function loadClaimed() {
  const resp = await fetch('/claimed-slots');
  const data = await resp.json();
  return new Set(data.claimed.map(n => parseInt(n)));
}

function updateCost() {
  const cost = (selected.size * PRICE_PER_SLOT) / 100;
  totalCostEl.innerText = `$${cost}`;
}

async function renderSlots() {
  const claimed = await loadClaimed();
  container.style.width = `${SLOT_COUNT * SLOT_WIDTH}px`;

  for (let i = 0; i < SLOT_COUNT; i++) {
    const slot = document.createElement('div');
    slot.className = 'slot';
    slot.dataset.idx = i;
    slot.style.left = `${i * SLOT_WIDTH}px`;
    slot.style.top = (i % 2 === 0 ? 20 : 120) + 'px';

    if (claimed.has(i)) {
      slot.classList.add('claimed');
      const img = document.createElement('img');
      img.src = `/static/uploads/${i}.jpg?${Date.now()}`;
      slot.appendChild(img);
    } else {
      slot.innerText = 'Click to\nselect';
      slot.addEventListener('click', () => {
        if (selected.has(i)) {
          selected.delete(i);
          slot.classList.remove('selected');
        } else {
          selected.add(i);
          slot.classList.add('selected');
        }
        updateCost();
      });
    }

    container.appendChild(slot);
  }
}

document.getElementById('payButton').addEventListener('click', async () => {
  if (selected.size === 0) return alert('Choose at least one slot.');

  const charity = document.getElementById('charity').value;
  const resp = await fetch('/create-checkout-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      slots: Array.from(selected),
      charity: charity,
      price: PRICE_PER_SLOT
    })
  });
  const data = await resp.json();
  if (data.id) stripe.redirectToCheckout({ sessionId: data.id });
  else alert('Error creating checkout.');
});

renderSlots();
