let selectedPixels = new Set();

const canvas = document.getElementById('pixelCanvas');
const ctx = canvas.getContext('2d');
const pixelCountEl = document.getElementById('pixelCount');
const totalPriceEl = document.getElementById('totalPrice');
const payButton = document.getElementById('payButton');
const charitySelect = document.getElementById('charitySelect');

canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = Math.floor((e.clientX - rect.left));
  const y = Math.floor((e.clientY - rect.top));
  const key = `${x},${y}`;

  if (selectedPixels.has(key)) {
    selectedPixels.delete(key);
    ctx.clearRect(x, y, 1, 1);
  } else {
    selectedPixels.add(key);
    ctx.fillStyle = '#ff69b4';
    ctx.fillRect(x, y, 1, 1);
  }

  pixelCountEl.textContent = selectedPixels.size;
  totalPriceEl.textContent = selectedPixels.size * 1;
});

payButton.addEventListener('click', async () => {
  const pixels = Array.from(selectedPixels);
  const charity = charitySelect.value;

  if (pixels.length === 0) {
    document.getElementById('errorMessage').textContent = 'Please select at least one pixel.';
    return;
  }

  const response = await fetch('/create-checkout-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pixels, charity })
  });

  const session = await response.json();
  const stripe = Stripe(session.publicKey);
  await stripe.redirectToCheckout({ sessionId: session.id });
});
