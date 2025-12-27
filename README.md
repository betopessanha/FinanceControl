# FleetLedger | Premium Trucking & Fleet Accounting

A high-performance, professional-grade accounting system tailored for the **USA Trucking Industry**. This application bridges the gap between operational dispatch and financial accounting, providing a seamless workflow for Owner-Operators and Fleet Managers.

![FleetLedger UI](https://img.shields.io/badge/UI-Ultra--Premium-black)
![License](https://img.shields.io/badge/License-MIT-blue)

## 🚀 Key Features

### 🏦 Comprehensive Financial Control
- **Multi-Entity Management**: Separate Business (LLC/S-Corp) accounts from Personal (Individual) expenses with one click.
- **Advanced Ledger**: Real-time audit trail with perspective-aware transfers (automatically handles signs for sending vs. receiving accounts).
- **Chart of Accounts**: Customizable categories aligned with **IRS Schedule C** requirements.
- **Fiscal Closures**: Lock accounting periods (monthly/yearly) to ensure data integrity for tax filings.

### 🚛 Operational Logistics (Dispatch Hub)
- **Trip Planner**: Calculate deadhead (empty) vs. loaded miles to project Gross Revenue.
- **Load Ledger**: Track every load, unit revenue, and equipment assignment.
- **Fleet Inventory**: Manage trucks with detailed unit records (Make, Model, Year).

### 🤖 Intelligent Features
- **Gemini AI Integration**: Smart transaction analysis and automated data processing using Google's latest models.
- **Cloud/Local Hybrid**: Seamless synchronization with **Supabase** for multi-device access, with a robust local-first engine fallback.

### 📊 Professional Reporting
- **Dynamic P&L**: Interactive Profit & Loss statements with Summary and Monthly views.
- **Tax Center**: Direct mapping of categories to official IRS Form 1040 (Schedule C) lines.
- **Universal Export**: Export any financial data to CSV or professional PDF formats.

## 🛠️ Tech Stack

- **Frontend**: React 19 (ES6+), TypeScript
- **Icons**: Lucide React
- **Charts**: Recharts
- **Backend/Database**: Supabase (PostgreSQL)
- **Intelligence**: Google Gemini API (@google/genai)
- **Styling**: Bootstrap 5 + Custom Ultra-Premium CSS Utility Layer

## 📦 Setup & Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/fleet-ledger.git
   ```

2. **Configure Cloud Environment**
   - Create a project at [Supabase](https://supabase.com).
   - Execute the schema SQL (available in the `/docs` folder).
   - Add