import os, json
from flask import Flask, render_template, request, jsonify, redirect, url_for
from werkzeug.utils import secure_filename
from PIL import Image
from dotenv import load_dotenv
import stripe

load_dotenv()
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

app = Flask(__name__)
UPLOAD_FOLDER = 'static/uploads'
CLAIMED_FILE = 'data/claimed_slots.json'
VOTES_FILE = 'data/charity_votes.json'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs('data', exist_ok=True)

claimed = {}
if os.path.exists(CLAIMED_FILE):
    claimed = json.load(open(CLAIMED_FILE))
votes = {f'charity{i}': 0 for i in range(1,5)}
if os.path.exists(VOTES_FILE):
    votes = json.load(open(VOTES_FILE))

def allowed_file(fn):
    return '.' in fn and fn.rsplit('.',1)[1].lower() in {'png','jpg','jpeg'}

@app.route('/')
def index():
    return render_template('index.html', stripe_public_key=os.getenv("STRIPE_PUBLISHABLE_KEY"))

@app.route('/claimed-slots')
def claimed_slots():
    return jsonify({"claimed": list(claimed.keys())})

@app.route('/create-checkout-session', methods=['POST'])
def checkout():
    data = request.get_json()
    slots = data['slots']
    charity = data['charity']
    price = data['price']
    session_id = f"session_{os.urandom(4).hex()}"
    json.dump({"slots": slots, "charity": charity}, open(f'data/{session_id}.json','w'))

    session = stripe.checkout.Session.create(
        payment_method_types=['card'],
        line_items=[{
            'price_data': {
                'currency': 'usd',
                'unit_amount': price,
                'product_data': {'name': f'{len(slots)} timeline slot(s)'},
            },
            'quantity': len(slots),
        }],
        mode='payment',
        success_url=url_for('upload', session_id=session_id, _external=True),
        cancel_url=url_for('index', _external=True),
    )
    return jsonify({'id': session.id})

@app.route('/upload/<session_id>', methods=['GET','POST'])
def upload(session_id):
    path = f'data/{session_id}.json'
    if not os.path.exists(path): return "Invalid session", 400
    sess = json.load(open(path))

    if request.method=='POST':
        img = request.files.get('image')
        if not img or not allowed_file(img.filename):
            return "Upload a valid image", 400

        for slot in sess['slots']:
            filename = secure_filename(f"{slot}.jpg")
            filepath = os.path.join(UPLOAD_FOLDER, filename)
            im = Image.open(img)
            im.resize((50,50)).save(filepath, format='JPEG', quality=85)
            claimed[str(slot)] = filename
        json.dump(claimed, open(CLAIMED_FILE,'w'))

        votes[sess['charity']] = votes.get(sess['charity'],0)+1
        json.dump(votes, open(VOTES_FILE,'w'))
        os.remove(path)
        return redirect(url_for('index'))

    return render_template('upload.html', session=session_id)

if __name__ == '__main__':
    app.run(debug=True)
