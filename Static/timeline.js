console.log("🎞️ timeline.js loaded");

const stripe = Stripe('YOUR_STRIPE_PUBLISHABLE_KEY');
const container = document.getElementById('slotContainer');
console.log("slotContainer:", container);

const SLOT_COUNT = 200;
const SLOT_WIDTH = 60;
const PRICE = 50000;
let selected = new Set();

async function loadClaimed() {
  console.log("Fetching claimed slots...");
  const res = await fetch('/claimed-slots');
  const js = await res.json();
  console.log("Claimed response:", js);
  return new Set(js.claimed.map(n => parseInt(n)));
}

function updateCost() {
  const total = (selected.size * PRICE) / 100;
  document.getElementById('totalCost').innerText = `$${total}`;
}

async function renderSlots() {
  if (!container) return console.error("slotContainer is missing!");
  const claimed = await loadClaimed();
  const totalWidth = SLOT_COUNT * SLOT_WIDTH;
  container.style.minWidth = totalWidth + 'px';

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
      slot.innerText = 'Select';
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
  console.log("Rendered slots:", container.children.length);
}

document.getElementById('payButton').onclick = () => renderSlots();

renderSlots();
