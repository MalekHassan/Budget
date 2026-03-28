# Home Budget

A full-featured household budgeting app built with React, TypeScript, and Firebase. Track expenses, manage budgets, scan receipts with AI, and share budgets with family members.

**Live App:** [https://shoot-malek-aya.web.app](https://shoot-malek-aya.web.app)

---

## Features

### Budget Management
- **Monthly budgets** — Set planned amounts for each expense and income category
- **Copy from previous month** — Quickly set up a new month using last month's budget
- **Historical suggestions** — See average planned amounts from the last 3 months
- **Custom categories** — Add, rename, or remove expense and income categories (Arabic + English names)
- **Lock/unlock months** — Prevent accidental edits to past months and avoid selecting them by mistake
- **Excel export** — Download monthly budget data as an Excel file
- **AI-powered receipt scanning** — Upload receipts and let AI extract expenses automatically
- **Share budgets** — Invite family members to collaborate on budget management

### Dashboard
- **Month navigation** — Browse between months with arrow buttons
- **Summary cards** — Total income, total expenses, and savings at a glance
- **Category progress bars** — Visual breakdown of spending per category with color-coded status:
  - **Green** — Under 80% of budget
  - **Yellow** — 80–99% of budget
  - **Gray** — Exactly on target (100%)
  - **Red** — Over budget
- **Recent transactions** — Quick view of the latest 8 transactions
- **Savings percentage badge** — Shows how much you're saving

### Transactions
- **Add/edit/delete** transactions with amount, category, description, and date
- **Budget month picker** — Assign a transaction to a different month's budget (e.g., spend in March but count it toward April's budget)
- **Expense and income** toggle
- **Swipe to edit/delete** on transaction items

### Receipt Scanning (AI-Powered)
- **Upload image** or **take a photo** with live camera
- **Gemini AI** parses the receipt and extracts:
  - Store name (auto-fills description)
  - Total amount
  - Individual line items with prices
- **Editable items** — Fix OCR errors inline, prices auto-recalculate the total
- **Add/remove items** manually before saving
- **Each item saves as a separate transaction** under the selected category

### Multi-Household & Sharing
- **Shared budgets** — Multiple users can share the same budget
- **Invite members** — Add people by email in Settings → Members
- **Remove members** — Remove anyone except yourself
- **Switch budgets** — If you belong to multiple households, switch between them in Settings
- **Create new budget** — Start a personal budget anytime
- **Auto-link on first login** — If your email is already added to a household, you're automatically linked on first sign-in
- **Recovery mode** — If your budget link breaks, Settings shows all available budgets to reconnect

### Analytics
- **Date range selection** — Filter by specific months
- **Bar charts** — Visualize spending by category
- **Month comparison** — Select exactly 2 months to see side-by-side comparison with progress bars
- **Summary statistics** — Total income, expenses, and savings for the selected range

### Data Import
- **Google Sheets import** — Import budget plans, transactions, and notes from CSV
- **Supports** summary sheet (budget categories), transactions sheet, and notes sheet

### Settings
- **Dark/Light theme** toggle
- **Arabic/English** language toggle (full RTL support)
- **Household name editing**
- **Member management** (view, invite, remove)
- **Budget switching**

### Technical Features
- **PWA** — Installable as a mobile app, works offline
- **Real-time sync** — Firestore listeners update data instantly across devices
- **Page transitions** — Smooth fade-in animations between pages
- **Error boundary** — Graceful error handling with recovery UI
- **Responsive design** — Optimized for mobile (390px) and desktop

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript 6 |
| Routing | React Router DOM 7 |
| Styling | CSS Custom Properties, Glass-morphism design |
| Charts | Recharts 3 |
| Icons | Lucide React |
| i18n | i18next + react-i18next (Arabic/English) |
| Auth | Firebase Authentication (Google Sign-In) |
| Database | Cloud Firestore |
| Storage | Firebase Storage (receipt images) |
| AI | Google Gemini API (receipt scanning) |
| Hosting | Firebase Hosting |
| Build | Vite 8, PWA plugin |

