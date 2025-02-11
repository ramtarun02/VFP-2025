from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend requests

@app.route('/run-vfp', methods=['POST'])
def run_vfp():
    data = request.json  # Get form data from frontend

    # Construct a response that echoes back all user inputs
    response = {
        "message": "VFP Run Successful! Here are your inputs:",
        "user_inputs": data  # Send back the exact inputs received
    }

    return jsonify(response)

if __name__ == '__main__':
    app.run(debug=True)

