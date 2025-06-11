console.log("Timeline lane loaded");

const slots = [];
const history = [];
let selectedCount = 0;

const timeline = document.getElementById("timeline");
const addSlotBtn = document.getElementById("addSlot");
const payBtn = document.getElementById("payButton");
const undoBtn = document.getElementById("undoButton");
const clearBtn = document.getElementById("deselectAllButton");
const charitySel = document.getElementById("charitySelect");
const errorMsg = document.getElementById("errorMessage");

function createCard(id, imageUrl) {
  const div = document.createElement("div");
  div.className = imageUrl ? "card claimed" : "card empty";
  div.dataset.id = id;
  div.innerHTML = imageUrl
    ? `<img src="${imageUrl}" alt="Memory">`
    : `<span>+ Slot</span>`;
  div.onclick = () => {
    if (imageUrl) return;
    if (div.classList.contains("selected")) {
      div.classList.remove("selected");
      selectedCount--;
    } else {
      div.classList.add("selected");
      history.push(div);
      selectedCount++;
    }
    updateControls();
  };
  return div;
}

function updateControls() {
  payBtn.textContent = `Pay & Claim Slots ($${selectedCount})`;
}

function loadSlots() {
  fetch("/timeline-slots")
    .then(r => r.json())
    .then(data => {
      timeline.innerHTML = "";
      data.slots.forEach(slot => {
        timeline.appendChild(createCard(slot.id, slot.image));
      });
    });
}

addSlotBtn.onclick = () => {
  const id = `new-${Date.now()}`;
  const card = createCard(id, null);
  card.classList.add("selected");
  timeline.appendChild(card);
  history.push(card);
  selectedCount++;
  updateControls();
};

undoBtn.onclick = () => {
  const last = history.pop();
  if (last) {
    last.classList.remove("selected");
    selectedCount--;
    updateControls();
  }
};

clearBtn.onclick = () => {
  timeline.querySelectorAll(".selected").forEach(el => el.classList.remove("selected"));
  history.length = 0;
  selectedCount = 0;
  updateControls();
};

payBtn.onclick = async () => {
  errorMsg.textContent = "";
  if (selectedCount === 0) {
    errorMsg.textContent = "Select at least one slot";
    return;
  }

  const charity = charitySel.value;
  const chosen = Array.from(timeline.querySelectorAll(".selected")).map(el => el.dataset.id);

  try {
    const res = await fetch("/create-checkout-session", {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ slots: chosen, charity })
    });
    const data = await res.json();
    if (data.error) errorMsg.textContent = data.error;
    else Stripe(window.STRIPE_PUBLIC_KEY).redirectToCheckout({ sessionId: data.id });
  } catch (e) {
    errorMsg.textContent = "Error starting checkout";
  }
};

// Initial load
loadSlots();
