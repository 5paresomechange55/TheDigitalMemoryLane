import os
import json
from flask import Flask, render_template, request, jsonify, redirect, url_for
from werkzeug.utils import secure_filename
from flask_cors import CORS
from dotenv import load_dotenv
from PIL import Image
import stripe

# Load .env variables
load_dotenv()
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

app = Flask(__name__)
CORS(app)

# Configuration
UPLOAD_FOLDER = 'static/uploads'
PIXELS_FILE = 'data/claimed_slots.json'
VOTES_FILE = 'data/charity_votes.json'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Ensure folders
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs('data', exist_ok=True)

# Load or initialize slot and vote data
claimed_slots = {}
if os.path.exists(PIXELS_FILE):
    with open(PIXELS_FILE, 'r') as f:
        claimed_slots = json.load(f)

charity_votes = {"charity1": 0, "charity2": 0, "charity3": 0, "charity4": 0}
if os.path.exists(VOTES_FILE):
    with open(VOTES_FILE, 'r') as f:
        charity_votes = json.load(f)

@app.route('/')
def index():
    return render_template('index.html', STRIPE_PUBLIC_KEY=os.getenv("STRIPE_PUBLISHABLE_KEY"))

@app.route('/about')
def about():
    return render_template('about.html')

@app.route('/contact')
def contact():
    return render_template('contact.html')

@app.route('/donation')
def donation():
    return render_template('donation.html')

@app.route('/claimed-slots')
def claimed():
    return jsonify(list(claimed_slots.keys()))

@app.route('/create-checkout-session', methods=['POST'])
def create_checkout_session():
    data = request.get_json()
    slots = data.get('slots', [])
    charity = data.get('charity', 'charity1')
    price_each = data.get('price', 50000)

    if not slots:
        return jsonify({'error': 'No slots selected'}), 400

    session_id = os.urandom(8).hex()
    session = stripe.checkout.Session.create(
        payment_method_types=['card'],
        line_items=[{
            'price_data': {
                'currency': 'usd',
                'unit_amount': price_each,
                'product_data': {'name': 'Timeline Slot Memory'},
            },
            'quantity': len(slots),
        }],
        mode='payment',
        success_url=url_for('upload', session_id=session_id, _external=True),
        cancel_url=url_for('index', _external=True),
    )

    # Store pending session
    with open(f"data/{session_id}.json", 'w') as f:
        json.dump({"slots": slots, "charity": charity}, f)

    return jsonify({'id': session.id})

@app.route('/upload/<session_id>', methods=['GET', 'POST'])
def upload(session_id):
    session_file = f"data/{session_id}.json"
    if not os.path.exists(session_file):
        return "Invalid session", 400

    if request.method == 'POST':
        images = request.files.getlist('images')
        with open(session_file, 'r') as f:
            session_data = json.load(f)

        slots = session_data["slots"]
        charity = session_data["charity"]

        if len(images) != len(slots):
            return "Image count does not match slot count", 400

        for i, slot in enumerate(slots):
            image = images[i]
            if image and allowed_file(image.filename):
                ext = image.filename.rsplit('.', 1)[1].lower()
                filename = f"{slot}.{ext}"
                path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                image = Image.open(image)
                image = image.resize((50, 50))
                image.save(path, optimize=True, quality=85)
                claimed_slots[slot] = filename

        with open(PIXELS_FILE, 'w') as f:
            json.dump(claimed_slots, f)

        charity_votes[charity] = charity_votes.get(charity, 0) + 1
        with open(VOTES_FILE, 'w') as f:
            json.dump(charity_votes, f)

        os.remove(session_file)
        return redirect(url_for('index'))

    return render_template('upload.html', session_id=session_id)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

if __name__ == '__main__':
    app.run(debug=True)
