from flask import Blueprint, jsonify, request

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

USER_DB = []


@auth_bp.post('/register')
def register_user():
    payload = request.get_json(silent=True) or {}
    name = payload.get('full_name') or payload.get('name')
    email = payload.get('email')
    password = payload.get('password')

    if not all([name, email, password]):
        return jsonify({'error': 'full_name, email and password are required'}), 400

    USER_DB.append({'full_name': name, 'email': email, 'password': password})
    return jsonify({'message': 'User registered successfully.'}), 201


@auth_bp.post('/login')
def login_user():
    payload = request.get_json(silent=True) or {}
    email = payload.get('email')
    password = payload.get('password')

    if not all([email, password]):
        return jsonify({'error': 'email and password are required'}), 400

    for user in USER_DB:
        if user['email'] == email and user['password'] == password:
            return jsonify({'message': 'Login successful.'}), 200

    return jsonify({'error': 'Invalid credentials'}), 401
