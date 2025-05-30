from flask import Flask, request, jsonify, render_template, send_from_directory, url_for
import stripe
import os

app = Flask(__name__)

# Set your Stripe secret key (replace with your actual secret key or use environment variables)
stripe.api_key = "sk_test_51RTDqT2c0Glb9QyZWKi75aHqXBB44loEfUeZ8rgkyRRM6kkk7WUYf3Nzs1UIYiWt7WACmEX91XyUBWdIjjvNBBDE00g81jY3EP"

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/grid.js")
def grid_js():
    return send_from_directory(".", "grid.js")

@app.route("/create-checkout-session", methods=["POST"])
def create_checkout_session():
    data = request.get_json()
    pixel_count = data.get("pixels", 0)
    amount = pixel_count * 100  # convert dollars to cents

    try:
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[{
                "price_data": {
                    "currency": "usd",
                    "product_data": {
                        "name": f"{pixel_count} Pixels on The Digital Memory Lane"
                    },
                    "unit_amount": amount,
                },
                "quantity": 1,
            }],
            mode="payment",
            success_url=url_for("success", _external=True),
            cancel_url=url_for("cancel", _external=True),
        )
        return jsonify(id=session.id)
    except Exception as e:
        return jsonify(error=str(e)), 500

@app.route("/success")
def success():
    return "<h1 style='color: green; font-family: Courier;'>✅ Payment successful! Your memory is now preserved.</h1>"

@app.route("/cancel")
def cancel():
    return "<h1 style='color: red; font-family: Courier;'>❌ Payment was canceled. Your memory is not yet saved.</h1>"

if __name__ == "__main__":
    app.run(debug=True)
