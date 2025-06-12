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
CLAIMED_FILE = 'data/claimed_slots.json'
VOTES_FILE = 'data/charity_votes.json'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs('data', exist_ok=True)

# Load or initialize claimed slots
if os.path.exists(CLAIMED_FILE):
    with open(CLAIMED_FILE, 'r') as f:
        claimed_slots = json.load(f)
else:
    claimed_slots = {}

# Load or initialize charity votes
if os.path.exists(VOTES_FILE):
    with open(VOTES_FILE, 'r') as f:
        charity_votes = json.load(f)
else:
    charity_votes = {f"charity{i}": 0 for i in range(1, 5)}

@app.route('/')
def index():
    return render_template('index.html', stripe_public_key=os.getenv("STRIPE_PUBLISHABLE_KEY"))

@app.route('/claimed-slots')
def get_claimed_slots():
    # Return { slot_id: image_path }
    return jsonify(claimed_slots)

@app.route('/charity-votes')
def get_charity_votes():
    return jsonify(charity_votes)

@app.route('/create-checkout-session', methods=['POST'])
def create_checkout_session():
    data = request.get_json()
    slots = data.get('slots', [])
    charity = data.get('charity', 'charity1')
    price_each = data.get('price', 50000)

    if not slots:
        return jsonify({'error': 'No slots selected'}), 400

    session_id = f"session_{os.urandom(8).hex()}"
    session_file = f"data/{session_id}.json"

    with open(session_file, 'w') as f:
        json.dump({"slots": slots, "charity": charity}, f)

    session = stripe.checkout.Session.create(
        payment_method_types=['card'],
        line_items=[{
            'price_data': {
                'currency': 'usd',
                'unit_amount': price_each,
                'product_data': {'name': 'Timeline Memory Slot'},
            },
            'quantity': len(slots)
        }],
        mode='payment',
        success_url=url_for('upload', session_id=session_id, _external=True),
        cancel_url=url_for('index', _external=True)
    )

    return jsonify({'id': session.id})

@app.route('/upload/<session_id>', methods=['GET', 'POST'])
def upload(session_id):
    session_path = f"data/{session_id}.json"
    if not os.path.exists(session_path):
        return "Invalid session", 400

    if request.method == 'POST':
        if 'image' not in request.files:
            return "No image uploaded", 400

        image = request.files['image']
        if image.filename == '':
            return "No selected file", 400

        if image and allowed_file(image.filename):
            filename = secure_filename(f"{session_id}_{image.filename}")
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            image.save(filepath)

            with open(session_path, 'r') as f:
                session_data = json.load(f)

            slots = session_data.get("slots", [])
            charity = session_data.get("charity", "charity1")

            # Assign image to all slots
            for slot_id in slots:
                claimed_slots[str(slot_id)] = f"/static/uploads/{filename}"

            with open(CLAIMED_FILE, 'w') as f:
                json.dump(claimed_slots, f)

            # Count charity vote
            charity_votes[charity] = charity_votes.get(charity, 0) + 1
            with open(VOTES_FILE, 'w') as f:
                json.dump(charity_votes, f)

            os.remove(session_path)
            return redirect(url_for('index'))

    return render_template('upload.html', session_id=session_id)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

if __name__ == '__main__':
    app.run(debug=True)
