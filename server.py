import os
from flask import Flask, render_template, request, jsonify, send_from_directory, redirect
from flask_cors import CORS
import stripe
import json
from PIL import Image
from werkzeug.utils import secure_filename

app = Flask(__name__)
CORS(app)

# Stripe setup
stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "sk_test_...")
YOUR_DOMAIN = os.getenv("YOUR_DOMAIN", "http://localhost:5000")

# State
CLAIMED_PIXELS_FILE = "claimed_pixels.json"
VOTES_FILE = "charity_votes.json"
UPLOAD_FOLDER = "uploads"
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}

# Ensure directories and files exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
if not os.path.exists(CLAIMED_PIXELS_FILE):
    with open(CLAIMED_PIXELS_FILE, 'w') as f:
        json.dump([], f)
if not os.path.exists(VOTES_FILE):
    with open(VOTES_FILE, 'w') as f:
        json.dump({"Charity A": 0, "Charity B": 0, "Charity C": 0, "Charity D": 0}, f)

def load_claimed():
    with open(CLAIMED_PIXELS_FILE, 'r') as f:
        return json.load(f)

def save_claimed(pixels):
    with open(CLAIMED_PIXELS_FILE, 'w') as f:
        json.dump(pixels, f)

def load_votes():
    with open(VOTES_FILE, 'r') as f:
        return json.load(f)

def save_votes(votes):
    with open(VOTES_FILE, 'w') as f:
        json.dump(votes, f)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/about')
def about():
    return render_template('about.html')

@app.route('/contact')
def contact():
    return render_template('contact.html')

@app.route('/donation')
def donation():
    return render_template('donation.html')

@app.route('/upload', methods=['GET', 'POST'])
def upload():
    if request.method == 'POST':
        pixels = request.form.getlist('pixels[]')
        file = request.files.get('image')
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            filepath = os.path.join(UPLOAD_FOLDER, filename)
            file.save(filepath)

            img = Image.open(filepath)
            img = img.convert('RGB')
            width = max(10, len(pixels)) * 10
            img = img.resize((width, 10))
            img.save(filepath)

            claimed = load_claimed()
            claimed.extend(pixels)
            save_claimed(list(set(claimed)))

            return redirect('/')
    else:
        pixels = request.args.getlist('pixels')
        return render_template('upload.html', pixels=pixels)

@app.route('/claimed')
def claimed():
    claimed = load_claimed()
    return jsonify({"claimed": claimed})

@app.route('/votes')
def votes():
    return jsonify(load_votes())

@app.route('/create-checkout-session', methods=['POST'])
def create_checkout_session():
    data = request.get_json()
    pixels = data.get("pixels", [])
    charity = data.get("charity", "None")
    price = len(pixels)

    if not pixels:
        return jsonify({'error': 'No pixels selected'}), 400

    # Save charity vote temporarily
    votes = load_votes()
    if charity in votes:
        votes[charity] += len(pixels)
    save_votes(votes)

    session = stripe.checkout.Session.create(
        payment_method_types=['card'],
        line_items=[{
            'price_data': {
                'currency': 'usd',
                'product_data': {
                    'name': f'{len(pixels)} Digital Memory Pixels',
                },
                'unit_amount': 100,
            },
            'quantity': len(pixels),
        }],
        mode='payment',
        success_url=f"{YOUR_DOMAIN}/upload?pixels=" + ','.join(pixels),
        cancel_url=f"{YOUR_DOMAIN}/",
    )

    return jsonify({'sessionId': session.id, 'publicKey': os.getenv("STRIPE_PUBLISHABLE_KEY", "pk_test_...")})

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)

if __name__ == '__main__':
    app.run(debug=True)
