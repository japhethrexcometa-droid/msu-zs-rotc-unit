# Security Policy

## Supported Versions

Currently, the `rotc-pwa` project is in active development. All security patches and updates will be applied to the `main` branch.

| Version | Supported          |
| ------- | ------------------ |
| Main    | :white_check_mark: |
| < 1.0.0 | :x:                |

## Reporting a Vulnerability

Security is a top priority for this ROTC Progressive Web Application. Since this application handles potentially sensitive data (user identities, attendance, scanning data), any security vulnerabilities should be reported immediately.

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report them privately to the lead maintainer or via the designated secure channel.
Include the following information in your report:
- Type of vulnerability (e.g., XSS, SQLi, CSRF, RLS Bypass)
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if available)
- The potential impact of the vulnerability

We will aim to acknowledge receipt of your vulnerability report within 48 hours and will send regular updates about our progress in resolving the issue.

## Development Security Best Practices

As outlined in our `.gemini-pro.md` rules, all developers (and AI agents) working on this project must adhere to the following standards:

1. **Row Level Security (RLS):** All Supabase tables must have explicit RLS policies. No data should be queryable by unauthorized users.
2. **Data Validation:** All client-side and server-side data mutations must be validated using `zod` schemas.
3. **Authentication:** Only utilize secure session management provided by `@supabase/supabase-js`. Never manually store JWTs in insecure storage.
4. **Dependency Management:** Regularly run `npm audit` to patch known vulnerabilities.
5. **Secrets:** Never commit `.env` files or hardcode API keys.

---
*This policy is designed to ensure the integrity and confidentiality of the ROTC PWA system against modern cybersecurity threats.*
