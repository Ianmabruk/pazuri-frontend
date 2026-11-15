from app import create_app


def test_health_check():
    app = create_app()
    client = app.test_client()

    response = client.get('/api/health')
    assert response.status_code == 200
    assert response.get_json()['status'] == 'ok'


def test_product_list_endpoint():
    app = create_app()
    client = app.test_client()

    response = client.get('/api/products')
    assert response.status_code == 200
    payload = response.get_json()
    assert 'products' in payload
    assert isinstance(payload['products'], list)


def test_order_creation_calculates_subtotal():
    app = create_app()
    client = app.test_client()

    response = client.post(
        '/api/orders',
        json={
            'items': [
                {'name': 'Fresh Whole Tilapia', 'price': 650, 'quantity': 2},
                {'name': 'Fresh Juice', 'price': 250, 'quantity': 1},
            ],
            'delivery_area': 'Langata',
        },
    )

    assert response.status_code == 201
    payload = response.get_json()['order']
    assert payload['subtotal'] == 1550
    assert payload['delivery_area'] == 'Langata'
