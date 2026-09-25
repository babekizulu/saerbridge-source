# Security model

Saerbridge Source does not keep user accounts or a project database. A design is calculated for the request that asked for it, returned over that response, and held in the browser until the page drops it. This is not end-to-end encryption. The server decrypts a submission so it can calculate geometry, quantities, costs, drawings, and, when needed, call OpenAI.

## Transport

Production browser-to-API traffic must use HTTPS, normally terminated by Netlify and Railway. The API redirects plaintext requests to HTTPS only when `NODE_ENV=production`. It sends HSTS only in that mode. Local development uses the Vite proxy to `http://localhost:3011`.

Project JSON is also sealed in the browser before it is sent:

1. The browser fetches the server public key from `GET /api/crypto/public-key`.
2. It encrypts the submission with AES-256-GCM.
3. It wraps that content key with RSA-OAEP and SHA-256.
4. The server unwraps the key with `DATA_ENCRYPTION_PRIVATE_KEY` and decrypts the JSON in memory.

The private key is never sent to the browser. A missing production key makes the process generate a temporary key and log a warning, without printing the key. Set one PKCS#8 PEM for every production instance. A tampered or mismatched payload is rejected. The API does not accept a plaintext project body instead.

Photographs stay in the multipart file field. TLS covers them. The server checks the file signature, re-encodes to JPEG, which drops EXIF location data, and does not write the file to disk.

## Storage

There is no PostgreSQL database, object bucket, or public download folder in this application. Blueprints, PDFs, CSV files, scene data, and GLB files are generated in memory and returned on the same response. Guessed paths such as `/files/plan.pdf` or `/api/projects/:id` are not served. `Cache-Control: private, no-store` is set on API responses.

Because nothing is stored, there is no encrypted-at-rest record to migrate and no server-side project to delete. Closing or regenerating the page drops the browser copies. Accessibility preferences in `localStorage` are text size, contrast, and motion only.

There is no account system, so there is no cross-user project lookup to authorise. Do not add a stored project or a file URL without checking a server-side identity first.

## OpenAI and other services

Text and supplier prompts receive material and furniture labels, plot and dwelling sizes, residence type, and a suburb-level area. They do not receive site notes, precise coordinates, budgets, account data, or the photograph. The renovation image call receives the photograph only after the permission box is ticked. Supplier address lookup uses OpenStreetMap Nominatim.

## Logs and secrets

Logs keep request id, stage, duration, and redacted error text. They must not contain API keys, private keys, coordinates, or submission bodies. `OPENAI_API_KEY` and `DATA_ENCRYPTION_PRIVATE_KEY` stay in `server/.env`. The client bundle may contain only `VITE_API_BASE_URL`, which is the public API origin.

## What you still configure

- Serve the site and the API over HTTPS.
- Set `ALLOWED_ORIGINS` to the real site origin. An empty production list rejects browser origins.
- Set `DATA_ENCRYPTION_PRIVATE_KEY` before running more than one API instance.
- If the API host is not a `*.up.railway.app` address, add that origin to `client/public/_headers` `connect-src`.
