# Trimurya Dual Speaker Recording Platform

JavaScript-only monorepo MVP for secure candidate pairing, dual-channel browser recording, QA review, and delivery reporting.

## Start

1. Copy `.env.example` to `.env` and change both JWT secrets.
2. Run `npm install`.
3. Run `docker compose up -d mongo` (or configure an existing MongoDB URI).
4. Run `npm run seed` to create the initial administrator: `admin@trimurya.local` / `ChangeMe123!`.
5. Run `npm run dev`, then visit `http://localhost:5173`.

Swagger UI is served at `http://localhost:5000/api-docs`.

## Structure

- `client/` React 18 + Vite + Tailwind + Lucide interface.
- `backend/` Express, Mongo/Mongoose, Socket.IO, JWT/cookie refresh auth, validation, headers/rate limiting, and API.
- `server/src/models.js` has User, CandidateProfile, Project, Script, PairingQueue, PairingMatch, RecordingSession, RecordingFile, QCReview, Notification, and AuditLog schemas.

## Production notes

The client obtains separate local microphone tracks: each browser writes its own independent audio WebM file, while WebRTC streams the live audio to the partner. Configure an S3-compatible service and add server-side presigned upload endpoints before accepting remote uploads in a production bucket; keep bucket access private. Use HTTPS and set `COOKIE_SECURE=true` in production.

Pairing is FIFO, checks project/language/dialect/recording type/gender rule, atomically moves queue records to matched, expires after 60 seconds, and requeues candidates on expiry or decline. For multi-instance deployment, replace Mongo queue locking with Redis/BullMQ or a Mongo transaction/lease implementation.

## Participant OTP login

Participants enter their registered email address or mobile number, request a six-digit code, and verify it to sign in without a password. Admin and Super Admin password login remains available through the separate login toggle. New users receive OTP too. Successful verification creates a participant account and profile, then signs in. Recording verification and consent remain required.

Copy the variables in `backend/.env.otp.example` into the root `.env` and configure SMTP for email and Twilio for SMS. Never put these credentials in frontend environment variables. Use international mobile numbers (for example `+919876543210`); `SMS_DEFAULT_COUNTRY_CODE` can supply a prefix for local numbers. Restart the backend after changing environment variables. Delivery returns a configuration error until credentials are provided; OTP codes are never returned in API responses or logged.

Codes expire after five minutes, permit five attempts, and are consumed once. Resend cooldown is 60 seconds. MongoDB stores an HMAC digest and a TTL expiry index. OTP routes apply additional IP request limits. New contacts can register through verified OTP. Ambiguous, blocked, rejected, and administrator accounts cannot authenticate through participant OTP. Email delivery uses Nodemailer SMTP; SMS uses Twilio Messages API.

## Super Admin API Settings

Sign in as Super Admin and open **API Settings** in the sidebar. Configure SMTP host, port, username, sender email and password for email OTP; configure Twilio Account SID, Auth Token and sender number for SMS OTP. Save before using the test email/SMS controls. Only Super Admin can read, save or test provider settings. Mobile destinations receive SMS rather than email. New contacts are registered only after successful OTP verification.

Provider secrets are encrypted in MongoDB using AES-256-GCM. Set a stable `INTEGRATIONS_ENCRYPTION_KEY` in the root `.env` before saving credentials; when omitted, the current JWT access secret supplies the encryption key. Changing the encryption secret requires reconfiguring saved credentials. API responses return only secret-configured flags. Blank secret fields preserve existing values. Changes apply immediately without restarting the backend.

Participants are automatically marked verified after successful OTP verification, including existing pending accounts. Blocked or rejected users remain denied. Recording consent is still separate and must be explicitly given.
# ptr

## Recording upload: R2 CORS and missing backend route

If the browser reports an R2 preflight CORS error followed by `Cannot PUT /api/sessions/:id/audio` (404), there are two separate deployment problems:

1. In Cloudflare R2, open the recording bucket, go to Settings ? CORS policy, and apply the JSON from `frontend/public/r2-cors.json`. It permits the production origin `https://ptr.trimuryacorporation.in`, PUT uploads with Content-Type, and the local/APK origins. Keep the bucket private. Preserve any existing CORS rules needed by other applications.
2. In Render, deploy the backend branch containing commit `7519b7a` or a newer commit with `backend/src/recording-upload-routes.js`. The API must mount this router under `/api`. Redeploying only the frontend cannot add the missing backend route.
3. Verify an unauthenticated PUT request to `/api/sessions/aaaaaaaaaaaaaaaaaaaaaaaa/audio?size=1` responds with 401 rather than 404. This checks that the protected route exists without uploading a recording.
4. Keep both recording screens open and retry Submit recording after deployment. The client retains the audio Blob on failure; refreshing or closing a screen loses that unsent recording.

CORS reference: https://developers.cloudflare.com/r2/buckets/cors/
