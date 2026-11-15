# Pazuri Fish Reconstruction

This workspace contains a reconstructed storefront for Pazuri Fish, based on the live website and the supplied reference reconstruction.

## Frontend

The storefront is in the `my-app` folder.

### Local development

```bash
cd my-app
npm install
npm run dev -- --host 0.0.0.0 --port 4173
```

### Environment

Create a local frontend env file:

```bash
cp .env.example .env
```

Example:

```env
VITE_API_URL=http://localhost:5000/api
```

### Testing

```bash
npm test
npm run build
```

## Backend

The Flask API scaffold is in the `backend` folder.

### Local development

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pytest -q
```

### Environment

```bash
cp .env.example .env
```

### Notes

- This backend is intentionally scaffolded and testable, with seed API endpoints for products, auth and orders.
- Production data, Cloudinary integration, admin auth and PostgreSQL models are placeholders pending verification from the business.
- The frontend is designed to work with the original brand palette and sections, but the catalogue, contact details and business hours are intentionally marked as needing business verification.
