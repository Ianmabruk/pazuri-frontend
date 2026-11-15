from flask import Blueprint, jsonify, request

products_bp = Blueprint('products', __name__, url_prefix='/api')

PRODUCTS = [
    {
        'id': 1,
        'name': 'Fresh Whole Tilapia',
        'description': 'Fresh whole tilapia, selected for your table.',
        'category': 'Fish Butchery',
        'price': 650,
        'unit': 'per kg',
        'image_url': 'https://images.unsplash.com/photo-1544943910-4c1dc44aab77?auto=format&fit=crop&w=900&q=80',
    },
    {
        'id': 2,
        'name': 'Fresh Nile Perch',
        'description': 'Quality Nile perch, prepared to order.',
        'category': 'Fish Butchery',
        'price': 850,
        'unit': 'per kg',
        'image_url': 'https://images.unsplash.com/photo-1535399831218-d5bd36d1a6b3?auto=format&fit=crop&w=900&q=80',
    },
    {
        'id': 3,
        'name': 'Grilled Tilapia',
        'description': 'A freshly prepared kitchen favourite.',
        'category': 'Kitchen',
        'price': 1200,
        'unit': 'per serving',
        'image_url': 'https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=900&q=80',
    },
]


@products_bp.get('/products')
def get_products():
    return jsonify({'products': PRODUCTS})


@products_bp.post('/products')
def create_product():
    payload = request.get_json(silent=True) or {}
    required = {'name', 'description', 'category', 'price', 'unit'}
    missing = sorted(required.difference(payload.keys()))

    if missing:
        return jsonify({'error': f'Missing required fields: {missing}'}), 400

    new_product = {
        'id': max((item['id'] for item in PRODUCTS), default=0) + 1,
        'name': payload['name'],
        'description': payload['description'],
        'category': payload['category'],
        'price': float(payload['price']),
        'unit': payload['unit'],
        'image_url': payload.get('image_url', ''),
    }
    PRODUCTS.append(new_product)
    return jsonify({'product': new_product}), 201
