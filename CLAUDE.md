# Project Notes — @the-portland-company/devnotes

## npm publishing — NEVER burn 2FA recovery codes (critical)

Publishing this package to npm requires 2FA. The token in `.env` (`NPM_TOKEN`)
has **publish rights but does NOT bypass 2FA**, so `npm publish` returns `EOTP`
("one-time password required").

**Rule: if `npm publish` returns `EOTP`, STOP and ask Spencer for a live 6-digit
OTP from his authenticator app.** Do NOT reach for the npm **recovery codes** in
the 1Password "Npmjs" item — those are single-use backup codes, not a routine
OTP source. They were meant for account-lockout recovery, and consuming them to
publish burns them permanently.

History (do not repeat): publishing 0.5.13/0.5.14/0.5.15 consumed recovery codes
**#1, #3, and #4**. As of 2026-06-16 **only #5 remains.** Treat the recovery-code
list as off-limits.

Preferred long-term fix (set up once, then publishes need no OTP): create an npm
**automation token** (or a granular token) with publish access to
`@the-portland-company/devnotes`, store it in the 1Password "Npmjs" item
(id `jedgoqoluoaz3kvimxswikhqfu`), and publish with that token — automation
tokens bypass 2FA. Until that exists, ask for a live OTP per publish.

### Publish checklist
1. `npm run release:check` (typecheck + tests + pack dry-run).
2. Bump `version` in `package.json`.
3. `npm publish` — on `EOTP`, **ask Spencer for a live OTP**, then
   `npm publish --otp=<code>`. Never substitute a recovery code.
4. Commit the source + version bump locally; push only when asked.
