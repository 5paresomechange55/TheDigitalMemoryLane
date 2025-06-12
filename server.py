import os, json
from flask import Flask, render_template, request, jsonify, redirect, url_for
from flask_cors import CORS
from werkzeug.utils import secure_filename
from dotenv import load_dotenv
from PIL import Image
import stripe

load_dotenv()
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = 'static/uploads'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}
PIXELS_FILE = 'data/claimed_slots.json'
VOTES_FILE = 'data/charity_votes.json'

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs('data', exist_ok=True)

# Load state
claimed_slots = json.load(open(PIXELS_FILE)) if os.path.exists(PIXELS_FILE) else {}
charity_votes = json.load(open(VOTES_FILE)) if os.path.exists(VOTES_FILE) else {
    "charity1": 0, "charity2": 0, "charity3": 0, "charity4": 0
}

@app.route('/')
def index():
    return render_template('index.html', stripe_public_key=os.getenv("STRIPE_PUBLISHABLE_KEY"))

@app.route('/upload/<session_id>', methods=['GET', 'POST'])
def upload(session_id):
    session_file = f"data/{session_id}.json"
    if not os.path.exists(session_file):
        return "Invalid session", 400

    if request.method == 'POST':
        file = request.files.get('image')
        if file and '.' in file.filename and file.filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS:
            filename = secure_filename(file.filename)
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(filepath)

            with open(session_file) as f:
                data = json.load(f)

            for slot_id in data['slots']:
                claimed_slots[str(slot_id)] = filename

            with open(PIXELS_FILE, 'w') as f:
                json.dump(claimed_slots, f)

            charity = data['charity']
            charity_votes[charity] += 1
            with open(VOTES_FILE, 'w') as f:
                json.dump(charity_votes, f)

            os.remove(session_file)
            return redirect(url_for('index'))
    return render_template('upload.html', session_id=session_id)

@app.route('/create-checkout-session', methods=['POST'])
def create_checkout_session():
    data = request.get_json()
    slots = data.get('slots', [])
    charity = data.get('charity', 'charity1')
    session_id = f"session_{os.urandom(8).hex()}"
    session_data = {'slots': slots, 'charity': charity}

    with open(f"data/{session_id}.json", 'w') as f:
        json.dump(session_data, f)

    checkout = stripe.checkout.Session.create(
        payment_method_types=['card'],
        line_items=[{
            'price_data': {
                'currency': 'usd',
                'unit_amount': 50000,
                'product_data': {'name': 'Memory Slot'}
            },
            'quantity': len(slots)
        }],
        mode='payment',
        success_url=url_for('upload', session_id=session_id, _external=True),
        cancel_url=url_for('index', _external=True)
    )
    return jsonify({'id': checkout.id})

@app.route('/claimed-slots')
def claimed_slots_route():
    return jsonify(claimed_slots)

@app.route('/donation')
def donation():
    return render_template('donation.html')

@app.route('/about')
def about():
    return render_template('about.html')

@app.route('/contact')
def contact():
    return render_template('contact.html')

if __name__ == '__main__':
    app.run(debug=True)
