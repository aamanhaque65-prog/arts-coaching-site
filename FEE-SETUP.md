# Art's Coaching fees: Firebase Spark setup

This version uses Firebase Authentication and Cloud Firestore on the Spark plan. It has no active Cloud Functions or online payment gateway. The cash form is an admin-entered bookkeeping record only; it cannot confirm that money was received. Razorpay code from the earlier implementation remains in `functions/` as inactive source and is not included in `firebase.json` or called by the website. Do not deploy it or enable billing as part of this setup.

## 1. Create three administrator accounts

In Firebase Console, create a Firebase project on the **Spark (no-cost) plan**. Enable **Authentication → Sign-in method → Email/Password**. In **Authentication → Users**, add three separate accounts: the owner, the user's father, and the paternal uncle. Do not enable public sign-up.

For each account, copy its Firebase **UID** from the Users list. These UIDs are identifiers, not passwords or private keys. In both `management.js` and `firestore.rules`, replace the matching placeholders:

| Administrator | Placeholder |
|---|---|
| Owner | `OWNER_ADMIN_UID_FROM_FIREBASE` |
| Father | `FATHER_ADMIN_UID_FROM_FIREBASE` |
| Paternal uncle | `UNCLE_ADMIN_UID_FROM_FIREBASE` |

Use the UID for each named person in the same row. The three IDs must be different. The Firestore rules are the actual access control; a profile field or the browser's admin list is not trusted for authorization. Never put passwords, service-account credentials, or private keys in the website or this repository.

## 2. Connect the web app and Firestore

1. In **Project settings → Your apps**, register a Web app if needed and copy its `apiKey`, `authDomain`, `projectId`, and `appId` into `firebaseConfig` in `management.js`. Firebase web-app configuration is intended to be visible to website visitors; Firestore rules protect the data.
2. In Firebase Console, create a **Cloud Firestore** database. Keep it on the Spark plan and select a suitable database location.
3. In **Firestore Database → Rules**, publish the contents of `firestore.rules` after replacing the three UID placeholders there.
4. In **Authentication → Settings → Authorized domains**, add the hostname serving the GitHub Pages site.
5. In **Firestore Rules → Simulator** or the Rules Playground, verify that each of the three accounts can read the collections and that a signed-out user or any other signed-in UID is denied.
6. Publish the static website through the repository's existing GitHub Pages workflow after the Firebase settings and UIDs are configured.

There is deliberately no `.firebaserc` requirement for the Console-based rules setup. If you later use Firebase CLI to select a project, verify the project name carefully before deploying rules.

## 3. What the dashboard stores

- `students/{studentId}` stores each student's name, class, phone, address, monthly fee and creation time.
- `monthlyFees/{studentId_month}` stores one immutable fee amount, in paise, for a student and month. The dashboard creates this record the first time an admin selects that month.
- `payments/{paymentId}` stores an admin-entered cash ledger entry. A payment must reference an existing student and monthly-fee record. It is not a payment processor or proof of a bank transfer.
- `auditLogs/{auditId}` stores an append-only entry for student creation, monthly-fee creation and cash-ledger entries.

The rules allow only the three configured admin UIDs to read these collections. Browser writes are constrained to create-only for fee, payment and audit records; edits/deletes are denied. Student creation is also admin-only.

## Audit history limitation on Spark

Audit entries are written by the administrator's browser in the same Firestore batch as the related student, monthly-fee or cash-ledger write, and Firestore rules prevent changing or deleting an existing audit entry. This is a useful shared activity history, but it is **not tamper-proof**: any of the three trusted administrators can call Firestore directly and can create misleading entries or make a permitted data write without using this page's audit-writing code. Strong server-enforced audit logging requires a trusted backend such as Cloud Functions, which is not available on Spark. Do not treat this history as a compliance or financial proof log.

## Payments and billing plan

Razorpay Checkout is not loaded by the current management page, no payment secrets are configured, and no real online payments are enabled. The cash workflow only records what an administrator says was received and can make a PDF receipt from that record. UPI and Google Forms are not configured.

Firebase Authentication and Cloud Firestore have Spark-plan no-cost quotas and can be used without enabling billing, subject to Firebase's current limits and terms. GitHub Pages hosts the public static site separately. Firebase Cloud Functions require the Blaze billing plan; do not deploy the dormant `functions/` code or upgrade billing for this Spark setup.
