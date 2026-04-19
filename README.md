# Superplot

A private property management vault for Indian households. Track real estate properties, store legal documents securely in your own Google Drive, and manage family access — all from a single dashboard.

![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Postgres-3FCF8E?logo=supabase&logoColor=white)
![Google Drive](https://img.shields.io/badge/Google%20Drive-API-4285F4?logo=googledrive&logoColor=white)

---

## Features

- **Property Dashboard** — Overview of all properties with documentation completeness scores
- **17 Indian Legal Document Types** — Track encumbrance certificates, sale deeds, pahani, tax receipts, and more
- **Google Drive Storage** — Documents stored in your own Drive, organized by property folders
- **Street View Previews** — Property cards show Google Street View photos (with map embed fallback)
- **Role-Based Access Control** — Invite family members as contributors or viewers
- **Multi-Account Support** — Switch between your own properties and accounts you've been invited to
- **Search** — Find properties by name, address, ZIP, or missing document type
- **Upload with Progress** — Drag-and-drop uploads with real-time progress tracking
- **Drive Sync** — Renaming a property renames its Drive folder; deleting removes Drive files
- **Email Invitations** — Send invite emails to new members via Resend
- **Subscription & Billing** — Free tier (3 properties, 1 invite) + Premium via Razorpay (₹99/mo or ₹999/yr)
- **Responsive Design** — Works on desktop and mobile with light glassmorphism theme

---

## Tech Stack

| | Technology |
|---|---|
| **Server** | Express 4.21 + Vite 5.4 (dev middleware) |
| **Frontend** | React 18 + React Router 6 |
| **Database** | Supabase Postgres (RLS + service role key) |
| **Auth** | Supabase Auth (Google OAuth, PKCE flow) |
| **Storage** | Google Drive API (`drive.file` scope) |
| **Email** | Resend |
| **Payments** | Razorpay Subscriptions |
| **Maps** | Google Maps Embed + Street View Static API |
| **Styling** | Pure CSS with custom properties (light glassmorphism theme) |
| **Hosting** | Vercel (serverless functions + static SPA) |

No TypeScript. No Next.js. No Tailwind.

---

## Prerequisites

- **Node.js** 18+
- **Supabase** project (free tier works)
- **Google Cloud** project with OAuth 2.0 credentials
- **Resend** account (optional, for invitation emails)
- **Google Maps API key** (optional, for Street View previews)
- **Razorpay** account (optional, for premium subscriptions)

---

## Setup

### 1. Clone & Install

```bash
git clone https://github.com/SVirat/Superplot.git
cd Superplot
npm install
```

### 2. Supabase

1. Create a [Supabase](https://supabase.com) project
2. Go to **SQL Editor** and run the migration file:
   ```
   supabase/migrations/001_create_tables.sql
   ```
   This creates all 5 tables (`user_profiles`, `properties`, `documents`, `account_members`, `subscriptions`), RLS policies, indexes, and triggers.
3. Go to **Authentication → Providers → Google** and enable it with your Google OAuth credentials
4. Set the redirect URL to: `http://localhost:3000/auth/callback`
5. Copy your project URL, anon key, and service role key from **Settings → API**

### 3. Google Cloud

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create OAuth 2.0 credentials (**Web application** type)
3. Add authorized redirect URI: your Supabase auth callback URL (found in Supabase dashboard under Authentication → URL Configuration)
4. Add authorized JavaScript origin: `http://localhost:3000`
5. Enable the **Google Drive API** in APIs & Services → Library
6. (Optional) Enable the **Street View Static API** for property previews

### 4. Environment Variables

Copy the example and fill in your values:

```bash
cp .env.example .env
```

```env
# Required
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-client-secret"

# Optional
GDRIVE_ROOT_FOLDER_NAME="Superplot"     # Root folder name in Google Drive
RESEND_API_KEY=""                            # For invitation emails
APP_URL="http://localhost:3000"              # For email links
GOOGLE_MAPS_API_KEY=""                       # For Street View property previews
RAZORPAY_KEY_ID=""                           # Razorpay API key
RAZORPAY_KEY_SECRET=""                       # Razorpay API secret
RAZORPAY_WEBHOOK_SECRET=""                   # Razorpay webhook secret
RAZORPAY_PLAN_MONTHLY=""                     # Razorpay monthly plan ID
RAZORPAY_PLAN_ANNUAL=""                      # Razorpay annual plan ID
VITE_RAZORPAY_KEY_ID=""                      # Same as RAZORPAY_KEY_ID (exposed to frontend)
VITE_RAZORPAY_PLAN_MONTHLY=""                # Same as RAZORPAY_PLAN_MONTHLY (exposed to frontend)
VITE_RAZORPAY_PLAN_ANNUAL=""                 # Same as RAZORPAY_PLAN_ANNUAL (exposed to frontend)
```

### 5. Run

```bash
node server.js
```

Open [http://localhost:3000](http://localhost:3000) and sign in with Google.

---

## Project Structure

```
Superplot/
├── server.js                    # Express server + all API routes (exports app for serverless)
├── package.json
├── vite.config.js
├── vercel.json                  # Vercel deployment config
├── index.html                   # SPA entry point
├── .env.example                 # Environment variable template
├── .gitignore
├── LICENSE.md                   # Proprietary license
├── api/
│   └── index.js                 # Vercel serverless entry point
├── docs/
│   ├── PRD.md                   # Product requirements document
│   ├── PRIVACY_POLICY.md
│   └── TERMS_AND_CONDITIONS.md
├── supabase/
│   └── migrations/
│       └── 001_create_tables.sql
└── src/
    ├── App.jsx                  # Routes (lazy-loaded)
    ├── main.jsx                 # React entry
    ├── index.css                # All styles
    ├── lib/
    │   ├── api.js               # API client + auth headers
    │   ├── auth.jsx             # Auth context + account switching
    │   ├── constants.js         # Doc types, roles, utilities
    │   ├── format.js            # Currency/date/number formatters
    │   └── supabase.js          # Supabase client + config
    ├── components/
    │   ├── DocumentList.jsx     # Document vault with 17 type slots
    │   ├── Header.jsx           # Top bar + user menu
    │   ├── MapPreview.jsx       # Street View / map embed / placeholder
    │   ├── PropertyCard.jsx     # Property card for grids
    │   ├── PropertyForm.jsx     # Add/edit property form
    │   ├── PropertyGrid.jsx     # Responsive card grid
    │   ├── Sidebar.jsx          # Nav + account switcher
    │   └── UploadDialog.jsx     # Upload modal + progress
    └── pages/
        ├── Access.jsx           # Member management
        ├── AuthCallback.jsx     # OAuth callback
        ├── Dashboard.jsx        # Stats + property grid
        ├── Landing.jsx          # Public landing page
        ├── Properties.jsx       # Property listing
        ├── PropertyDetail.jsx   # Property deep-dive
        ├── PropertyEdit.jsx     # Edit property
        ├── PropertyNew.jsx      # New property
        ├── Search.jsx           # Search + filters
        ├── Settings.jsx         # App settings
        └── SignIn.jsx           # Sign-in page
```

---

## API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/config` | Public config (Supabase URL, anon key, Maps key) |
| GET | `/api/user` | Current user + account list |
| POST | `/api/auth/tokens` | Save Google OAuth tokens |
| GET | `/api/properties` | List properties |
| POST | `/api/properties` | Create property |
| GET | `/api/properties/:id` | Get property (slug or UUID) |
| PATCH | `/api/properties/:id` | Update property + rename Drive folder |
| DELETE | `/api/properties/:id` | Delete property + Drive cleanup |
| POST | `/api/documents/upload` | Upload document to Drive |
| DELETE | `/api/documents/:id` | Delete document from DB + Drive |
| GET | `/api/search` | Search properties |
| GET | `/api/members` | List account members |
| POST | `/api/members` | Invite member (+ send email) |
| PATCH | `/api/members/:id` | Update member role |
| DELETE | `/api/members/:id` | Remove member |
| POST | `/api/subscription/create` | Create Razorpay subscription |
| POST | `/api/webhooks/razorpay` | Razorpay webhook (no auth) |

All endpoints (except `/api/config`) require authentication via `Authorization: Bearer <token>` header. Multi-account requests include `X-Account-Id` header.

---

## Roles & Permissions

| Role | View | Upload | Edit/Delete | Manage Access |
|------|------|--------|-------------|---------------|
| **Admin** (owner) | ✅ | ✅ | ✅ | ✅ |
| **Family — Contributor** | ✅ | ✅ | ❌ | ❌ |
| **Family — View Only** | ✅ | ❌ | ❌ | ❌ |
| **Non-Family — View Only** | ✅ | ❌ | ❌ | ❌ |

---

## Document Types Tracked

| Document | Description |
|----------|-------------|
| Encumbrance Certificate | Proof of no pending charges on property |
| Certified Sale Deed | Registered deed of sale |
| Pahani / ROR 1B | Record of rights for agricultural land |
| Survey Map | Government survey sketch |
| Bhu Bharati EC | Telangana online encumbrance certificate |
| Pattadhar Passbook | Land ownership passbook |
| Property Report | Valuation or inspection report |
| Property Tax Receipt | Municipal tax payment proof |
| CDMA Property Tax Receipt | CDMA area tax receipt |
| Building Permission | Construction approval document |
| Land Use Certificate | Zoning/land classification certificate |
| Mortgage Report | Mortgage-related documentation |
| Vaastu Report | Vaastu compliance assessment |
| RERA Certificate | Real Estate Regulatory Authority registration |
| Sale Deed Receipt | Receipt for sale deed registration fees |
| Other | Any other document |
| Photos | Property photographs |

**Documentation score** = (unique types uploaded, excluding Other & Photos) / 15 × 100%

---

## Google Drive Behavior

- Documents are stored in the user's **own Google Drive** under a configurable root folder (default: `Superplot`)
- Each property gets its own subfolder (named after the property)
- Renaming a property **renames** the Drive folder
- Deleting a property **deletes** the Drive folder and all files
- Deleting a document **deletes** the file from Drive
- The app uses the `drive.file` scope — it can only access files it created

---

## Deployment (Vercel)

The app is deployed to [Vercel](https://vercel.com) at **https://superplot.vercel.app**.

### Setup

1. Import the GitHub repo in Vercel
2. Set **Framework Preset** to **Other**
3. Set **Build Command** to `npx vite build`
4. Set **Output Directory** to `dist`
5. Add all environment variables from `.env.example` in **Settings → Environment Variables**
   - Set `APP_URL` to `https://superplot.vercel.app`
6. Deploy

### How It Works

- Vite builds the React SPA to `dist/` (served as static files)
- All `/api/*` requests route to a single serverless function (`api/index.js`) that re-exports the Express app
- On Vercel, `server.js` skips Vite middleware and `app.listen()` (detected via `process.env.VERCEL`)

---

## License

Private. All rights reserved.
