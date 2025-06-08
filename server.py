import os
import json
from flask import Flask, request, jsonify, render_template, send_from_directory, redirect
from flask_cors import CORS
from werkzeug.utils import secure_filename
from PIL import Image
import stripe
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

# Stripe keys
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
PUBLISHABLE_KEY = os.getenv("STRIPE_PUBLISHABLE_KEY")

# Pixel state and vote store
claimed_pixels = set()
votes = {"Charity A": 0, "Charity B": 0, "Charity C": 0, "Charity D": 0}

# Image upload path
UPLOAD_FOLDER = 'static/uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

@app.route('/')
def index():
    return render_template('index.html', publishable_key=PUBLISHABLE_KEY)

@app.route('/about')
def about():
    return render_template('about.html')

@app.route('/contact')
def contact():
    return render_template('contact.html')

@app.route('/donation')
def donation():
    return render_template('donation.html', votes=votes)

@app.route('/upload', methods=['GET', 'POST'])
def upload():
    if request.method == 'POST':
        file = request.files['image']
        pixels = json.loads(request.form['pixels'])
        filename = secure_filename(file.filename)
        path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(path)

        # Resize to fit the selected pixel area
        width = max(x for x, y in pixels) - min(x for x, y in pixels) + 1
        height = max(y for x, y in pixels) - min(y for x, y in pixels) + 1

        img = Image.open(path)
        img = img.resize((width, height))
        img.save(path)

        return redirect('/')
    return render_template('upload.html')

@app.route('/create-checkout-session', methods=['POST'])
def create_checkout_session():
    data = request.get_json()
    selected_pixels = data.get('pixels', [])
    vote = data.get('vote')

    if vote in votes:
        votes[vote] += len(selected_pixels)

    session = stripe.checkout.Session.create(
        payment_method_types=['card'],
        line_items=[{
            'price_data': {
                'currency': 'usd',
                'unit_amount': 100 * len(selected_pixels),
                'product_data': {
                    'name': f'{len(selected_pixels)} Pixels on TheDigitalMemoryLane',
                },
            },
            'quantity': 1,
        }],
        mode='payment',
        success_url=request.host_url + 'upload',
        cancel_url=request.host_url,
    )
    return jsonify({'id': session.id})

@app.route('/api/claimed-pixels')
def api_claimed_pixels():
    return jsonify(list(claimed_pixels))

@app.route('/api/votes')
def api_votes():
    return jsonify(votes)

@app.route('/claim-pixels', methods=['POST'])
def claim_pixels():
    new_pixels = request.get_json().get('pixels', [])
    claimed_pixels.update(map(tuple, new_pixels))
    return jsonify({'status': 'success'})

if __name__ == '__main__':
    app.run(debug=True)
