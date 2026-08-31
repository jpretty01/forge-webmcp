# Submission Readiness

Last hardened: 2026-08-31

## P0 — External Submission Blockers

- [x] Public production site opens without owner authentication; `/`, `/lab`, `/webmcp`, and `/favicon.ico` returned successful unauthenticated responses on 2026-08-31.
- [x] All 30 native WebMCP tools were discovered on the public origin; the complete diagnosis → proposal → human approval → regression → audit → rollback path was exercised through the real preview API on 2026-08-31.
- [x] Public source repository is available at `https://github.com/jpretty01/forge-webmcp`; GitHub detects and displays the MIT license.
- [x] The verified 2:01, 1080p caption-led demonstration is publicly available at `https://youtu.be/6GO7R_Rjsxc`; YouTube exposes valid embeddable metadata for the video.
- [x] Devpost fields use the final public site, source, and video URLs.
- [x] Devpost submission `1164242` is recorded for The WebMCP Challenge and its public project page is verified at `https://devpost.com/software/project-forge-3zyvef`.

These checks require external account state and must not be marked complete from localhost evidence.

The complete Playwright matrix also passed against the public deployment on 2026-08-31. The real in-app preview-browser run separately proved native discovery and the governed golden path on the public origin.

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

For later releases, rerun the E2E suite with `PLAYWRIGHT_BASE_URL` set to the public deployment and repeat the native golden path in a compatible preview browser.
