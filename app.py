import os
import secrets
import logging
from flask import Flask, redirect, url_for, render_template, flash, session, jsonify, request
from forms import LoginForm, RegisterForm # pip install wtforms
from flask_wtf.csrf import CSRFProtect # pip install flask-wtf
from pymongo import MongoClient # pip install pymongo
from werkzeug.security import generate_password_hash, check_password_hash # pip install werkzeug
from datetime import datetime
import pytz # pip install pytz


# ****************************************************************************************************************************************
# 127.0.0.1/:1 Access to XMLHttpRequest at 'http://localhost:5000/get-secret' from origin '
# http://127.0.0.1:5000' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.
from flask_cors import CORS # pip install flask-cors
# ****************************************************************************************************************************************

# ****************************************************************************************************************************************
#Configuring Logging to Record Debug Information to 'record.log' File
logging.basicConfig(filename="record.log", level=logging.DEBUG,datefmt= "%Y-%m-%d %H:%M:%S")
# ****************************************************************************************************************************************

# ****************************************************************************************************************************************
app = Flask(__name__)
CORS(app, origins="http://127.0.0.1:5000")
# Code block for formating time to Europe/Athens 
# ********************************************************************************************
# Get the current time in Greece (Athens time zone)
greece_tz = pytz.timezone('Europe/Athens')
current_time = datetime.now(greece_tz)  # Local time for Greece (Athens)
# Format the current time
local_time = current_time.strftime("%Y-%m-%d %H:%M:%S")
# ********************************************************************************************

# STEP 1: CONNECT TO MONGO DATABASE AND COLLECTIONS
# ********************************************************************************************
client = MongoClient('mongodb://localhost:27017')  # Here connecting to the local MongoDB
db = client['weatherApp']  # The database 
weather_collection = db['weatherData']  # Here is the weather data that will save maybe for individual needs
users_collection = db['users']  # Here collecting user credentials and writes register
favorites_collection = db['favorites']  # Will be the collection for storing user favorite places
config_collection= db['app_config'] # Here storing the secret key and update & API keys
# ********************************************************************************************

# ******************************************************************************************************************************
# STEP 2: GENERATE THE SECRET KEY AND TIMESTAMP
# (key is stored in DB for security reasons, everytime app will start it will convert new one )
# HERE I NEED TO MAKE IT CHANGE USING TIMER
# ********************************************************************************************
secret_key = secrets.token_hex(32)  # 32 bytes = 64 hex characters
# Get the current time in Greece (Athens time zone)
greece_tz = pytz.timezone('Europe/Athens')
current_time = datetime.now(greece_tz)  # Local time for Greece (Athens)
# Format the current time
local_time = current_time.strftime("%Y-%m-%d %H:%M:%S")


# STEP 3 CHECK IF THE KEY EXISTS IF THIS/ELSE THAT
key_check = config_collection.find_one({"config_name": "config_seckey"})

if key_check:
        # Update the document if it exists  
    config_collection.update_one(
    {"config_name": "config_seckey"},  # Filter
    {
        "$set": {
        "value": secret_key, # Update the key with the new one 
        "timestamp": local_time  # Add or update the timestamp field      # Output example tha einai etsi 2025-01-27 14:30:45
        }
    }
)   # update key if exists
    print("Key updated successfully.")
else:
    # Insert the key if not exist
    config_collection.insert_one({
        "config_name": "config_seckey",
        "value": secret_key,
        "timestamp": local_time
    }
)
    print("Key inserted successfully.")
    
# ******************************************************************************************************************************
    
# ************************************************************************************************************************************    
# Set the new SECRET_KEY in Flask configuration
# Flask uses the secret key for signing session cookies and for protecting against CSRF attacks
# Session Management: Every time a user logs in, Flask uses the secret key to sign the session cookie.
# used behind the scenes by Flask’s security mechanisms.
app.config['SECRET_KEY'] = secret_key # Set the generated key in Flask config  # for testing db.app_config.deleteOne({ "config_name": "Weather_app_seckey" })
                                      # db.app_config.find({ "config_name": "Weather_app_seckey" })
 
# ************************************************************************************************************************************                                                                         
# Initialize CSRF protection
csrf = CSRFProtect(app)  # TBD THELEI FTIAKSIMO
# ********************************************************************************************

@app.route('/get-api-keys', methods=['GET'])
def get_api_keys():
    # Find the document with config_name = "API_CONFIG_KEY"
    document = config_collection.find_one({"config_name": "API_KEYS"})
    
    if document:
        # Return the key and timestamp in the response
        document.pop('_id', None)
        return jsonify(document)
    else:
        return jsonify({"error": "API keys not found"}), 404

# ********************************************************************************************
@app.route('/')
def home():
    # This is the home page route. When users visit /
    return render_template('index.html')


