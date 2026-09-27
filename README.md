# Saerbridge Source

Home and renovation planning with a React/Vite frontend and an Express backend. Generated plans, images, quantities and indicative costs require professional review before construction.

Production frontend: https://source.saerbridge.com (Netlify). Backend health: https://saerbridge-source-production.up.railway.app/api/health (Railway). Both services deploy from `main` in this repository.

## One repository, two deployments

Keep `client/` and `server/` in this repository. They have separate lockfiles and deployment services; a coordinated API/UI change can be reviewed in one pull request. Use short feature branches, pull requests and the included GitHub Actions checks. Never commit `.env`, private keys, node_modules or generated user files. Create release tags after the hosted app passes smoke tests. Separate repositories are only useful later if the apps have independent teams, permissions or release cycles.

## Local development

Use Node 24. Run `npm ci` in both client and server. Copy `server/.env.example` to `server/.env` and fill OPENAI_API_KEY locally. In separate terminals run `npm run dev` inside server and client. Open http://localhost:5173. The Vite proxy forwards `/api` to port 3011. Run `npm test` in server and `npm run lint` / `npm run build` in client.

## Netlify frontend

Import this GitHub repository. The root `netlify.toml` sets base `client`, build `npm run build`, publish `dist` and SPA routing. Set **VITE_API_BASE_URL** to your Railway public HTTPS origin (no trailing `/api`). Rebuild after changing it. Do not use a short-timeout serverless proxy for the long-running image stream. The included Content Security Policy permits Railway's `*.up.railway.app` domains; add your exact backend origin to `client/public/_headers` if using a custom domain.

## Railway backend

Deploy the same repository with service root **/server**, Railpack builder, start command **npm start**, and health check **/api/health**. Configure these in Railway service settings: new services cannot opt into the deprecated config-as-code mechanism, so `server/railway.json` is a legacy reference rather than the active configuration. Generate a public HTTPS domain. Set NODE_ENV=production, OPENAI_API_KEY and ALLOWED_ORIGINS to the exact Netlify HTTPS site origin (comma-separate additional trusted origins). The current deployment uses PORT=3011 with the public domain targeting port 3011. Set DATA_ENCRYPTION_PRIVATE_KEY to a stable RSA private key (PEM with actual newlines) through Railway's secret variables; retain it across restarts. The backend uses Windows/system certificates locally without disabling TLS validation.

Use one Railway replica for this initial release: email capabilities, request limits and project state live in process memory. Health path is `/api/health`. A restart clears pending email links. Before a broad public launch, add authenticated quotas or bot protection, persistent project/job storage and shared rate limiting, plus provider spending limits. The existing per-IP limiter is not a substitute for user authentication or a cost budget. GitHub stores the code; pushing it alone does not provision Netlify or Railway hosting.

## Email with Resend

Verify a domain in Resend, create a sending API key, and set **RESEND_API_KEY** and **EMAIL_FROM** (for example `Saerbridge Source <designs@your-verified-domain>`) on Railway only. Never put either secret in a VITE variable. Regenerate a design after enabling these settings. The “Email my design” form includes the available PDF, CSV, plan JSON and image. It requires a valid address and explicit consent. It reports provider acceptance, not confirmed inbox delivery.

The backend issues random capabilities valid for 30 minutes, binds each design to one recipient and uses provider idempotency keys with at most three attempts. It only accepts server-created attachments, not client URLs/body text/files. The in-memory cache is bounded at 32 MB and 100 entries; older links can expire early under load. No email address or capability is placed in a URL or browser storage. Resend handles the email and attachments according to its retention policy. Without credentials, the UI explains that downloads are available instead. Automated tests use a fake provider; a real delivery test requires your credentials and an authorized recipient.

## PWA and mobile

The manifest includes standard and maskable icons. Eligible Chrome browsers show an in-app installation suggestion; the permanent Install app action offers manual instructions on other browsers. Browsers decide eligibility and whether to expose the native prompt. Production requires HTTPS. The production build generates a versioned service worker that caches static app files; it deliberately never caches API data, photos or generated reports. Existing results and unsaved inputs are session-only and are lost on reload. Generation, suppliers and email require connectivity. New service workers wait until existing app tabs close to avoid breaking an active generation.

The responsive shell uses a compact brand header, a native Menu dialog for navigation and saved accessibility settings, and independent Selection, Materials and Design links. Enlarged text uses a labelled section selector when the links no longer fit. Forms, selection cards and results stay in normal document flow; desktop uses a wider two-column planner/results layout. Tap-to-add, duplicate selections and desktop drag/drop are preserved. Expanded previews are actual modal views with focus containment, safe-area spacing, wrapping asset navigation and 48px-or-larger controls. The 3D viewer still loads only when selected.

The cost CSV action is labelled “Download costs (CSV)” and sits between the estimate summary and a keyboard-focusable, horizontally scrollable breakdown. PDF open/download links remain available outside the optional embedded preview. Export payloads, filenames, plan geometry and request handling are unchanged.

## Responsive regression tests

Install both client and server dependencies with `npm ci` in each directory. In `client`, run `npx playwright install chromium` once, then `npm run test:ui`. Tests use the existing Node test runner with Playwright as a browser driver and start their own local Vite server on port 5179. All generation and supplier requests use deterministic fixtures; no paid generation or email requests run. Existing server and production PWA tests remain unchanged.

Set `UI_BROWSER_CHANNEL=chrome` to use an installed Chrome, `UI_BASE_URL` to test an already running local frontend, or `UI_ARTIFACT_DIR` to save screenshots, a verified CSV and viewport measurements. The suite covers 320, 360, 375, 390, 412 and 430 CSS-pixel phones, short landscape, tablets, 1280/1440 desktop, 200% text, keyboard/menu focus, saved preferences, validation, consent, duplicate items, bounded previews and current-result downloads. Standalone display is simulated in the browser test; actual HONOR X7c scaling, virtual keyboard, browser chrome, installation and assistive technology still require physical-device verification.

## Reference documentation

- [Android touch target guidance](https://developer.android.com/guide/topics/ui/accessibility/views/apps-views)
- [PWA installation prompt](https://web.dev/learn/pwa/installation-prompt)
- [Resend send-email API](https://resend.com/docs/api-reference/emails/send-email)
- [Netlify monorepos](https://docs.netlify.com/build/configure-builds/monorepos/)
- [Railway monorepos](https://docs.railway.com/deployments/monorepo)
