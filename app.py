# 4/2/2025 Elizabeth Li
# Handle file uploads and serve a webpage with Flask

from flask import Flask, request, render_template, send_from_directory, jsonify
import os
import csv
from werkzeug.utils import secure_filename
from datetime import datetime
import shutil
import random

app = Flask(__name__)
UPLOAD_FOLDER = 'uploads'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

#list all .vtp files in uploads folder
def get_all_files():
    return [f for f in os.listdir(UPLOAD_FOLDER) if f.endswith('.vtp')]

def get_rated_filenames():
    rated = set()
    try:
        with open('ratings.csv', 'r', newline='') as csvfile:
            reader = csv.DictReader(csvfile)
            for row in reader:
                rated.add(row['filename'])
    except FileNotFoundError:
        pass
    return rated


@app.route('/', methods=['GET', 'POST'])
def upload_file():
    # Clear uploads folder for a fresh start each visit
    if request.method == 'GET':
        shutil.rmtree(app.config['UPLOAD_FOLDER'], ignore_errors=True)
        os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

    if request.method == 'POST':
        if 'file' not in request.files:
            return 'No file part', 400
        files = request.files.getlist('file')
        if not files or all(file.filename == '' for file in files):
            return 'No selected file', 400

        for file in files:
            if file.filename != '':
                print("Original filename:", file.filename)
                filename = secure_filename(os.path.basename(file.filename))
                print("Processed filename:", filename)
                file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))

    all_files = [f for f in os.listdir(app.config['UPLOAD_FOLDER']) if f.endswith('.vtp')]
    rated_files = get_rated_filenames()
    unrated_files = [f for f in all_files if f not in rated_files]
    random.shuffle(unrated_files) #randomly shuffle file order

    total_files = len(all_files)
    already_rated_count = total_files - len(unrated_files)
    current_file = unrated_files[0] if unrated_files else None

    return render_template('index.html',
                           filename=current_file,
                           filenames=unrated_files,
                           total_files=total_files,
                           rated_count=already_rated_count)



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
    entry = {'timestamp': timestamp, 'filename': filename, 'rating': rating}
    
    file_exists = os.path.exists('ratings.csv')
    with open('ratings.csv', 'a', newline='') as csvfile:
        fieldnames = ['timestamp', 'filename', 'rating']
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        if not file_exists:
            writer.writeheader()
        writer.writerow(entry)
    
#    print(f"Rating received: {filename} rated {rating}")
    return jsonify(status="success")


#Route to deleting the last rating for a file
@app.route('/delete_rating', methods=['POST'])
def delete_rating():
    data = request.json
    filename = data.get('filename')
    try:
        #if no rating file exists, there's nothing to delete
        if not os.path.exists('ratings.csv')  :
            return jsonify(status="no_ratings")    

        # in ratings.csv, find and remove the most recent rating entry for the given filename
        with open('ratings.csv', 'r', newline='') as csvfile:
            reader = list(csv.reader(csvfile))
        
        index_to_remove = None
        for i in range(len(reader)-1, -1, -1): #iterate backwards over indices of the 'reader' list
            if reader[i][1] == filename:
                index_to_remove = i
                break

        if index_to_remove is not None:
            del reader[index_to_remove]
            with open('ratings.csv','w',newline='') as csvfile:
                writer = csv.writer(csvfile)
                writer.writerows(reader)
            print(f"Deleted rating for {filename}")
            return jsonify(status="deleted")
        else:
            return jsonify(status="not_found")
        
    except Exception as e:
        print(f"Error deleting rating: {e}")
        return jsonify(status='error', message=str(e)), 500
    

if __name__ == '__main__':
    app.run(debug=True)