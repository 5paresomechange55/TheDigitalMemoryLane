const SLOT_COUNT = 5000;
const SLOT_PRICE = 50000;  // in cents ($500)
const STRIPE_PUBLIC_KEY = window.STRIPE_PUBLIC_KEY;

let selectedSlots = new Set();
let history = [];

const slotsContainer = document.getElementById('slots');
const slotCountEl = document.getElementById('slotCount');
const totalPriceEl = document.getElementById('totalPrice');
const errorMsg = document.getElementById('errorMessage');
const charitySelect = document.getElementById('charitySelect');

function updateDisplay() {
  slotCountEl.textContent = selectedSlots.size;
  totalPriceEl.textContent = (selectedSlots.size * 500).toLocaleString();
}

function createSlots() {
  for (let i = 0; i < SLOT_COUNT; i++) {
    const slot = document.createElement('div');
    slot.className = 'slot available';
    slot.dataset.id = i;
    slot.style.top = i % 2 === 0 ? '-60px' : '0';
    slot.onclick = () => toggleSlot(slot);
    slotsContainer.appendChild(slot);
  }
}

function toggleSlot(slot) {
  const id = slot.dataset.id;
  if (slot.classList.contains('claimed')) return;

  if (selectedSlots.has(id)) {
    selectedSlots.delete(id);
    slot.classList.remove('selected');
    history.pop();
  } else {
    selectedSlots.add(id);
    slot.classList.add('selected');
    history.push(id);
  }

  updateDisplay();
}

document.getElementById('undoButton').onclick = () => {
  const last = history.pop();
  if (last) {
    selectedSlots.delete(last);
    document.querySelector(`.slot[data-id="${last}"]`).classList.remove('selected');
  }
  updateDisplay();
};

document.getElementById('clearButton').onclick = () => {
  selectedSlots.forEach(id => document.querySelector(`.slot[data-id="${id}"]`).classList.remove('selected'));
  selectedSlots.clear();
  history = [];
  updateDisplay();
};

document.getElementById('payButton').onclick = async () => {
  errorMsg.textContent = '';
  if (selectedSlots.size === 0) {
    errorMsg.textContent = 'Please select a slot.';
    return;
  }

  try {
    const res = await fetch('/create-checkout-session', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        slots: Array.from(selectedSlots),
        charity: charitySelect.value,
        price: SLOT_PRICE
      })
    });

    const data = await res.json();
    if (data.error) {
      errorMsg.textContent = data.error;
      return;
    }

    const stripe = Stripe(STRIPE_PUBLIC_KEY);
    const { error } = await stripe.redirectToCheckout({ sessionId: data.id });
    if (error) errorMsg.textContent = error.message;
  } catch (e) {
    errorMsg.textContent = 'Payment initiation error';
  }
};

createSlots();
updateDisplay();
