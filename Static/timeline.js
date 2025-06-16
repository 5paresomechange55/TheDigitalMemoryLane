document.addEventListener('DOMContentLoaded', () => {
  const timeline = document.getElementById('timeline');
  const payButton = document.getElementById('payButton');
  const charitySelect = document.getElementById('charitySelect');

  const TOTAL_SLOTS = 5000;
  const selectedSlots = new Set();

  // Create slots
  for (let i = 0; i < TOTAL_SLOTS; i++) {
    const slot = document.createElement('div');
    slot.classList.add('slot');
    slot.dataset.slotId = i;

    slot.innerText = "Click to select\ntime slot";
    slot.style.whiteSpace = "pre-line";

    // Alternate position: top or bottom
    slot.style.alignSelf = (i % 2 === 0) ? "flex-start" : "flex-end";

    // Add event listener
    slot.addEventListener('click', () => {
      if (slot.classList.contains('selected')) {
        slot.classList.remove('selected');
        selectedSlots.delete(i);
      } else {
        slot.classList.add('selected');
        selectedSlots.add(i);
      }
    });

    timeline.appendChild(slot);
  }

  // Handle Stripe Checkout
  payButton.addEventListener('click', async () => {
    if (selectedSlots.size === 0) {
      alert('Please select at least one time slot.');
      return;
    }

    const selectedArray = Array.from(selectedSlots);
    const charity = charitySelect.value;

    try {
      const response = await fetch('/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slots: selectedArray,
          charity: charity,
          price: 50000, // $500.00 per slot
        }),
      });

      const data = await response.json();

      if (data.id) {
        const stripe = Stripe(data.publicKey || '<YOUR_PUBLISHABLE_KEY>');
        stripe.redirectToCheckout({ sessionId: data.id });
      } else {
        alert('Error starting checkout. Please try again.');
      }
    } catch (err) {
      console.error(err);
      alert('Checkout failed.');
    }
  });

  // Pre-fill claimed slots
  fetch('/claimed-slots')
    .then(res => res.json())
    .then(claimed => {
      claimed.forEach(slot => {
        const el = document.querySelector(`[data-slot-id="${slot.id}"]`);
        if (el) {
          if (slot.image) {
            const img = document.createElement('img');
            img.src = slot.image;
            img.alt = "Uploaded memory";
            img.className = "w-full h-full object-cover";
            el.innerHTML = '';
            el.appendChild(img);
          } else {
            el.classList.add('bg-gray-600');
            el.innerText = "Claimed";
          }
          el.classList.remove('slot');
          el.classList.remove('selected');
          el.style.pointerEvents = 'none';
        }
      });
    });
});
