import os
import json
from flask import Flask, render_template, request, jsonify, redirect, url_for
from flask_cors import CORS
from werkzeug.utils import secure_filename
from PIL import Image
from dotenv import load_dotenv
import stripe

# Load environment variables
load_dotenv()
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = 'static/uploads'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

PIXELS_FILE = 'data/claimed_slots.json'
VOTES_FILE = 'data/charity_votes.json'
os.makedirs('data', exist_ok=True)
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Load claimed slots
if os.path.exists(PIXELS_FILE):
    with open(PIXELS_FILE, 'r') as f:
        claimed_slots = json.load(f)
else:
    claimed_slots = {}

# Load charity votes
if os.path.exists(VOTES_FILE):
    with open(VOTES_FILE, 'r') as f:
        charity_votes = json.load(f)
else:
    charity_votes = {
        "charity1": 0,
        "charity2": 0,
        "charity3": 0,
        "charity4": 0
    }

@app.route('/')
def index():
    return render_template('index.html', stripe_public_key=os.getenv("STRIPE_PUBLISHABLE_KEY"))

@app.route('/upload/<session_id>', methods=['GET', 'POST'])
def upload(session_id):
    session_file = f"data/{session_id}.json"
    if not os.path.exists(session_file):
        return "Invalid session ID", 400

    if request.method == 'POST':
        images = request.files.getlist('images')
        with open(session_file, 'r') as f:
            session_data = json.load(f)

        selected_slots = session_data.get('slots', [])
        charity = session_data.get('charity', 'charity1')

        if len(images) != len(selected_slots):
            return "You must upload one image per slot", 400

        for i, slot_id in enumerate(selected_slots):
            image = images[i]
            if image and allowed_file(image.filename):
                filename = secure_filename(f"{slot_id}_{image.filename}")
                filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                image.save(filepath)
                claimed_slots[slot_id] = filename

        with open(PIXELS_FILE, 'w') as f:
            json.dump(claimed_slots, f)

        charity_votes[charity] = charity_votes.get(charity, 0) + len(selected_slots)
        with open(VOTES_FILE, 'w') as f:
            json.dump(charity_votes, f)

        os.remove(session_file)
        return redirect(url_for('index'))

    return render_template('upload.html', session_id=session_id)

@app.route('/create-checkout-session', methods=['POST'])
def create_checkout_session():
    data = request.get_json()
    selected = data.get("slots", [])
    charity = data.get("charity", "charity1")
    price_each = 50000  # in cents
    quantity = len(selected)

    if quantity == 0:
        return jsonify({'error': 'No slots selected'}), 400

    session_id = f"session_{os.urandom(8).hex()}"
    session_data = {
        "slots": selected,
        "charity": charity
    }
    with open(f"data/{session_id}.json", 'w') as f:
        json.dump(session_data, f)

    session = stripe.checkout.Session.create(
        payment_method_types=['card'],
        line_items=[{
            'price_data': {
                'currency': 'usd',
                'unit_amount': price_each,
                'product_data': {
                    'name': 'Memory Timeline Slot'
                }
            },
            'quantity': quantity
        }],
        mode='payment',
        success_url=url_for('upload', session_id=session_id, _external=True),
        cancel_url=url_for('index', _external=True)
    )

    return jsonify({'id': session.id})

@app.route('/claimed-slots')
def claimed_slots_route():
    return jsonify(claimed_slots)

@app.route('/charity-votes')
def get_charity_votes():
    return jsonify(charity_votes)

@app.route('/about')
def about():
    return render_template('about.html')

@app.route('/contact')
def contact():
    return render_template('contact.html')

@app.route('/donation')
def donation():
    return render_template('donation.html')

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

if __name__ == '__main__':
    app.run(debug=True)
