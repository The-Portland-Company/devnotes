# Project Notes — @the-portland-company/devnotes

## npm publishing — use the 2FA-bypass token in `.env` (no OTP needed)

Publishing this package uses the granular access token in `.env` (`NPM_TOKEN`).
As of 2026-06-27 this token is configured with **`bypass_2fa: true`**, so
`npm publish` works **non-interactively — no OTP, no passkey, no recovery codes.**

Verify the active token any time with:
`curl -s -H "Authorization: Bearer $NPM_TOKEN" https://registry.npmjs.org/-/npm/v1/tokens`
— confirm `"bypass_2fa": true`, write scope on `@the-portland-company/devnotes`,
and that `expiry` hasn't passed (**current token expires 2026-09-25**).

**Token rotation:** when it nears expiry or is revoked, Spencer creates a new
**Granular Access Token** at npmjs.com/settings/s3w47m88/tokens with
*Bypass two-factor authentication = ON*, package read+write scoped to
`@the-portland-company/devnotes`. Swap the value into `.env` (gitignored) and
store a copy in the 1Password "Npmjs" item (id `jedgoqoluoaz3kvimxswikhqfu`).
The `bypass_2fa` flag is fixed at creation and cannot be flipped on an existing
token.

If `npm publish` ever returns `EOTP`, the token in `.env` lacks 2FA bypass
(wrong/expired token) — do NOT reach for npm recovery codes. Fix the token.

### Publish checklist
1. `npm run release:check` (typecheck + tests + pack dry-run).
2. Bump `version` in `package.json`.
3. `npm publish` (runs hands-off via the bypass token).
4. Commit the source + version bump locally; push only when asked.
