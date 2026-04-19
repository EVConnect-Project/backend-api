# EVRS Backend Deployment on Render (Staging)

This guide deploys only the backend API from `backend-api`.

## 1. Create Service on Render

1. Push your latest code to GitHub.
2. In Render, click New + -> Blueprint and connect this repository.
3. Select the `render.yaml` at repo root.
4. Confirm the service `evrs-backend-staging` is created with:
   - Root Directory: `backend-api`
   - Build Command: `npm ci && npm run build`
   - Start Command: `npm run start:prod`
   - Health Check Path: `/api/health`

If you do not use Blueprint, create a Web Service manually with the same values.

## 2. Configure Environment Variables

Use `backend-api/.env.render.staging.example` as your source template.

Required before first boot:
- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `ALLOWED_ORIGINS`

Commonly required for EVRS features:
- `PAYHERE_*`
- `TEXTLK_*`
- `FIREBASE_*`
- `CLOUDINARY_*`
- `AI_SERVICE_URL`

Important:
- `ALLOWED_ORIGINS` must be comma-separated staging web/admin URLs.
- Do not include spaces between URLs.

## 3. Run Migrations (One-off Job)

After first successful deploy, run:

```bash
npm run migration:run
```

Use a Render one-off shell/job against the backend service so migrations run against the same `DATABASE_URL`.

## 4. Verify Deployment

1. Open:
   - `https://<your-render-api-domain>/api/health`
2. Expected response:
   - JSON with `status: "ok"`
3. Test basic auth endpoints from Postman/mobile app.

## 5. Point Frontends and Mobile to Staging Backend

After backend is healthy, update web/admin/mobile API base URL to your Render backend URL.

## Troubleshooting

- 401/500 on startup with JWT errors:
  - Check `JWT_SECRET` and `JWT_REFRESH_SECRET` are set.
- CORS blocked in browser:
  - Fix `ALLOWED_ORIGINS` and redeploy.
- Payment webhook not updating bookings:
  - Check `PAYHERE_NOTIFY_URL` is public and exactly points to `/api/payments/webhook`.
- Push notifications failing:
  - Verify `FIREBASE_PROJECT_ID`, `FIREBASE_PRIVATE_KEY`, and `FIREBASE_CLIENT_EMAIL`.