const slotContainer = document.getElementById('slotContainer');
const stripe = Stripe('YOUR_STRIPE_PUBLISHABLE_KEY'); // Will be injected by Flask
let selectedSlot = null;
let claimedSlots = new Set();

const SLOT_SIZE = 50;
const SLOT_COUNT = 5000;
const SLOT_PRICE = 50000; // in cents

// Fetch claimed slots
fetch('/claimed-slots')
  .then(res => res.json())
  .then(data => {
    data.claimed.forEach(slot => claimedSlots.add(parseInt(slot)));
    renderSlots();
  });

function renderSlots() {
  for (let i = 0; i < SLOT_COUNT; i++) {
    const slot = document.createElement('div');
    slot.className = 'slot';
    slot.dataset.slot = i;

    const x = i * SLOT_SIZE;
    const y = i % 2 === 0 ? 75 : 175;

    slot.style.left = `${x}px`;
    slot.style.top = `${y}px`;

    if (claimedSlots.has(i)) {
      slot.classList.add('claimed');
      const img = document.createElement('img');
      img.src = `/static/uploads/${i}.jpg`; // Expected slot image file
      slot.appendChild(img);
    } else {
      slot.addEventListener('click', () => {
        if (selectedSlot !== null) {
          document.querySelector(`[data-slot="${selectedSlot}"]`).classList.remove('bg-green-400');
        }
        selectedSlot = i;
        slot.classList.add('bg-green-400');
      });
    }

    slotContainer.appendChild(slot);
  }
}

document.getElementById('payButton').addEventListener('click', () => {
  if (selectedSlot === null) {
    alert('Please select a slot to continue.');
    return;
  }

  const charity = document.getElementById('charity').value;

  fetch('/create-checkout-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      slots: [selectedSlot],
      charity: charity,
      price: SLOT_PRICE
    })
  })
  .then(res => res.json())
  .then(data => {
    return stripe.redirectToCheckout({ sessionId: data.id });
  });
});
