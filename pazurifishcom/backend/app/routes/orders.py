from flask import Blueprint, jsonify, request

orders_bp = Blueprint('orders', __name__, url_prefix='/api')

ORDERS = []


@orders_bp.post('/orders')
def create_order():
    payload = request.get_json(silent=True) or {}
    items = payload.get('items', [])
    delivery_area = payload.get('delivery_area')

    if not items:
        return jsonify({'error': 'Order must include at least one item.'}), 400

    subtotal = sum(float(item.get('price', 0)) * int(item.get('quantity', 0)) for item in items)
    order = {
        'id': len(ORDERS) + 1,
        'items': items,
        'delivery_area': delivery_area or 'Nairobi',
        'subtotal': subtotal,
        'total': subtotal,
        'status': 'pending',
    }
    ORDERS.append(order)
    return jsonify({'order': order}), 201


@orders_bp.get('/orders')
def list_orders():
    return jsonify({'orders': ORDERS})
