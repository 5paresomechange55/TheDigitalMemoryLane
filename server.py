from flask import Flask, request, jsonify, send_from_directory
from dotenv import load_dotenv
import os
import stripe
import json

# Load environment variables from .env
load_dotenv()

# Initialize Flask app
app = Flask(__name__, static_folder="public", static_url_path="")

# Stripe configuration from .env
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
PUBLISHABLE_KEY = os.getenv("STRIPE_PUBLISHABLE_KEY")

# Store sold pixels in a simple JSON file (for demo purposes)
SOLD_PIXELS_FILE = "sold_pixels.json"

# Ensure sold pixels file exists
if not os.path.exists(SOLD_PIXELS_FILE):
    with open(SOLD_PIXELS_FILE, "w") as f:
        json.dump([], f)

@app.route("/")
def index():
    return send_from_directory("public", "index.html")

@app.route("/grid.js")
def grid_js():
    return send_from_directory("public", "grid.js")

@app.route("/success")
def success():
    return send_from_directory("public", "success.html")

@app.route("/cancel")
def cancel():
    return send_from_directory("public", "cancel.html")

@app.route("/create-checkout-session", methods=["POST"])
def create_checkout_session():
    data = request.get_json()
    pixel_count = data.get("pixels", 0)

    if pixel_count <= 0:
        return jsonify({"error": "No pixels selected."}), 400

    try:
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[{
                "price_data": {
                    "currency": "usd",
                    "product_data": {
                        "name": "Digital Memory Lane Pixels",
                    },
                    "unit_amount": 100,  # $1.00 per pixel
                },
                "quantity": pixel_count,
            }],
            mode="payment",
            success_url="https://thedigitalmemorylane.com/success",
            cancel_url="https://thedigitalmemorylane.com/cancel",
        )
        return jsonify({"id": session.id})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/progress")
def progress():
    with open(SOLD_PIXELS_FILE, "r") as f:
        sold = json.load(f)
    total_pixels = 1000 * 3000
    return jsonify({
        "sold": len(sold),
        "total": total_pixels,
        "percent": round(100 * len(sold) / total_pixels, 2)
    })

@app.route("/upload-sold", methods=["POST"])
def upload_sold():
    data = request.get_json()
    new_pixels = data.get("pixels", [])

    with open(SOLD_PIXELS_FILE, "r") as f:
        sold = set(json.load(f))

    sold.update(new_pixels)

    with open(SOLD_PIXELS_FILE, "w") as f:
        json.dump(list(sold), f)

    return jsonify({"status": "success"})

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/about')
def about():
    return render_template('about.html')

@app.route('/contact')
def contact():
    return render_template('contact.html')

# Run the app
if __name__ == "__main__":
    app.run(debug=True)
