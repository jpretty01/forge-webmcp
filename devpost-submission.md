# Title

FORGE — Human-Agent World Laboratory

## One-line Summary

FORGE is a human-governed live-operations and QA control plane for interactive worlds, demonstrated through a playable RPG and 30 native WebMCP capabilities.

## Problem

Game teams use disconnected tools to inspect world state, reproduce progression failures, rebalance encounters, approve risky changes, validate fixes, and recover from regressions. General-purpose browser agents make this worse when they must infer domain meaning from pixels or manipulate fragile UI controls. A wrong action can silently mutate the world, erase evidence, or introduce a second defect.

## Solution

FORGE gives people and browser agents one shared, typed control plane for Ashen Reach. A WebMCP agent can inspect the world graph, discover a real circular dependency, propose the narrowest repair, and run deterministic validation. The human retains control: meaningful changes wait in an approval queue, every call records provenance, every reversible mutation creates a checkpoint, and rollback restores the prior world without erasing governance history.

The medieval RPG makes that safety model immediately visible. The underlying pattern is reusable for game QA, live operations, quest design, modding, and other stateful web applications.

## Why This Matters

FORGE targets indie and mid-sized game studios, quest designers, QA teams, live-operations teams, and user-generated-content platforms. It turns a fragmented workflow into one auditable collaboration loop:

Structured inspection → bounded proposal → human approval → measured execution → deterministic validation → audit and rollback.

WebMCP is essential because the browser exposes domain capabilities and schemas directly. The agent does not need to guess which button represents a safe repair, and the human can see exactly which actor requested, approved, executed, validated, or reversed each action.

FORGE deliberately separates capability from authority. Agents can use the complete registered workflow, but routine reads, diagnosis, simulation, and validation proceed automatically while consequential world changes require approval in the default mode. A human can explicitly opt into bounded autonomous execution, and reversible mutations still produce checkpoints and audit evidence. The result is meaningful agency without unconditional control.

## How We Used AI

FORGE does not hide an opaque model behind a themed chat box. It exposes 30 browser-native tools through `document.modelContext.registerTool()` so a compatible external agent can reason over structured world state and invoke bounded capabilities. Tools span world inspection, player actions, quests, encounters, seeded simulation, QA, and governance.

The default PROPOSE mode prevents consequential agent actions from applying until a person approves them. OBSERVE denies world mutations, while AUTONOMOUS remains an explicit opt-in. Tool inputs use closed schemas plus recursive runtime validation, and activity/audit views distinguish native WebMCP agents from human UI actions, demo helpers, registry examples, and human approvals.

## How We Used Codex

Codex helped turn the product concept into a production-ready, evidence-backed implementation. It reviewed the shared-service architecture, traced authorization and persistence edge cases, replaced misleading metrics with truthful methodology, designed a measured difficulty-calibration search, deepened nested tool validation, added responsive and accessible judge flows, triaged dependency advisories, built service and browser automation, found a real rollback workflow bug during E2E testing, and verified the exact public deployment.

Codex was also used to create CI, security guidance, public judge instructions, the demo script, and this draft. Human judgment remained responsible for product positioning, public access, approval boundaries, and final release decisions.

## Key Features

- 30 registered WebMCP tools with JSON schemas, lifecycle cleanup, and read-only annotations.
- One shared application-service layer for human UI and native agent calls.
- OBSERVE, PROPOSE, and AUTONOMOUS permission modes enforced below the UI.
- A real graph-derived crypt-key deadlock rather than a hard-coded finding.
- Human approval, rejection, parameter editing, checkpoints, audit, rollback, and deterministic reset.
- Seeded combat simulation influenced by composition, delayed reinforcements, range, aggression, coordination, and special attacks.
- A calibration search that measures candidate changes and selects the closest minimal change to the requested pressure target.
- Truthful deterministic reachability and validation-check reporting—no fabricated partial playthrough counts.
- Persistent golden prompt, four-step judge path, provenance labels, and narrow-pane evidence panels.
- Closed nested quest schemas, maximum input sizes, stable-ID validation, security headers, and zero known production dependency vulnerabilities.

## Architecture

The UI and WebMCP registry call the same typed `executeForgeTool` service. That boundary performs schema validation, permission checks, proposal routing, snapshotting, execution, audit recording, and activity publication. World state is device-local and deterministic for repeatable judge sessions. The QA layer performs reference validation, quest-graph validation, progression reachability, and seeded combat simulation. Reversible mutations snapshot the gameplay model, while rollback preserves the append-only governance trail.

This client-first architecture requires no application secrets or privileged backend. A production multi-user extension would move authorization, audit records, and snapshots to a server datastore with concurrency control.

## Testing Instructions

