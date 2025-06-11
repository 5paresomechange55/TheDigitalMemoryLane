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

# File paths and config
PIXELS_FILE = 'data/claimed_pixels.json'
VOTES_FILE = 'data/charity_votes.json'
UPLOAD_FOLDER = 'static/uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Ensure required folders exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs('data', exist_ok=True)

# Load claimed pixels
if os.path.exists(PIXELS_FILE):
    with open(PIXELS_FILE, 'r') as f:
        claimed_pixels = json.load(f)
else:
    claimed_pixels = {}

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

@app.route('/about')
def about():
    return render_template('about.html')

@app.route('/contact')
def contact():
    return render_template('contact.html')

@app.route('/donation')
def donation():
    return render_template('donation.html')

# adjust claimed_pixels as key="x,y"
@app.route('/claimed-pixels')
def claimed_pixels_api():
    return jsonify({'claimed': list(claimed_pixels.keys())})

@app.route('/charity-votes')
def get_charity_votes():
    return jsonify(charity_votes)

@app.route('/create-checkout-session', methods=['POST'])
def create_checkout_session():
    data = request.get_json()
    selected = data.get("pixels", [])
# convert to strings
claimed_pixels.update({f"{p[0]},{p[1]}": filename for p in selected})
    charity = data.get('charity', 'charity1')

    if not selected_pixels:
        return jsonify({'error': 'No pixels selected'}), 400

    session_id = f"session_{os.urandom(8).hex()}"
    session_data = {
        "pixels": selected_pixels,
        "charity": charity
    }

    with open(f"data/{session_id}.json", 'w') as f:
        json.dump(session_data, f)

    try:
        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price_data': {
                    'currency': 'usd',
                    'product_data': {
                        'name': 'Digital Memory Lane Pixels',
                    },
                    'unit_amount': 100,
                },
                'quantity': len(selected_pixels),
            }],
            mode='payment',
            success_url=url_for('upload', session_id=session_id, _external=True),
            cancel_url=url_for('index', _external=True),
        )
        return jsonify({'id': session.id})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/upload/<session_id>', methods=['GET', 'POST'])
def upload(session_id):
    session_file = f"data/{session_id}.json"

    if not os.path.exists(session_file):
        return "Invalid session", 400

    if request.method == 'POST':
        if 'image' not in request.files:
            return "No image uploaded", 400

        image = request.files['image']
        if image.filename == '':
            return "No selected file", 400

        if image and allowed_file(image.filename):
            filename = secure_filename(image.filename)
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            image.save(filepath)

            with open(session_file, 'r') as f:
                session_data = json.load(f)

            selected_pixels = session_data.get("pixels", [])
            charity = session_data.get("charity", "charity1")

            if selected_pixels:
                xs = [p[0] for p in selected_pixels]
                ys = [p[1] for p in selected_pixels]
                width = max(xs) - min(xs) + 1
                height = max(ys) - min(ys) + 1

                img = Image.open(filepath)
                img = img.resize((width, height))
                img.save(filepath, optimize=True, quality=85)

                for pixel in selected_pixels:
                    claimed_pixels[str(pixel)] = filename

                with open(PIXELS_FILE, 'w') as f:
                    json.dump(claimed_pixels, f)

                # Update charity vote count
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
