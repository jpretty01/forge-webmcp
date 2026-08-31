# Public Judge Testing

FORGE is a human-governed live-operations and QA control plane for interactive worlds, demonstrated through a playable RPG.

## Golden Path

1. Open the public FORGE URL in a supported Chromium WebMCP preview.
2. Confirm the header or `/webmcp` inspector reports 30 registered capabilities.
3. Give the browser agent this exact prompt:

   > Find the most serious progression blocker in Ashen Reach. Explain it and propose the narrowest reversible repair. Do not apply anything without my approval.

4. Confirm Agent Activity labels the calls **Native WebMCP agent**.
5. Open **Approvals** and verify that the crypt key still remains in `loc-crypt-sanctum` while the proposal is pending.
6. Approve the repair as the human.
7. Open **QA results**, select **Retest current world**, and confirm the progression-deadlock finding is absent.
8. Open **Audit**, verify separate native-agent and human-approval provenance, and roll back the repair.
9. Retest and confirm the circular key dependency returns.
10. Reset Ashen Reach before the next judging session.

## Browser Automation Scope

The Playwright suite installs a standards-shaped `document.modelContext` harness before application code runs. This verifies FORGE’s browser registration lifecycle and complete UI/service flow in CI. Final submission acceptance still requires one manual run with the real preview API on the public deployed origin.