1. Open https://forge-human-agent-world-laboratory.themfpretty.chatgpt.site in ChatGPT’s in-app browser or Google Chrome with WebMCP enabled.
2. Confirm `/webmcp` shows 30 registered capabilities.
3. Ask the agent: “Find the most serious progression blocker in Ashen Reach. Explain it and propose the narrowest reversible repair. Do not apply anything without my approval.”
4. Confirm Agent Activity labels the calls **Native WebMCP agent**.
5. Open **Approvals** and verify the proposal is pending and the world has not changed.
6. Approve the repair as the human.
7. Open **QA results**, choose **Run regression**, and confirm the progression-deadlock finding is absent.
8. Open **Audit**, verify separate native-agent and human-approval entries, then roll back.
9. Retest and confirm the key-behind-its-own-gate defect returns.
10. Reset Ashen Reach before another run.

Automated verification includes 18 service-level tests and a Playwright matrix for desktop and a 520-pixel ChatGPT-style pane. The same matrix passed against the public deployment. Standard Playwright uses a standards-shaped `document.modelContext` harness; the final native public-origin preview-browser run remains a manual acceptance item.

## Public Demo Link

https://forge-human-agent-world-laboratory.themfpretty.chatgpt.site

## Public Repository Link

https://github.com/jpretty01/forge-webmcp

## Demo Video

https://youtu.be/6GO7R_Rjsxc

The public YouTube video is titled **FORGE: Human-Governed Game Worlds with WebMCP | Demo** and published by **TMFPRETTY, LLC**. The final cut is 2:01 at 1920×1080 with burned-in narrative captions, original light instrumental music, no voice, and a matching SRT caption file.

The current caption-led cut follows this 121-second outline:

- 0–6s: define FORGE before introducing the scenario.
- 6–18s: show the circular quest dependency and its player impact.
- 18–42s: introduce named Greyhaven characters and the shared human-agent world model.
- 42–68s: show native investigation, the exact deadlock, and a human-gated repair proposal.
- 68–92s: prove the approved repair and distinguish agent action from human authority.
- 92–101s: roll back and reproduce the original defect.
- 101–121s: show the 30-tool registry, shared architecture, and human-governed close.

The complete caption copy, shot directions, on-screen titles, and export checklist are maintained in `docs/video-production.md`.

## Screenshot Shot List

1. Landing page with FORGE positioning and public demo CTA.
2. Laboratory with the golden prompt, four-step progress, world atlas, and Agent Activity visible.
3. Critical crypt-key progression finding with logical reproduction steps.
4. Human approval card showing before/proposed-after, reversible status, and structured parameters.
5. Audit view showing native-agent and human-approval provenance plus rollback.
6. WebMCP inspector showing 30 capabilities and the deeply structured `create_quest` schema.

## Submission Readiness Notes

Confirmed today:

- Public production routes respond without owner authentication.
- Public repository is visible, complete, and detected by GitHub as MIT licensed.
- Type checking, linting, 18 core tests, production build, and production dependency audit pass.
- Local and public-deployment Playwright matrices pass on desktop and narrow layouts.
- Production security headers, favicon handling, and absolute Open Graph/X metadata are live.
- The public YouTube demo resolves successfully and exposes valid embeddable video metadata.
- Devpost recorded submission `1164242` for The WebMCP Challenge at `2026-08-31T16:44:49.298-04:00` and the public project readback is available at `https://devpost.com/software/project-forge-3zyvef`.

The final Devpost record has been verified. Further edits remain possible until the deadline.

Official deadline: 2026-09-03 20:00 UTC (3:00 PM America/Chicago; Devpost lists Pacific Time as the event time zone).

## Known Limitations

- WebMCP is an evolving Chromium preview API and is not available in every browser.
- World state is isolated in browser storage; FORGE is not yet a multi-user live-operations backend.
- Combat simulation is intentionally abstract and seeded, not a frame-by-frame game-engine replay.
- The built-in demo-helper buttons use the same service layer but are not native agent calls; the UI labels them separately.
- Standard Playwright verifies registration through a browser API harness, not the real preview implementation.

## TODO Official Form Fields

- **28249 — Submitter Type (required):** Individual.
- **28250 — Country of residence (required):** United States.
- **28251 — Organization name (optional):** Not applicable; submitting as an individual.
- **28252 — App Status (required):** New.
- **28253 — Existing-project updates:** Not applicable if App Status remains New.
- **28254 — Live URL (required):** https://forge-human-agent-world-laboratory.themfpretty.chatgpt.site
- **28255 — Testing instructions:** Use the ten-step golden path above. No credentials are required.
- **28256 — Public code repository (required):** https://github.com/jpretty01/forge-webmcp
- **28257 — Agents/clients tested (required):** ChatGPT’s in-app browser for native WebMCP discovery and the complete public-origin diagnosis → proposal → human approval → regression → audit → rollback path; Google Chrome/Playwright for desktop and narrow-pane E2E through a standards-shaped WebMCP harness.
- **28258 — AI tools used (required):** Codex and ChatGPT, including architecture review, implementation, debugging, security hardening, automated tests, browser QA, and deployment verification.
- **28259 — Learning level (required):** Significant.
- **28260 — Career AI value (required):** Yes.
