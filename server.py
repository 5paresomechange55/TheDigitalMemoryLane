from flask import Flask, request, send_from_directory, jsonify
import os
import stripe

app = Flask(__name__, static_folder="public", static_url_path="")
stripe.api_key = os.environ.get("STRIPE_SECRET_KEY")

@app.route("/")
def index():
    return send_from_directory("public", "index.html")

@app.route("/public/<path:path>")
def serve_static(path):
    return send_from_directory("public", path)

@app.route("/success")
def success():
    return send_from_directory("public", "success.html")

@app.route("/cancel")
def cancel():
    return send_from_directory("public", "cancel.html")

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
                    "unit_amount": 100,  # $1.00 in cents
                },
                "quantity": data["pixels"],
            }],
            mode="payment",
            success_url="https://thedigitalmemorylane.onrender.com/success",
            cancel_url="https://thedigitalmemorylane.onrender.com/cancel",
        )
        return jsonify({"id": session.id})
    except Exception as e:
        return jsonify(error=str(e)), 403

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=int(os.environ.get("PORT", 5000)))
