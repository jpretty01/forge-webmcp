import { spawnSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { chromium } from '@playwright/test';

const root = process.cwd();
const outputDir = path.join(root, 'artifacts', 'video');

const segments = [
  {
    image: '01-landing.png',
    title: 'FORGE · HUMAN–AGENT WORLD LABORATORY',
    caption: 'A misplaced item can make an entire quest impossible.',
    spoken: 'A single misplaced item can make an entire quest impossible. FORGE lets a browser agent find the defect, propose a repair, and prove the result, while a person keeps control of every meaningful change.',
  },
  {
    image: '02-lab-overview.png',
    title: 'ONE WORLD · HUMAN UI + WEBMCP',
    caption: 'People and agents act on the same validated world state.',
    spoken: 'This is Ashen Reach, a playable role-playing world. People and browser agents use the same validated state, so the visible world, approvals, quality results, checkpoints, and audit history stay aligned.',
  },
  {
    image: '03-greyhaven.png',
    title: 'GREYHAVEN · CLEAR TO PEOPLE AND AGENTS',
    caption: 'Named characters for people. Structured entities for agents.',
    spoken: 'The screen names Arden, Garrick, Elara, and Rowan directly. The Web M C P agent receives structured locations, characters, quests, encounters, gates, and items instead of guessing from pixels.',
  },
  {
    image: '04-deadlock.png',
    title: 'NATIVE WEBMCP · REAL PROGRESSION ANALYSIS',
    caption: 'Critical: the required key is locked behind its own gate.',
    spoken: 'I ask the native browser agent for the most serious progression blocker. FORGE inspects the real quest graph and finds a circular dependency: the key needed to open the sanctum is inside that locked sanctum. The reproduction explains exactly why the route is unreachable.',
  },
  {
    image: '05-approval.png',
    title: 'AGENT PROPOSES · HUMAN DECIDES',
    caption: 'The world remains unchanged until a person approves.',
    spoken: 'Capability is separate from authority. In Propose mode, the agent investigates and prepares the narrowest repair, but the world stays unchanged. A person can inspect, modify, reject, or approve the key relocation.',
  },
  {
    image: '06-regression.png',
    title: '19 OF 19 VALIDATION CHECKS PASS',
    caption: 'Deterministic regression proves the repaired route is reachable.',
    spoken: 'Approval creates a rollback checkpoint and executes through the same service used by the interface. A fresh, revision-specific regression passes all nineteen checks. The blocker is gone because the world graph changed, not because FORGE displays a scripted success.',
  },
  {
    image: '07-audit.png',
    title: 'AUDITABLE PROVENANCE',
    caption: 'Native agent, human approval, validation, and checkpoint history.',
    spoken: 'The audit trail records who requested, approved, executed, and validated each action. Native Web M C P activity stays distinct from human approval, making the authority boundary easy to inspect.',
  },
  {
    image: '08-rollback.png',
    title: 'ROLLBACK RESTORES THE DEFECT',
    caption: 'Reversible changes remain reproducible after rollback.',
    spoken: 'Rollback restores the checkpoint without erasing history. A new analysis reproduces the original key-behind-its-own-gate defect.',
  },
  {
    image: '09-tool-registry.png',
    title: '30 CAPABILITIES · 7 DOMAINS',
    caption: 'Closed schemas, approval metadata, and one shared service layer.',
    spoken: 'The inspector exposes thirty capabilities across gameplay, quests, encounters, simulation, quality assurance, and governance. Closed schemas validate input, mutation tools declare approval requirements, and every tool shares the human interface service layer. Web M C P is the product interface, not a chatbot added on top.',
  },
  {
    image: '10-closing.png',
    title: 'FORGE · BUILD WORLDS TOGETHER',
    caption: 'Agents do the investigative work. People retain meaningful control.',
    spoken: 'FORGE turns Web M C P into a human-governed quality and live-operations control plane. Agents do the investigative work. People keep meaningful control. Every result remains visible, testable, auditable, and reversible.',
  },
];

function run(command, args) {
  const result = spawnSync(command, args, { cwd: root, encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(`${command} failed:\n${result.stdout}\n${result.stderr}`);
  }
  return result.stdout.trim();
}

function escapeHtml(value) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

function formatSrtTime(seconds) {
  const milliseconds = Math.max(0, Math.round(seconds * 1000));
  const hours = Math.floor(milliseconds / 3_600_000);
  const minutes = Math.floor((milliseconds % 3_600_000) / 60_000);
  const secs = Math.floor((milliseconds % 60_000) / 1000);
  const millis = milliseconds % 1000;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(millis).padStart(3, '0')}`;
}

function splitCaptions(text) {
  return text.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map((entry) => entry.trim()).filter(Boolean) ?? [text];
}

await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
const clipFiles = [];
const captionCues = [];
let timeline = 0;
let cueNumber = 1;

for (const [index, segment] of segments.entries()) {
  const sequence = String(index + 1).padStart(2, '0');
  const imagePath = path.join(outputDir, segment.image);
  await readFile(imagePath);

  const audioPath = path.join(outputDir, `audio-${sequence}.aiff`);
  run('say', ['-v', 'Daniel', '-r', '160', '-o', audioPath, segment.spoken]);
  const narrationDuration = Number(run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nokey=1:noprint_wrappers=1', audioPath]));
  const clipDuration = narrationDuration + 1.2;

  const frameHtmlPath = path.join(outputDir, `frame-${sequence}.html`);
  const framePath = path.join(outputDir, `frame-${sequence}.png`);
  const imageUrl = pathToFileURL(imagePath).href;
  const html = `<!doctype html>
<html><head><meta charset="utf-8"><style>
*{box-sizing:border-box}html,body{width:1920px;height:1080px;margin:0;overflow:hidden;background:#070b0c;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#f4f1e8}
.bg{position:absolute;inset:-60px;background:url("${imageUrl}") center/cover;filter:blur(34px) brightness(.42) saturate(.7);transform:scale(1.1)}
.shot{position:absolute;left:50%;top:50%;height:1000px;max-width:1500px;transform:translate(-50%,-50%);object-fit:contain;border:1px solid rgba(244,196,98,.18);box-shadow:0 30px 100px rgba(0,0,0,.72)}
.shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(4,8,9,.9) 0,rgba(4,8,9,.18) 18%,rgba(4,8,9,.05) 72%,rgba(4,8,9,.94) 100%)}
.brand{position:absolute;top:34px;left:64px;color:#f5c661;font:700 18px ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.24em}
.counter{position:absolute;top:34px;right:64px;color:#9be7c5;font:600 16px ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.14em}
h1{position:absolute;top:76px;left:64px;right:64px;margin:0;font-size:54px;line-height:1.05;letter-spacing:-.035em;text-shadow:0 3px 24px #000}
.caption{position:absolute;left:64px;right:64px;bottom:58px;display:flex;align-items:center;gap:18px;font-size:31px;font-weight:600;line-height:1.25;text-shadow:0 3px 20px #000}
.caption b{display:grid;width:44px;height:44px;place-items:center;border-radius:50%;background:#f5c661;color:#15130d;font:800 17px ui-monospace,SFMono-Regular,Menlo,monospace;flex:0 0 auto}
.url{position:absolute;right:64px;bottom:20px;color:#a6ada9;font:500 14px ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.08em}
</style></head><body><div class="bg"></div><img class="shot" src="${imageUrl}"><div class="shade"></div><div class="brand">FORGE / WEBMCP CHALLENGE</div><div class="counter">${sequence} / ${String(segments.length).padStart(2, '0')}</div><h1>${escapeHtml(segment.title)}</h1><div class="caption"><b>${index + 1}</b><span>${escapeHtml(segment.caption)}</span></div><div class="url">forge-human-agent-world-laboratory.themfpretty.chatgpt.site</div></body></html>`;
  await writeFile(frameHtmlPath, html);
  await page.goto(pathToFileURL(frameHtmlPath).href);
  await page.screenshot({ path: framePath });

  const clipPath = path.join(outputDir, `clip-${sequence}.mp4`);
  const fadeOutStart = Math.max(0, clipDuration - 0.4).toFixed(3);
  run('ffmpeg', [
    '-y', '-hide_banner', '-loglevel', 'error',
    '-loop', '1', '-framerate', '30', '-i', framePath,
    '-i', audioPath,
    '-t', clipDuration.toFixed(3),
    '-vf', `fade=t=in:st=0:d=0.35,fade=t=out:st=${fadeOutStart}:d=0.4,format=yuv420p`,
    '-af', `adelay=500,apad=pad_dur=0.7,afade=t=in:st=0:d=0.2,afade=t=out:st=${fadeOutStart}:d=0.35,loudnorm=I=-16:LRA=11:TP=-1.5`,
    '-r', '30', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-g', '60',
    '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2',
    '-movflags', '+faststart', clipPath,
  ]);
  clipFiles.push(clipPath);

  const sentences = splitCaptions(segment.spoken);
  const captionStart = timeline + 0.5;
  const captionDuration = narrationDuration / sentences.length;
  sentences.forEach((sentence, sentenceIndex) => {
    const start = captionStart + sentenceIndex * captionDuration;
    const end = captionStart + (sentenceIndex + 1) * captionDuration;
    captionCues.push(`${cueNumber}\n${formatSrtTime(start)} --> ${formatSrtTime(end)}\n${sentence}\n`);
    cueNumber += 1;
  });
  timeline += clipDuration;
}

await browser.close();

const concatPath = path.join(outputDir, 'concat.txt');
await writeFile(concatPath, clipFiles.map((file) => `file '${file.replaceAll("'", "'\\''")}'`).join('\n'));
const narrationOnlyPath = path.join(outputDir, 'FORGE-WebMCP-Demo-narration-only.mp4');
run('ffmpeg', [
  '-y', '-hide_banner', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', concatPath,
  '-c', 'copy', '-metadata', 'title=FORGE — Human-Agent World Laboratory',
  '-metadata', 'comment=WebMCP Challenge demo created from verified public-origin states',
  '-movflags', '+faststart', narrationOnlyPath,
]);

const videoPath = path.join(outputDir, 'FORGE-WebMCP-Demo-narrated.mp4');
const musicPath = path.join(outputDir, 'FORGE-original-ambient-music.wav');
await readFile(musicPath);
run('ffmpeg', [
  '-y', '-hide_banner', '-loglevel', 'error', '-i', narrationOnlyPath,
  '-stream_loop', '-1', '-i', musicPath,
  '-filter_complex', '[0:a]volume=1[voice];[1:a]volume=0.075[music];[voice][music]amix=inputs=2:duration=first:dropout_transition=2[audio]',
  '-map', '0:v:0', '-map', '[audio]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k',
  '-metadata', 'title=FORGE — Human-Agent World Laboratory',
  '-metadata', 'comment=WebMCP Challenge demo with AI narration and original ambient music',
  '-movflags', '+faststart', videoPath,
]);

const captionsPath = path.join(outputDir, 'FORGE-WebMCP-Demo.srt');
await writeFile(captionsPath, captionCues.join('\n'));
const finalDuration = Number(run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nokey=1:noprint_wrappers=1', videoPath]));

console.log(JSON.stringify({ videoPath, captionsPath, durationSeconds: finalDuration, resolution: '1920x1080', segments: segments.length }, null, 2));
