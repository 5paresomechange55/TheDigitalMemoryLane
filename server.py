from flask import Flask, request, render_template, jsonify, redirect
import os
from dotenv import load_dotenv
import stripe
from PIL import Image
import io
from werkzeug.utils import secure_filename

load_dotenv()

app = Flask(__name__)
app.config["UPLOAD_FOLDER"] = "uploads"
os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)

stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

# Existing route remains intact...

@app.route("/success")
def success():
    session_id = request.args.get("session_id")
    return redirect(f"/upload.html?session_id={session_id}")

@app.route("/upload", methods=["POST"])
def upload_image():
    session_id = request.form.get("session_id")
    file = request.files.get("image")

    if not session_id or not file:
        return jsonify({"message": "Session ID or image missing."}), 400

    try:
        session = stripe.checkout.Session.retrieve(session_id)
        if session.payment_status != "paid":
            return jsonify({"message": "Payment not verified."}), 403

        filename = secure_filename(session_id + ".jpg")
        image = Image.open(file.stream)
        image = image.convert("RGB")
        image.thumbnail((500, 500))  # Resize for reasonable storage

        image_path = os.path.join(app.config["UPLOAD_FOLDER"], filename)
        image.save(image_path)

        return jsonify({"message": "Image uploaded successfully."})

    except Exception as e:
        return jsonify({"message": f"Upload failed: {str(e)}"}), 500

@app.route("/uploads/<filename>")
def serve_uploaded_image(filename):
    return send_from_directory(app.config["UPLOAD_FOLDER"], filename)
