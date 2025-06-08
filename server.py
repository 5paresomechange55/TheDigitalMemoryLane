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

# File paths
PIXELS_FILE = 'data/claimed_pixels.json'
UPLOAD_FOLDER = 'static/uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Ensure folders exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs('data', exist_ok=True)

# Load claimed pixels
if os.path.exists(PIXELS_FILE):
    with open(PIXELS_FILE, 'r') as f:
        claimed_pixels = json.load(f)
else:
    claimed_pixels = {}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/about')
def about():
    return render_template('about.html')

@app.route('/contact')
def contact():
    return render_template('contact.html')

@app.route('/get-claimed-pixels')
def get_claimed_pixels():
    return jsonify(claimed_pixels)

@app.route('/create-checkout-session', methods=['POST'])
def create_checkout_session():
    data = request.get_json()
    selected_pixels = data.get('pixels', [])

    if not selected_pixels:
        return jsonify({'error': 'No pixels selected'}), 400

    # Store selected pixels in a temporary session file
    session_id = f"session_{os.urandom(8).hex()}"
    with open(f"data/{session_id}.json", 'w') as f:
        json.dump(selected_pixels, f)

    try:
        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price_data': {
                    'currency': 'usd',
                    'product_data': {
                        'name': 'Digital Memory Lane Pixels',
                    },
                    'unit_amount': 100,  # $1 per pixel
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
    pixel_file = f"data/{session_id}.json"

    if not os.path.exists(pixel_file):
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

            # Resize image to fit selected pixels
            with open(pixel_file, 'r') as f:
                selected_pixels = json.load(f)

            width = max(p[0] for p in selected_pixels) - min(p[0] for p in selected_pixels) + 1
            height = max(p[1] for p in selected_pixels) - min(p[1] for p in selected_pixels) + 1

            img = Image.open(filepath)
            img = img.resize((width, height))
            img.save(filepath, optimize=True, quality=85)

            # Mark pixels as claimed
            for pixel in selected_pixels:
                claimed_pixels[str(pixel)] = filename

            with open(PIXELS_FILE, 'w') as f:
                json.dump(claimed_pixels, f)

            os.remove(pixel_file)  # Cleanup session data
            return redirect(url_for('index'))

    return render_template('upload.html', session_id=session_id)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

if __name__ == '__main__':
    app.run(debug=True)
