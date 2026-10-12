<<<<<<< HEAD
# GigBudget

Daily expense tracker and budgeting app for gig workers (IT3060 HCI Milestone 03 — Group **WD_5**).

**Stack:** Expo React Native (JavaScript) · Express.js · MongoDB · local encrypted SQLite

## Prerequisites (Windows-friendly)

- Node.js 20+ (tested with Node 24)
- npm 10+
- A MongoDB connection string in `backend/.env` as `MONGODB_URI` (this project’s normal path is **MongoDB Atlas**; Docker/local Mongo is optional and not required)
- Android Studio emulator and/or a physical Android phone on the same LAN
- Expo Go works for many screens; **biometrics, encrypted storage edge cases, notifications, and APK** may require an Expo development build

## Repository layout

```text
frontend/     Expo mobile app
backend/      Express REST API + Mongoose models
docs/         Traceability, tests, report draft, progress
postman/      Importable API collection
```

## 1. Backend setup (configured MongoDB — no Docker required)

```powershell
cd backend
copy .env.example .env
# Set MONGODB_URI to your Atlas (or other) URI + JWT secrets. Do not commit .env.
npm install
npm run seed          # idempotent demo data
npm run verify:demo   # login / totals / sync / ownership checks
npm run dev
```

API default: `http://0.0.0.0:4000` → `http://localhost:4000/api/health`

Demo cloud logins (development only): see `docs/DEMO_ACCOUNTS.md`  
Seed behaviour: see `docs/SEED_DATA_GUIDE.md`

Optional: `npm run seed:reset-passwords` resets passwords **only** for seed-owned demo users.

Backend unit tests (isolated; do not point Jest at the demo Atlas DB):

```powershell
npm test
```

`docker-compose.yml` remains available if someone wants a local Mongo container, but it is **not** part of the normal Atlas demo workflow.

## 2. Frontend setup

```powershell
cd frontend
npm install
# Optional: set API URL for your machine
# $env:EXPO_PUBLIC_API_URL="http://192.168.x.x:4000/api"
npx expo start
npm run test:launch-routes   # cold-start route matrix (no device)
npm run test:currency        # display FX arithmetic fixtures
npm run test:vault-pin       # vault-scoped PIN isolation
```

### Appearance, currency, reports

- **Theme:** Settings → Appearance → Light / Dark / System (vault-scoped). See `docs/THEME_AND_CURRENCY.md`.
- **Display currency:** Settings → Currency (LKR, USD, EUR, GBP, INR, AUD). Ledger amounts stay in LKR cents; FX is display-only via `GET /api/fx/rates` + offline cache.
- **Reports:** Dashboard or Analytics → Generate report (PDF/CSV). Guide: `docs/REPORT_GENERATION.md`.
- **Assets:** `docs/ASSETS_LICENCE.md`.

### First launch (sign-in-first, offline still allowed)

Cloud sign-in and registration were moved to the **Welcome** flow to improve discoverability. **Continue offline** remains available to preserve NFR2. PIN and optional biometrics protect local access after onboarding.

1. **Sign in** or **Create account** → create PIN → confirm → biometrics or Skip → initial sync → Dashboard  
2. **Continue offline** → local profile → PIN → biometrics or Skip → Dashboard (Settings → Cloud account to link later)  
3. Returning users: PIN / biometric unlock → Dashboard (no email every launch)

Demo cloud logins and PIN suggestion: `docs/DEMO_ACCOUNTS.md`.

### Physical phone networking

- `localhost` on the phone is the phone itself, **not** your PC.
- Bind API with `HOST=0.0.0.0` (default in `.env.example`).
- Allow Node/Mongo through Windows Firewall for private networks.
- Set `EXPO_PUBLIC_API_URL` to `http://<your-LAN-IP>:4000/api`.
- Android emulator loopback to host: `http://10.0.2.2:4000/api`.

Do not commit a developer-specific IP into source.

## 3. Member module map

| Student | Modules |
| --- | --- |
| IT23549272 Sasmitha P.M.V | Dashboard, net profit, analytics, **financial reports**, income/budget views |
| IT23590830 Amarasekara K.M | Onboarding, registration/account security, Settings (appearance/currency) |
| IT23550162 Sayumi R.P.K | Savings, bills/reminders, alerts, shared design-system tokens |
| IT23348134 Wickramarathna K.P.W.D.N.K | Quick expense, keypad, categories, offline confirm |

Theme and currency services are shared infrastructure across all modules.

See `docs/CRUD_MATRIX.md` and `docs/VIVA_WALKTHROUGH.md`.

## 4. APK / installable build

```powershell
cd frontend
npx expo prebuild --platform android
# or EAS:
# npx eas build -p android --profile preview
```

Record the real APK path and command in `docs/VERIFICATION_RESULTS.md` only after a successful build. If EAS credentials or Android SDK are unavailable, configuration remains in-repo and the blocker is documented there.

## 5. Documentation index

| File | Purpose |
| --- | --- |
| `docs/PROGRESS.md` | Live checklist |
| `docs/REQUIREMENTS_TRACEABILITY.md` | FR/NFR → code → tests |
| `docs/CRUD_MATRIX.md` | Interface CRUD evidence |
| `docs/PROTOTYPE_DEVIATIONS.md` | Justified UI/API changes |
| `docs/FUNCTIONAL_TEST_CASES.md` | Test cases |
| `docs/USABILITY_TEST_PLAN.md` | 5-participant plan + blank sheet |
| `docs/FINAL_REPORT_DRAFT.md` | Export-ready report body |
| `docs/REPORT_GENERATION.md` | PDF/CSV report workflow |
| `docs/THEME_AND_CURRENCY.md` | Light/Dark + display FX rules |
| `docs/ASSETS_LICENCE.md` | Illustration / icon licences |
| `docs/openapi.yaml` | API reference |

## 6. Known limits (honest)

- Usability results require five real/proxy participants — templates only until sessions run.
- Sayumi’s dedicated hi-fi section was not in the supplied PDF; supporting screens follow Sasmitha’s design system and are labelled as newly designed.
- Milestone 01 full research PDF was not supplied; FR/NFR IDs come from the WD_05 Milestone 02 report.
=======
# Gig_Budget_HCI
GibBudget is a financial management app for gig workers to track irregular income, manage daily expenses, calculate net profits, and plan savings. Built with React.js, Node.js, Express.js, and MongoDB, it simplifies budgeting and supports smarter financial decisions.
>>>>>>> f854dd0e0f9bc6699c32ea52f5cdd2a5719b5722
