# Deploy Guide

Recommended layout:

- PostgreSQL database
- Backend Web Service from `parking_be`
- Frontend Web Service from `parking_fe`

## Backend

Use Docker deploy with root directory `parking_be`.

Required environment variables:

```env
DB_URL=jdbc:postgresql://HOST:5432/DB_NAME?currentSchema=smart_parking
DB_USERNAME=postgres
DB_PASSWORD=change-me
DB_SCHEMA=smart_parking
JWT_SECRET=replace-with-a-long-random-secret-at-least-32-chars
PAYMENT_WEBHOOK_SECRET=replace-with-a-long-random-payment-secret
BREVO_API_KEY=xkeysib-your-api-key
BREVO_FROM_EMAIL=your-verified-sender@example.com
BREVO_FROM_NAME=Smart Parking
STAFF_COMMISSION_RATE=0.10
```

Optional object storage variables for uploads:

```env
MINIO_ENDPOINT=https://your-object-storage
MINIO_ACCESS_KEY=change-me
MINIO_SECRET_KEY=change-me
MINIO_BUCKET=smart-parking
```

## Frontend

Use Docker deploy with root directory `parking_fe`.

Required environment variables:

```env
BACKEND_URL=https://your-backend-domain
DEFAULT_MAP_LAT=21.0278
DEFAULT_MAP_LNG=105.8342
DEFAULT_MAP_ZOOM=13
```

The frontend serves the built React app and proxies `/api/*` to `BACKEND_URL`.

## Render Notes

1. Create a PostgreSQL database first.
2. Create the backend as a Web Service from GitHub, root directory `parking_be`, runtime Docker.
3. Set backend environment variables from the database connection.
4. Deploy backend and copy its public URL.
5. Create the frontend as a Web Service from GitHub, root directory `parking_fe`, runtime Docker.
6. Set `BACKEND_URL` to the backend public URL.
7. Deploy frontend and open the frontend URL.
