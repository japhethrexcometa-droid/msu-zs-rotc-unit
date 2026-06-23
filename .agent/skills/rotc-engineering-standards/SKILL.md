---
name: rotc-engineering-standards
description: >
  Professional engineering standards and architecture flow for the ROTC PWA system.
  Triggers whenever an agent makes architectural changes, adds new features, or modifies authentication/database logic.
---

# ROTC PWA Engineering Standards

This document outlines the professional engineering flow for the ROTC PWA to prevent bugs and amateur implementations. ALL future AI agents must strictly adhere to these rules.

## 1. Authentication & Security
- **Strictly use Supabase Native Auth**: Never implement manual cryptography (e.g., custom SHA256/bcrypt scripts). Always rely on `supabase.auth.signInWithPassword()` and the official `auth.users` table.
- **Seeding Users**: When seeding admin or test accounts into the database, use Supabase's `pgcrypto` extension (`extensions.crypt`) to insert directly into `auth.users`, ensuring full integration with native authentication.
- **Session Management**: Do not implement parallel client-side session timers. Always sync client state (like Zustand) by listening to official `onAuthStateChange` events from the Supabase client.

## 2. Architecture Flow & Domain Logic
- **Prevent Domain Distortion (Anemic Domain Model)**: Do not tangle core business rules (e.g., calculating if a cadet is "late" based on timestamps) inside database service layers (`supabase.from(...)`). 
- **Decoupled Logic**: Extract pure business logic into standalone utility functions that can be unit-tested completely independently of the database or external APIs.
- **Role-Based Routing**: Maintain strict route separation for `/admin`, `/officer`, and `/cadet` using the established `ProtectedRoute` pattern.

## 3. Database Migrations
- **Incremental Changes**: Always write sequential SQL migrations. If a migration fails or is partially applied, write a specific "repair" migration (like `repair_seed_admin.sql`) instead of manually editing production data.
- **Row Level Security (RLS)**: Every new table MUST have RLS enabled. Write explicit policies for select, insert, update, and delete based on the user's role defined in the linked `public.users` table.

## 4. Notifications (Resend)
- **Environment Isolation**: Never place production API keys in the frontend codebase. Use Supabase Edge Functions or a secure backend environment to trigger Resend emails.
- **Dynamic Routing**: Email addresses must always be retrieved dynamically from the database record during the approval flow, never hardcoded.
