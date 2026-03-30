# BCA Transaction & Litigation Management System

A premium dashboard for managing court cases, transactions, and legal letters. Built with React, TypeScript, Vite, and Supabase.

## 🚀 Recent Features (v1.2.0)

### ⚖️ Registry Filing Workflow
We've introduced a streamlined system for handling court document filings via ECCMIS:
- **Lawyers**: Can now request document filings directly from the **Registry** tab in any court case matter.
- **Assignment**: Requests can be assigned to Managers or Clerks for processing.
- **Tracking**: Real-time status updates from "Pending" to "Completed", including ECCMIS reference numbers and staff notes.
- **Performance**: Filing activities are now automatically logged in the Performance Dashboard for time accounting and work reporting.

### 📊 Performance Analytics
- Enhanced work reports with dedicated sections for **Registry Filings**.
- Automated CSV exports for weekly work summaries.

## 🛠 Tech Stack
- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Backend/DB**: Supabase
- **Utilities**: Lucide Icons, Framer Motion for animations

## ⚙️ Setup
1. Clone the repository.
2. Install dependencies: `npm install`
3. Configure `.env` with Supabase credentials.
4. Run locally: `npm run dev`
