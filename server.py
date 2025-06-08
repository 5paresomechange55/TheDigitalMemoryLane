import os
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from dotenv import load_dotenv
import stripe

load_dotenv()
app = Flask(__name__)
CORS(app)

stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

# Simulated in-memory vote storage
charity_votes = {
    "charity1": 0,
    "charity2": 0,
    "charity3": 0,
    "charity4": 0
}

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/donation")
def donation_station():
    return render_template("donation.html")

@app.route("/create-checkout-session", methods=["POST"])
def create_checkout_session():
    data = request.get_json()
    pixels = data.get("pixels", [])
    charity = data.get("charity", "charity1")

    charity_votes[charity] += len(pixels)

    session = stripe.checkout.Session.create(
        payment_method_types=['card'],
        line_items=[{
            'price_data': {
                'currency': 'usd',
                'product_data': {
                    'name': f'{len(pixels)} Pixels on Digital Memory Lane',
                },
                'unit_amount': 100,
            },
            'quantity': len(pixels),
        }],
        mode='payment',
        success_url='https://yourdomain.com/success',
        cancel_url='https://yourdomain.com/cancel',
    )

    return jsonify({
        'id': session.id,
        'publicKey': os.getenv("STRIPE_PUBLISHABLE_KEY")
    })

@app.route("/api/votes", methods=["GET"])
def get_votes():
    return jsonify(charity_votes)

if __name__ == "__main__":
    app.run(debug=True)
