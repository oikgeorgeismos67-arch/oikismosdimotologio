# Ψηφιακό Δημοτολόγιο — React + Firebase

Starter implementation for a municipal service portal. It includes administrator email/password login, citizen phone/SMS login, manual citizen verification, citizen request submission, an admin request queue, Firestore/Storage rules and trusted Cloud Functions.

## Publish the web interface with GitHub Pages

This repository includes `.github/workflows/deploy.yml`. Before the first deployment:

1. In the repository, open **Settings → Pages** and set **Build and deployment → Source** to **GitHub Actions**.
2. Open **Settings → Secrets and variables → Actions → Variables** and add these repository variables from Firebase Console → Project settings → Your apps: `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, and `VITE_FIREBASE_STORAGE_BUCKET`. These are browser Firebase configuration values, not service-account credentials.
3. Push/commit the files to the `main` branch, then open **Actions** and inspect the `Deploy Dimotologio to GitHub Pages` workflow.
4. The expected address is `https://YOUR-GITHUB-USERNAME.github.io/dimotologio-app/`. The Vite base path and hash-based routing are configured for that repository name. If you rename the repository, update `base` in `vite.config.js`.
5. In Firebase Authentication → Settings → Authorized domains, add `YOUR-GITHUB-USERNAME.github.io`. Configure Authentication sign-in methods, Firestore, Storage, App Check and Cloud Functions separately. GitHub Pages deploys only the frontend; it does not deploy the Firebase backend.

GitHub Pages sites are public-facing. A private source repository does not make the deployed site private, and private-repository Pages availability depends on your GitHub plan. For a real municipal service, Firebase Hosting or another municipality-approved hosting environment may be a better fit for security headers, SPA rewrites and operational controls.


> **Production warning:** This repository is a secure-by-default starting point, not a certified or deployment-ready municipal civil-register system. Do not import real citizen data or go live until a security review, privacy impact assessment where required, legal review, accessibility review, backup/restore test, incident response process, and operational acceptance testing are complete. The app does not implement a complete legally authoritative Greek municipal register, certificate issuance/signature, or integrations with government systems.

## Requirements

- Node.js 20 or newer
- npm
- Firebase project with billing enabled as required by Phone Authentication, Cloud Functions and App Check
- Firebase CLI: `npm install -g firebase-tools`
- Google Cloud IAM access for deployment and administrator provisioning

## 1. Create Firebase project

1. In Firebase Console create a dedicated project for the municipality. Use a separate project for development/staging and production.
2. Add a Web App under Project settings and copy the Firebase web configuration values.
3. In **Authentication > Sign-in method**, enable **Phone** and **Email/Password**.
4. In **Authentication > Settings > Authorized domains**, add the exact development and production domains.
5. In **Firestore Database**, create the database in a suitable European location based on the municipality's legal, security and data-residency assessment. Location choice can be difficult to change later.
6. Create the Storage bucket if using attachments.
7. Register the web app for **Firebase App Check**. Use reCAPTCHA Enterprise or another currently supported provider as appropriate; deploy enforcement only after validating production traffic. The callable functions in this template use `enforceAppCheck: true`.
8. Configure billing, budgets and alerts. Do not use personal accounts as the sole owners of the production project.

## 2. Configure the React application

```bash
cp .env.example .env.local
npm install
npm run dev
```

Populate `.env.local` from Firebase Console:

```dotenv
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
VITE_USE_FIREBASE_EMULATORS=false
```

These Firebase web config values are identifiers, not server credentials. Never put service-account keys, Admin SDK credentials or private secrets in `VITE_*` variables or the browser bundle.

Phone authentication requires a visible reCAPTCHA check. Use Firebase test phone numbers only in development/test environments; never rely on test numbers in production.

## 3. Install and deploy Firebase backend

From project root:

```bash
npm install
cd functions
npm install
cd ..
firebase login
firebase use --add
```

Select the intended Firebase project and carefully verify its ID before deployment.

Deploy rules, indexes, storage rules and functions:

```bash
firebase deploy --only firestore:rules,firestore:indexes,storage,functions
```

If using a fresh project, enable Cloud Functions and required Google Cloud APIs. Confirm the deployed region matches `europe-west1` in `src/firebase.js` and `functions/index.js`.

## 4. Create the first administrator