@app.route('/login', methods=['GET', 'POST'])
def login():
    # It shows a login form and processes the form data.
    # If the user submits valid login credentials, they're redirected to the home page. /
    
    form = LoginForm()   # Get the login form
    
    if form.validate_on_submit():  # If the form is submitted and validated
        username = form.username.data  # Get the username from the form
        password = form.password.data  # Get the password from the form
        
        # Check if the user exists in the database and if the password is correct
        user = users_collection.find_one({'username': username})
        
        if user and check_password_hash(user['password'], password):  # If user exists and password matches
            
            # After validating user credentials
            session['username'] = username  # Store the username in the session
            
            # ***************************************************
            # EDW NA VALW KAPOIO MUNHMA GIA OTAN KANEI LOGIN
            # ***************************************************
            
            return redirect(url_for('home'))  # Redirect to the home page
        else:
            # ***************************************************
            # EDW NA VALW KAPOIO MUNHMA GIA OTAN KANEI LOGIN AMA KANEI FAIL
            # ***************************************************
            return render_template('login.html', form=form)  # If the form is not submitted, render the login page
    
    return render_template('login.html', form=form)  # If the form is not submitted, render the login page

@app.route('/logout')
def logout():
    # After logging out, the user is redirected to the login page.

    session.clear()  # Clears all session data (this logs the user out)
    flash('You have been logged out.', 'success')  # Show a logout success message
    return redirect(url_for('login'))  # Redirect to the login page after logout


@app.route('/register', methods=['GET', 'POST'])
def register():
    # user registration, registration form and processes the form data.
    # If the user submits valid data, they're added to the MongoDB database.

    form = RegisterForm() # Get the registration form
    
    if form.validate_on_submit():  # If the form is submitted and validated
        username = form.username.data  # Get the username from the form
        password = form.password.data  # Get the password from the form
        email = form.email.data # Get the email from the form
        confirm_password = form.confirm_password.data  # Get the confirmed password from the form

        # Check if the username already exists in the MongoDB collection
        if users_collection.find_one({'username': username}):
            flash('Username already exists. Please choose a different one.', 'error')
            return redirect(url_for('register'))  # Redirect back to the registration page if username exists

        # Check if the passwords match
        if password != confirm_password:
            flash('Passwords do not match.', 'error')
            return redirect(url_for('register'))  # Redirect back to the registration page if passwords do not match

        # Hash the password before storing it in the database
        hashed_password = generate_password_hash(password)

        # Insert the new user into the 'users' collection in MongoDB
        users_collection.insert_one({
            'username': username,
            'password': hashed_password,
            'email': email
            })
        
            # ***************************************************
            # EDW NA VALW KAPOIO MUNHMA GIA OTAN KANEI SWSTA REGISTER
            # ***************************************************
        return redirect(url_for('login'))  # Redirect to login page after successful registration

    return render_template('register.html', form=form)  # Render the registration form

#********************************************************STATISTICS CODE BLOCK*********************************************************************************************************
@app.route('/data')
def data():
    return render_template('data.html')

@app.route('/save-weather', methods=['POST'])
def save_weather():
    try:
        weather_data = request.json
        for city_data in weather_data:
            # Ensure city name exists in the data
            if 'city' in city_data and 'name' in city_data['city']:
                city_name = city_data['city']['name']
                # Update existing document or insert new
                weather_collection.update_one(
                    {"city.name": city_name},
                    {"$set": city_data},
                    upsert=True
                )
        return jsonify({"status": "success", "message": "Data refreshed in MongoDB"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
    
    
@app.route('/get-weather/<city_name>')
def get_weather(city_name):
    try:
        # Get latest data for the city
        data = list(weather_collection.find({"city.name": city_name}).sort("_id", -1).limit(1))
        # Convert ObjectId to string for JSON serialization
        for doc in data:
            doc['_id'] = str(doc['_id'])
        return jsonify(data)
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
#********************************************************STATISTICS CODE BLOCK*********************************************************************************************************

#Error handlers
#******************************************************************************************************
 # This route handles 404 errors (page not found).
    # When a user tries to visit a page that does not exist, this page is displayed.
@app.errorhandler(404)
def not_found_error(error):  # <-- Add 'error' parameter here
    return jsonify({
        "success": False,
        "error": 404,
        "message": "Endpoint not found"
    }), 404

@app.errorhandler(500)
def internal_error(error):  # <-- Add 'error' parameter here
    return jsonify({
        "success": False,
        "error": 500,
        "message": "Internal server error"
    }), 500

@app.errorhandler(405)
def method_not_allowed(error):  # <-- Add 'error' parameter here
    return jsonify({
        "success": False,
        "error": 405,
        "message": "Method not allowed"
    }), 405
##***************************************************************************
    
if __name__ == '__main__': 

    # Run the Flask application. This will start the server when the script is executed.
    
    app.run(debug=True) # Enable debug mode for development