---

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── CategoryBar.tsx      # Budget category progress bar
│   ├── CameraCapture.tsx    # Live camera for receipt scanning
│   ├── ErrorBoundary.tsx    # Error boundary wrapper
│   ├── SummaryCard.tsx      # Income/expense/savings cards
│   ├── TransactionForm.tsx  # Add/edit transaction modal
│   └── TransactionItem.tsx  # Transaction list item
├── firebase/            # Firebase configuration & utilities
│   ├── config.ts            # Firebase app initialization
│   ├── firestore.ts         # Firestore CRUD operations
│   └── storage.ts           # Firebase Storage upload utility
├── hooks/               # Custom React hooks
│   ├── useAuth.ts           # Authentication state
│   ├── useHousehold.ts      # Household data & auto-linking
│   ├── useMonthData.ts      # Monthly budget & transaction data
│   └── useTransactions.ts   # Transaction CRUD operations
├── i18n/                # Internationalization
│   ├── index.ts             # i18next configuration
│   ├── en.json              # English translations
│   └── ar.json              # Arabic translations
├── pages/               # Route pages
│   ├── DashboardPage.tsx    # Main dashboard with month navigation
│   ├── MonthlyDetailPage.tsx# Monthly budget detail view
│   ├── AnalyticsPage.tsx    # Charts & month comparison
│   ├── BudgetSetupPage.tsx  # Budget category setup
│   ├── SettingsPage.tsx     # Settings, members, budget switching
│   ├── ImportPage.tsx       # Google Sheets CSV import
│   └── LoginPage.tsx        # Google Sign-In
├── types/               # TypeScript interfaces
│   └── index.ts
├── utils/               # Utility functions
│   ├── aggregation.ts       # Data aggregation for charts
│   ├── currency.ts          # Currency formatting
│   ├── receiptScanner.ts    # Gemini AI receipt parsing
│   └── sheetImport.ts      # CSV parsing for Google Sheets import
├── App.tsx              # Root component with routing
├── main.tsx             # Entry point
└── index.css            # Global styles & CSS variables
```

---

## Prerequisites

- **Node.js** 18+
- **npm** or **yarn**
- **Firebase project** with:
  - Authentication (Google provider enabled)
  - Cloud Firestore
  - Firebase Storage
  - Firebase Hosting
- **Google Gemini API key** (for receipt scanning)

---

## Setup & Development

### 1. Clone the repository

```bash
git clone https://github.com/MalekHassan/Budget.git
cd Budget
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file in the project root:

```env
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

### 4. Firebase configuration

The Firebase config is in `src/firebase/config.ts`. Update the `firebaseConfig` object with your project's credentials:

```typescript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.firebasestorage.app",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
};
```

### 5. Start development server

```bash
npm run dev
```

The app runs at `http://localhost:3000`.

---

## Deployment

### Build for production

```bash
npm run build
```

This outputs to the `dist/` directory.

### Deploy to Firebase Hosting

1. **Install Firebase CLI** (if not installed):

```bash
npm install -g firebase-tools
```

2. **Login to Firebase:**

```bash
firebase login
```

3. **Initialize Firebase** (already configured via `firebase.json` and `.firebaserc`):

```bash
firebase init hosting
# Select "dist" as public directory
# Configure as single-page app: Yes
```

4. **Deploy:**

```bash
firebase deploy --only hosting
```

The app will be live at `https://your-project-id.web.app`.

---

## Firestore Data Model

### Collections

| Collection | Document ID | Fields |
|-----------|------------|--------|
| `households` | Auto-generated | `name`, `members[]`, `currency`, `createdAt` |
| `users` | Firebase Auth UID | `email`, `displayName`, `householdId`, `language`, `createdAt` |
| `months` | `{householdId}_{year}_{month}` | `householdId`, `year`, `month`, `expenseCategories[]`, `incomeCategories[]`, `monthNote`, `createdBy`, `createdAt` |
| `transactions` | Auto-generated | `householdId`, `type`, `amount`, `category`, `description`, `date`, `monthKey`, `createdBy`, `receiptItems[]`, `createdAt`, `updatedAt` |

### Firestore Security Rules

Make sure your Firestore rules allow authenticated users to read/write their household data:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

---

## Firebase Storage CORS (Optional)

If you want to enable receipt image uploads from localhost, apply CORS configuration:

1. Install `gsutil`:
```bash
pip install gsutil
```

2. Create `cors.json`:
```json
[
  {
    "origin": ["*"],
    "method": ["GET", "POST", "PUT", "DELETE"],
    "maxAgeSeconds": 3600
  }
]
```

3. Apply:
```bash
gsutil cors set cors.json gs://your-project-id.appspot.com
```

---

## License

MIT