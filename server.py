rom flask import Flask, request, send_from_directory, jsonify
import os
import stripe
import json

app = Flask(__name__, static_folder="public", static_url_path="")
stripe.api_key = os.environ.get("STRIPE_SECRET_KEY")

PIXEL_DATA_FILE = "pixel_data.json"

if not os.path.exists(PIXEL_DATA_FILE):
    with open(PIXEL_DATA_FILE, "w") as f:
        json.dump({"sold_pixels": 0}, f)

def get_sold_pixel_count():
    with open(PIXEL_DATA_FILE, "r") as f:
        return json.load(f)["sold_pixels"]

def update_sold_pixel_count(new_pixels):
    count = get_sold_pixel_count()
    with open(PIXEL_DATA_FILE, "w") as f:
        json.dump({"sold_pixels": count + new_pixels}, f)

@app.route("/")
def index():
    return send_from_directory("public", "index.html")

@app.route("/public/<path:path>")
def serve_static(path):
    return send_from_directory("public", path)

@app.route("/create-checkout-session", methods=["POST"])
def create_checkout_session():
    data = request.get_json()
    try:
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[{
                "price_data": {
                    "currency": "usd",
                    "product_data": {"name": "Pixel Space"},
                    "unit_amount": 100,
                },
                "quantity": data["pixels"],
            }],
            mode="payment",
            success_url="https://thedigitalmemorylane.com/success",
            cancel_url="https://thedigitalmemorylane.com/cancel",
        )
        update_sold_pixel_count(data["pixels"])
        return jsonify({"id": session.id})
    except Exception as e:
        return jsonify(error=str(e)), 403

@app.route("/pixel-stats", methods=["GET"])
def pixel_stats():
    return jsonify({"sold": get_sold_pixel_count()})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)))
