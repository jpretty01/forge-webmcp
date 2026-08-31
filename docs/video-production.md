# FORGE — 165-Second Submission Video

## Recording Format

- Record at 1920×1080, 30 fps, with the browser at 100% zoom.
- Use a supported Chromium WebMCP preview on the public FORGE URL.
- Capture clean system audio and narration; do not use copyrighted music.
- Keep the native agent surface and FORGE Agent Activity visible whenever tools are running.
- Reset Ashen Reach immediately before recording.
- Add burned-in captions after the cut and upload publicly to YouTube.

## Shot Plan and Narration

### 0:00–0:12 — The problem

**On screen:** FORGE landing page, then open the laboratory.

**Narration:**

“A single misplaced item can make an entire game quest impossible to finish. Finding that defect usually means switching between debug tools, scripts, dashboards, and manual playtests. FORGE brings that work into one shared, agent-native laboratory.”

**On-screen title:** `FORGE · Human-agent world laboratory`

### 0:12–0:30 — A world both sides understand

**On screen:** Greyhaven. Briefly point to Arden, Garrick, Elara, Rowan, the scene legend, permission mode, and Agent Activity.

**Narration:**

“This is Ashen Reach, a small playable RPG world. The screen is designed for both sides of the collaboration: people see named characters and clear actions, while a WebMCP agent receives structured world state instead of guessing from pixels or button labels.”

**On-screen title:** `One world · Human UI + structured agent tools`

### 0:30–0:55 — Native WebMCP investigation

**On screen:** Paste the golden prompt into the real browser agent. Keep Agent Activity visible while inspection tools run.

**Golden prompt:**

> Find the most serious progression blocker in Ashen Reach. Explain it and propose the narrowest reversible repair. Do not apply anything without my approval.

**Narration:**

“I ask the browser agent to find the most serious progression blocker and propose the narrowest reversible repair. FORGE exposes thirty native capabilities through WebMCP. The agent inspects the quest graph, locations, gates, and item spawns through typed tools—not screen scraping.”

**On-screen title:** `Native WebMCP · Typed inspection`

### 0:55–1:18 — A real defect, not a scripted answer

**On screen:** Open QA results and show the critical progression-deadlock finding and logical reproduction.

**Narration:**

“The agent finds a real circular dependency: the key needed to open the sanctum is spawned inside that locked sanctum. FORGE’s deterministic QA engine proves the route is unreachable and explains the exact reproduction path.”

**On-screen title:** `Critical · Key is behind its own gate`

### 1:18–1:42 — Human-governed repair

**On screen:** Open Approvals. Show the proposed key relocation, before and after summaries, and unchanged world. Approve it.

**Narration:**

“Capability is separate from authority. In the default Propose mode, the agent can investigate and prepare the repair, but a consequential world change waits for a person. I can inspect the parameters, modify them, reject them, or approve this minimal key relocation.”

**On-screen title:** `Agent proposes · Human decides`

### 1:42–2:05 — Measured proof

**On screen:** Approve, run Retest current world, and show the deadlock finding disappear.

**Narration:**

“Approval creates a checkpoint and executes through the same application service used by the human interface. A deterministic regression now proves the quest route is reachable. This is measured verification, not a success message hard-coded for the demo.”

**On-screen title:** `Checkpoint created · Regression passes`

### 2:05–2:27 — Provenance and rollback

**On screen:** Open Audit. Highlight Native WebMCP agent and Human approval entries. Roll back and briefly show the defect return.

**Narration:**

“The audit trail preserves who requested, approved, executed, validated, or reversed every action. I can roll the repair back without erasing that governance history, and the original defect becomes reproducible again.”

**On-screen title:** `Auditable · Reversible · Reproducible`

### 2:27–2:45 — Why WebMCP matters

**On screen:** Open the WebMCP inspector. Show 30 capabilities, mutation locks, a nested schema, and an example.

**Narration:**

“The tool registry makes the boundary inspectable: thirty capabilities across gameplay, quests, encounters, simulation, QA, and governance, with closed schemas and approval metadata. WebMCP is the product interface—not a chatbot placed on top of the product.”

**On-screen title:** `30 capabilities · 7 domains · Shared service layer`

### 2:45–2:55 — Close

**On screen:** Return to the landing page or use a clean FORGE end card with the public URL.

**Narration:**

“FORGE is a human-governed live-operations and QA control plane for interactive worlds—where agents do the investigative work and people retain meaningful control.”

**End card:**

`FORGE`

`forge-human-agent-world-laboratory.themfpretty.chatgpt.site`

## Editing Checklist

- Remove waiting, typing mistakes, browser chrome distractions, and dead air.
- Keep cuts functional; use short dissolves only when changing views.
- Enlarge the cursor or add a subtle click highlight.
- Keep on-screen titles to one line and at least 48 px at 1080p.
- Normalize narration so speech is consistently clear.
- Add accurate captions and verify names: WebMCP, Ashen Reach, Greyhaven, and FORGE.
- Export H.264 MP4, 1080p, with AAC audio.
- Confirm the final runtime is below 3:00 before upload.
- Set the YouTube video to Public, then test it in a private browser window.

## Capture Safety Net

If the live agent pauses during recording, stop and restart the take. Do not substitute the built-in demo helper while describing native WebMCP traffic; its provenance is intentionally labeled differently. Record the registry and rollback shots separately so a good investigation take is not lost to a later mistake.