1. In Firebase Console > Authentication, create an administrator account using the intended work email and a strong unique password.
2. Enable MFA for administrative accounts where operationally supported; restrict project owner/editor permissions separately with Google Cloud IAM.
3. From the repository root, install Admin SDK for the provisioning script:

```bash
npm install --no-save firebase-admin
gcloud auth application-default login
node scripts/create-admin.mjs admin@example.gov.gr
```

Use a trusted workstation and a Google identity with only the IAM permissions needed. Alternatively set `GOOGLE_APPLICATION_CREDENTIALS` to a service account file stored outside the repository and protected by your organization. Do not commit service account keys. The account must already exist in Firebase Authentication.

The script sets the `admin` custom claim. The administrator must sign out and sign in again so the ID token refreshes. Do not grant the admin claim from client-side code. Remove the claim and disable access promptly when staff leave or change roles.

## 5. Citizen verification workflow

1. A citizen signs in with phone SMS OTP.
2. The trusted `ensureCitizenProfile` function creates a minimal profile with `status: pending`.
3. The citizen cannot access the portal or submit requests until approved.
4. A staff member verifies identity and municipal relationship using the municipality's approved process outside this application.
5. An administrator approves/rejects the profile in **Έλεγχος πολιτών**. The Cloud Function changes status and records an audit event.

A phone number OTP proves control of a phone number only. It is not proof of legal identity, residency or municipal-register membership. Before approving a user, staff must use the approved verification process and record only the minimum required information.

## 6. Security model

- Admin permissions are custom claims assigned using trusted Admin SDK credentials.
- Browser clients cannot create/update profiles, official citizen-register records or audit logs directly.
- Citizens can read only their own request records and may create requests only after approval.
- Request status changes and citizen approval go through callable functions that check the admin claim and write audit records.
- Storage uploads are namespaced by user UID and restricted by size and MIME type. MIME type checks alone do not prove a file is safe; add malware scanning/content validation before handling real documents.
- `citizens` is accessible only to admins in the provided rules. It is not yet connected to a full register management UI.
- Use least privilege, MFA, App Check, rate limiting/abuse monitoring, alerting, log retention controls and periodic access reviews.

## 7. Local emulators

Install Java if required by the current Firebase Emulator Suite. Then:

```bash
# Set VITE_USE_FIREBASE_EMULATORS=true in .env.local
firebase emulators:start
```

The UI emulator currently points to localhost endpoints. Test all roles and unauthorized paths using the Emulator Suite and automated rules tests before deploying.

## 8. Build and host

```bash
npm run build
```

Deploy `dist/` to Firebase Hosting or an approved hosting service with HTTPS, restrictive security headers and a configured SPA fallback. Review the host's logs, region, subprocessors and retention before production.

For Firebase Hosting, add a `hosting` configuration to `firebase.json` after deciding the site ID and headers. Do not deploy a production site until all environment values, domains, App Check, rules, monitoring and rollback plans are verified.

## 9. Pre-production acceptance checklist

- [ ] Confirm legal basis, purpose limitation, retention periods and privacy notice with the municipality's DPO/legal counsel.
- [ ] Complete a DPIA if required; establish data-subject request and breach-notification procedures.
- [ ] Define authorized roles and a documented joiner/mover/leaver process.
- [ ] Test Firestore and Storage rules with positive and negative automated tests.
- [ ] Test account enumeration, OTP abuse, rate limits, App Check and session revocation.
- [ ] Add malware scanning and safe handling for all uploaded documents.
- [ ] Add request pagination, audit review, secure exports, retention/deletion workflows and backup/restore drills.
- [ ] Implement and test official-register operations, duplicate detection, approval controls and legally valid certificate issuance if needed.
- [ ] Run accessibility, penetration and load testing; document incident response and disaster recovery.
- [ ] Verify no production data appears in logs, analytics, screenshots or developer tools.
- [ ] Have the responsible municipal IT/security officer formally approve the go-live.

## Main structure

```text
src/
  auth/AuthContext.jsx
  components/Layout.jsx
  components/Protected.jsx
  pages/Admin.jsx
  pages/Citizens.jsx
  pages/Login.jsx
  pages/NewRequest.jsx
  pages/Portal.jsx
  pages/Requests.jsx
  pages/Verification.jsx
  firebase.js
  App.jsx
  main.jsx
  styles.css
functions/
  index.js
firestore.rules
storage.rules
firestore.indexes.json
scripts/create-admin.mjs
```
