# Security Policy

## Supported Version

The current `main` branch is supported for security fixes during the WebMCP Challenge.

## Reporting a Vulnerability

Do not publish exploit details in a public issue. Report the affected route or tool, reproduction conditions, expected boundary, observed behavior, and impact to the repository owner through a private security channel. Avoid including credentials or personal data.

## Trust Boundaries

- WebMCP callers are untrusted and all tool inputs are validated.
- Display labels are not identifiers; mutations require stable entity IDs.
- Agent permissions are enforced by the application service, not the browser UI.
- PROPOSE mode requires a separate human approval action before significant changes execute.
- Client persistence is untrusted on load and falls back to a canonical fixture when its required shape is missing.
- FORGE contains no application secrets and performs no privileged network calls.

## Known Preview Constraint

WebMCP is an evolving browser API. FORGE uses `document.modelContext`, same-origin defaults, and AbortSignal lifecycle cleanup. Re-evaluate the integration when the draft API or browser security model changes.
