import os
import json
from flask import Flask, render_template, request, jsonify, redirect, url_for
from flask_cors import CORS
from werkzeug.utils import secure_filename
from PIL import Image
from dotenv import load_dotenv
import stripe

load_dotenv()
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

app = Flask(__name__)
CORS(app)

# Config
UPLOAD_FOLDER = 'static/uploads'
SLOTS_FILE = 'data/claimed_slots.json'
VOTES_FILE = 'data/charity_votes.json'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs('data', exist_ok=True)

# Load data
if os.path.exists(SLOTS_FILE):
    with open(SLOTS_FILE) as f:
        claimed_slots = json.load(f)
else:
    claimed_slots = {}

if os.path.exists(VOTES_FILE):
    with open(VOTES_FILE) as f:
        charity_votes = json.load(f)
else:
    charity_votes = {f'charity{i}': 0 for i in range(1, 5)}

@app.route('/')
def index():
    return render_template('index.html', stripe_public_key=os.getenv("STRIPE_PUBLISHABLE_KEY"))

@app.route('/about')
def about():
    return "About Page"

@app.route('/contact')
def contact():
    return "Contact Page"

@app.route('/donation')
def donation():
    return jsonify(charity_votes)

@app.route('/claimed-slots')
def claimed():
    return jsonify({"claimed": list(claimed_slots.keys())})

@app.route('/create-checkout-session', methods=['POST'])
def create_checkout():
    data = request.get_json()
    slot = data['slots'][0]
    charity = data['charity']
    session_id = f"slot_{slot}_{os.urandom(4).hex()}"

    with open(f"data/{session_id}.json", 'w') as f:
        json.dump({"slot": slot, "charity": charity}, f)

    session = stripe.checkout.Session.create(
        payment_method_types=['card'],
        line_items=[{
            'price_data': {
                'currency': 'usd',
                'unit_amount': data['price'],
                'product_data': {'name': f'Timeline Slot #{slot}'},
            },
            'quantity': 1
        }],
        mode='payment',
        success_url=url_for('upload', session_id=session_id, _external=True),
        cancel_url=url_for('index', _external=True),
    )
    return jsonify({'id': session.id})

@app.route('/upload/<session_id>', methods=['GET', 'POST'])
def upload(session_id):
    session_path = f"data/{session_id}.json"
    if not os.path.exists(session_path):
        return "Invalid session ID", 400

    with open(session_path) as f:
        session_data = json.load(f)

    slot = session_data["slot"]
    charity = session_data["charity"]

    if request.method == 'POST':
        if 'image' not in request.files:
            return "No image uploaded", 400
        image = request.files['image']
        if image.filename == '':
            return "No selected file", 400
        if image and allowed_file(image.filename):
            filename = f"{slot}.jpg"
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            img = Image.open(image)
            img = img.resize((50, 50))
            img.save(filepath, format="JPEG", quality=85)

            claimed_slots[str(slot)] = filename
            with open(SLOTS_FILE, 'w') as f:
                json.dump(claimed_slots, f)

            charity_votes[charity] += 1
            with open(VOTES_FILE, 'w') as f:
                json.dump(charity_votes, f)

            os.remove(session_path)
            return redirect(url_for('index'))

    return render_template('upload.html', session_id=session_id)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

if __name__ == '__main__':
    app.run(debug=True)
