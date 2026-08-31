# Submission Readiness

Last hardened: 2026-08-31

## P0 — External Submission Blockers

- [ ] Public production site opens without owner authentication in an incognito session.
- [ ] All 30 native WebMCP tools are discovered and exercised on the public origin.
- [ ] Public source repository opens in an incognito session and displays the MIT license.
- [ ] Public YouTube demonstration is under three minutes and follows `docs/demo-script.md`.
- [ ] Devpost fields use the final public site, source, and video URLs.
- [ ] Devpost entry is submitted—not left as a draft—and its public page is verified.

These checks require external account state and must not be marked complete from localhost evidence.

## P1 — Implemented Hardening

- [x] Measured pressure calibration replaces the inaccurate hard-coded “+25%” preset.
- [x] Deterministic validation results no longer fabricate partial playthrough failures.
- [x] Persistent golden prompt, four-step progress, copy action, and contextual next prompt are visible in the lab.
- [x] Activity and audit records distinguish native WebMCP agent, human UI, demo helper, inspector, and human approval.
- [x] Encounter descriptions match supported fields; delayed reinforcements, timing, and spawn position are implemented.
- [x] Quest creation has closed nested schemas, collection limits, string limits, runtime validation, unique stage IDs, and stable-reference validation.
- [x] Revision-zero state hydrates correctly and permission changes update the mutable authorization reference synchronously.
- [x] World navigation and agent activity remain available in narrow browser panes.
- [x] Security headers, explicit favicon handling, and a high-severity dependency audit gate are present.
- [x] Browser E2E coverage and public-repository CI workflow are present.
- [x] `.devpost-hackathon-state.json` is excluded from source publication.

## Required Verification

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm audit --prod --audit-level high
pnpm test:e2e
```

Run the final E2E suite again with `PLAYWRIGHT_BASE_URL` set to the public deployment. Native WebMCP discovery itself must then be verified manually in a compatible preview browser because standard Playwright Chromium does not expose the preview API.
