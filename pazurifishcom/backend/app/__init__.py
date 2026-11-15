from flask import Flask, jsonify
from flask_cors import CORS

from app.config import Config
from app.extensions import db
from app.routes.auth import auth_bp
from app.routes.orders import orders_bp
from app.routes.products import products_bp


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)
    CORS(app, resources={r'/api/*': {'origins': '*'}})

    app.register_blueprint(products_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(orders_bp)

    @app.route('/api/health')
    def health():
        return jsonify({'status': 'ok'})

    return app
