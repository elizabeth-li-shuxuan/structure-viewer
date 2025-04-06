# 4/2/2025 Elizabeth Li
# Handle file uploads and serve a webpage with Flask

from flask import Flask, request, render_template, send_from_directory, jsonify
import os
import csv
from werkzeug.utils import secure_filename
from datetime import datetime

app = Flask(__name__)
UPLOAD_FOLDER = 'uploads'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

@app.route('/', methods=['GET', 'POST'])
def upload_file():
    if request.method == 'POST':
        if 'file' not in request.files:
            return 'No file part', 400
        files = request.files.getlist('file')
        if not files or all(file.filename == '' for file in files):
            return 'No selected file', 400

        filenames = []
        for file in files:
            if file.filename != '':
                filename = secure_filename(file.filename)
                file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
                filenames.append(filename)
                
        # Use the first file for initial display and pass the full list.
        return render_template('index.html', filename=filenames[0], filenames=filenames)
    return render_template('index.html')

# Route to serve uploaded files to the client
@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

# Handle rating submissions
@app.route('/rate', methods=['POST'])
def rate_file():
    data = request.json
    filename = data.get('filename')
    rating = data.get('rating')
    
    # Record the rating to a CSV file with a timestamp
    timestamp = datetime.now().isoformat()
    entry = [timestamp, filename, rating]
    with open('ratings.csv', 'a', newline='') as csvfile:
        writer = csv.writer(csvfile)
        writer.writerow(entry)
    
    print(f"Rating received: {filename} rated {rating}")
    return jsonify(status="success")

if __name__ == '__main__':
    app.run(debug=True)
