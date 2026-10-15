# CESBank — Laravel + React (Final Project)

The CESBank native PHP system, rebuilt as a **Laravel 13 REST API** (backend) and a **React 19 + Vite** single-page app (frontend), on **MySQL**. It includes **Sign in with Google**.

```
CESBank_Final/
├── Backend/    Laravel API  → http://localhost:8000/api
└── Frontend/   React app    → http://localhost:5173
```

## Features

| Role | Can do |
|---|---|
| **Administrator** | Dashboard with stats and 14-day volume chart, manage every user (create / edit / activate / deactivate / delete), open bank accounts, process transactions, approve or decline loans, reports, full activity log |
| **Employee (teller)** | Teller dashboard, register customers, open accounts, deposits / withdrawals / transfers, loans, reports |
| **Customer** | Own dashboard and accounts, send money to any account number (with recipient name check), apply for loans with a live monthly payment estimate, edit profile, change password |

New in this version (compared with the native PHP project):
- Google Sign-In; a new Google user is registered as a Customer automatically
- Customer self-registration
- Pagination, search and date filters on every list
- Recipient lookup before a transfer, and printable transaction receipts
- Loan amortization (monthly payment and total payable)
- Printable reports in the browser (Print / Save as PDF)
- Profile page; Google-only users can set a password

## Architecture (MVC)

**Backend (`Backend/`)**
- `app/Models`: Eloquent models (`User`, `Customer`, `Account`, `Transaction`, `Loan`, `ActivityLog`) with relationships and query scopes (`visibleTo`, `ownedBy`, `active`)
- `app/Http/Controllers`: thin JSON controllers, one per resource; `Auth/AuthController` and `Auth/GoogleAuthController` handle sign-in
- `app/Http/Requests`: Form Request validation (`UserRequest`, `TransactionRequest`, `LoanRequest`, `RegisterRequest`)
- `app/Services/TransactionService.php`: money movement inside a DB transaction with row locks (`lockForUpdate`) so balances can't be overdrawn
- `app/Http/Middleware/EnsureRole.php`: role-based route guard (`role:Administrator,Employee`)
- `routes/api.php`: every endpoint, grouped by role
- `database/migrations` and `database/seeders`: schema and demo data
- Auth: Laravel Sanctum bearer tokens

**Frontend (`Frontend/src/`)**
- `api/client.js`: Axios instance that attaches the token and handles 401s
- `context/AuthContext.jsx`: session state (login, Google login, register, logout)
- `components/`: layout, sidebar, route guards, shared UI (modal, badge, pagination…), `GoogleLoginButton`
- `pages/`: Login, Register, Dashboard (admin / teller / customer), Users, UserDetail, Transactions, Loans, Reports, ActivityLog, Profile
- `hooks/usePaginated.js`: shared list loading with filters and pages

## Setup

Requirements: XAMPP (PHP 8.3+, MySQL), Composer, Node.js 20+.

### 1. Backend
```bash
cd C:/xampp/htdocs/CESBank_Final/Backend
composer install
```
In `Backend/.env`, check the database settings (`DB_DATABASE=cesbank_final_db`, `DB_USERNAME`, `DB_PASSWORD`). Create the empty `cesbank_final_db` database in phpMyAdmin, then run:
```bash
php artisan migrate:fresh --seed
php artisan serve
```

### 2. Frontend (in a second terminal)
```bash
cd C:/xampp/htdocs/CESBank_Final/Frontend
npm install
npm run dev
```
Open http://localhost:5173.

### Demo accounts (password: `password123`)
| Username | Role |
|---|---|
| `admin` | Administrator |
| `teller` | Employee |
| `jdelacruz`, `msantos` | Customer |

## Enabling Google Sign-In (free)

1. Go to https://console.cloud.google.com/ and sign in with any Google account.
2. Create a project (top bar → **New Project**, e.g. "CESBank").
3. Go to **APIs & Services → OAuth consent screen** (shown as **Google Auth Platform → Branding** in newer consoles). Choose **External**, enter an app name and your email, and save. While the app is in **Testing**, add the Google accounts you will demo with under **Audience → Test users**.
4. Go to **APIs & Services → Credentials → Create credentials → OAuth client ID** (or **Google Auth Platform → Clients → Create client**).
   - Application type: **Web application**
   - **Authorized JavaScript origins**: `http://localhost:5173` and `http://localhost`
   - No redirect URI is needed.
5. Copy the **Client ID** (it ends in `.apps.googleusercontent.com`). You do not need the client secret.
6. Paste it into `Backend/.env`:
   ```
   GOOGLE_CLIENT_ID=1234567890-abc...apps.googleusercontent.com
   ```
7. Run `php artisan config:clear` and refresh the login page. The "Sign in with Google" button appears.

**How it works:** Google's button gives the React app a signed ID token. The app posts it to `POST /api/auth/google`. Laravel checks the token with Google (`oauth2.googleapis.com/tokeninfo`): it must be issued for our Client ID, be unexpired, and have a verified email. Laravel then signs in the matching user (by Google ID, or by email to link an existing account) or registers a new Customer, and returns a Sanctum token like a normal login.

## API overview

| Method | Endpoint | Who |
|---|---|---|
| POST | `/api/login`, `/api/register`, `/api/auth/google` | Public |
| GET | `/api/me`, `/api/dashboard` | Signed in |
| GET/POST | `/api/transactions`, `/api/loans` | Signed in (customers see only their own records) |
| GET | `/api/accounts`, `/api/accounts/lookup/{number}` | Signed in |
| GET/POST/PUT | `/api/users`, `/api/users/{id}` | Admin, Employee |
| POST | `/api/customers/{id}/accounts` | Admin, Employee |
| PATCH | `/api/loans/{id}/status`, `/api/accounts/{id}/status` | Admin, Employee |
| GET | `/api/reports/transactions`, `/api/reports/accounts` | Admin, Employee |
| PATCH/DELETE | `/api/users/{id}/status`, `/api/users/{id}` | Admin |
| GET | `/api/activity-logs` | Admin |

Run `php artisan route:list --path=api` to list every endpoint.
