const totalSlots = 5000;
const timelineContainer = document.getElementById('timeline-container');
const stripe = Stripe('pk_test_...'); // replace with your actual public key
let selectedSlots = [];

function createSlot(id, above = true) {
  const slot = document.createElement('div');
  slot.className = 'slot';
  slot.textContent = 'click to select time slot';
  slot.dataset.id = id;
  slot.style.position = 'relative';
  slot.style.top = above ? '-60px' : '60px';

  slot.addEventListener('click', () => {
    slot.classList.toggle('selected');
    const index = selectedSlots.indexOf(id);
    if (index > -1) {
      selectedSlots.splice(index, 1);
    } else {
      selectedSlots.push(id);
    }
  });

  return slot;
}

fetch('/claimed-slots')
  .then(res => res.json())
  .then(claimed => {
    for (let i = 0; i < totalSlots; i++) {
      if (claimed[i]) {
        const img = document.createElement('img');
        img.src = `/static/uploads/${claimed[i]}`;
        img.className = 'slot';
        timelineContainer.appendChild(img);
      } else {
        const slot = createSlot(i, i % 2 === 0);
        timelineContainer.appendChild(slot);
      }
    }
  });

document.getElementById('pay-button').addEventListener('click', () => {
  const charity = document.getElementById('charity').value;
  fetch('/create-checkout-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      slots: selectedSlots,
      charity: charity,
      price: 50000
    })
  })
    .then(res => res.json())
    .then(data => stripe.redirectToCheckout({ sessionId: data.id }))
    .catch(console.error);
});
