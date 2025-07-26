
from flask_wtf import FlaskForm, CSRFProtect

# FlaskForm: A class from Flask-WTF that integrates WTForms with Flask, making it easier to handle forms in Flask applications.
# CSRFProtect: Adds CSRF (Cross-Site Request Forgery) protection to your forms to secure them from malicious attacks.

from wtforms import StringField, PasswordField, SubmitField, EmailField

# StringField: A text input field for entering string data (e.g., username).
# PasswordField: A password input field where the text is hidden (masked).
# SubmitField: A button for submitting the form.
# EmailField: A field specifically for email input, which ensures the input follows the email format.

from wtforms.validators import DataRequired, Length, Email, EqualTo

# DataRequired: Ensures the field is not left empty.
# Length: Validates the minimum and maximum length of the input.
# Email: Validates that the input is in a valid email format.


#  Login Form

# the LoginForm class defines fields required for user login:

# username: A StringField with validation for required input and length (3–20 characters).
# password: A PasswordField with validation for required input and length (6–30 characters).
# submit: A SubmitField for the login button.

class LoginForm(FlaskForm):
    username = StringField('Username', validators=[DataRequired(), Length(min=3, max=20)])
    password = PasswordField('Password', validators=[DataRequired(), Length(min=6, max=30)])
    submit = SubmitField('Login')

# Register Form

# The RegisterForm class defines fields required for user registration:

# username: Same as in LoginForm.
# email: An EmailField with validation for required input and email format.
# password: A PasswordField with validation for required input and length (6–30 characters).
# confirm_password: A PasswordField to confirm the password, with the same validation as password.
# submit: A SubmitField for the registration button.

class RegisterForm(FlaskForm):
    username = StringField('Username', validators=[DataRequired(), Length(min=3, max=20)])
    email = EmailField('Email', validators=[DataRequired(), Email()])
    password = PasswordField('Password', validators=[DataRequired(), Length(min=6, max=30)])
    confirm_password = PasswordField('Confirm Password',validators=[DataRequired(), EqualTo('password', message='Passwords must match.')])
    submit = SubmitField('Register')
    
# INSTALLATIONS REQUIRED
# pip install flask
# pip install flask-wtf
# pip install wtforms
# pip install email-validator

# pip install flask flask-wtf wtforms email-validator
# flask run