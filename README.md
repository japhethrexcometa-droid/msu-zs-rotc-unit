# MSU ZS ROTC Unit Portal

A Professional Web Application (PWA) for managing ROTC enrollments, attendance, and cadet records.

## 🚀 Key Features
- **Public Enrollment:** Online student enrollment with automatic account creation.
- **Admin Dashboard:** Review and manage enrollment requests with live updates.
- **Email Queue:** Non-blocking email notifications for approvals and rejections.
- **Attendance System:** QR-code based attendance tracking.

## 🛠️ Tech Stack
- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS.
- **Backend:** Supabase (Auth, Database, RLS).
- **Serverless:** Vercel Functions (Node.js).
- **State Management:** Zustand & React Query.

## 📧 Email Cron Optimization (Vercel Hobby)

Since Vercel Hobby only supports daily cron jobs, we use a GitHub Action as an external scheduler to process the email queue every 15 minutes.

### Setup GitHub Actions Cron:
1. Go to your GitHub Repository **Settings** > **Secrets and variables** > **Actions**.
2. Add the following **Repository secrets**:
   - `VITE_SUPABASE_URL`: Your full production URL (e.g., `https://rotc-app.vercel.app`).
   - `CRON_SECRET`: The same secret used in your Vercel Environment Variables.
3. The workflow is already configured in `.github/workflows/process-emails.yml`.

### Manual Trigger:
Admins can also manually trigger the email queue by clicking the **"Process Emails"** button in the Enrollment Management dashboard.

## 🛡️ Environment Variables

The following variables are required in Vercel/GitHub:
- `VITE_SUPABASE_URL`: Supabase Project URL.
- `VITE_SUPABASE_ANON_KEY`: Supabase Anonymous Key.
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase Service Role Key (Server-only).
- `SMTP_EMAIL`: Gmail account for sending notifications.
- `SMTP_PASSWORD`: Gmail App Password.
- `CRON_SECRET`: Random string for securing the email cron endpoint.

## 📦 Development
1. Clone the repository.
2. Install dependencies: `npm install`.
3. Create a `.env` file based on `.env.example`.
4. Start development server: `npm run dev`.
