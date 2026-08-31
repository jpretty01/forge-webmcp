import { spawnSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { chromium } from '@playwright/test';

const root = process.cwd();
const outputDir = path.join(root, 'artifacts', 'video');
const sampleRate = 48_000;

const chapters = [
  {
    image: '01-landing.png',
    title: 'FORGE',
    kicker: 'HUMAN–AGENT WORLD LABORATORY',
    captions: ['A WebMCP control plane for finding, approving, testing, and reversing game-world changes.'],
    intro: true,
  },
  {
    image: '04-deadlock.png',
    title: 'THE PROBLEM',
    kicker: 'A QUEST THAT CANNOT BE COMPLETED',
    captions: [
      'In Ashen Reach, the key needed to open the sanctum is spawned inside that locked sanctum.',
      'This circular dependency makes the main rescue quest impossible to complete.',
    ],
  },
  {
    image: '03-greyhaven.png',
    title: 'ONE PLAYABLE WORLD',
    kicker: 'CLEAR TO PEOPLE AND AGENTS',
    captions: [
      'People see Arden, Garrick, Elara, and Rowan by name—not unexplained initials.',
      'A WebMCP agent sees the same world as structured locations, characters, quests, gates, encounters, and items.',
    ],
  },
  {
    image: '02-lab-overview.png',
    title: 'NATIVE WEBMCP',
    kicker: 'SHARED STATE, NOT SCREEN SCRAPING',
    captions: [
      'FORGE registers thirty browser-native tools for inspection, simulation, repair, testing, and governance.',
      'The human interface and every agent tool use the same validated application service.',
    ],
  },
  {
    image: '04-deadlock.png',
    title: 'THE AGENT INVESTIGATES',
    kicker: 'DETERMINISTIC PROGRESSION ANALYSIS',
    captions: [
      'The native agent analyzes the real quest graph and reports one critical progression deadlock.',
      'The QA result explains the exact route, required gate, misplaced key, and narrowest repair.',
    ],
  },
  {
    image: '05-approval.png',
    title: 'AGENT PROPOSES · HUMAN DECIDES',
    kicker: 'CAPABILITY IS SEPARATE FROM AUTHORITY',
    captions: [
      'In the default Propose mode, the agent prepares the repair but the world remains unchanged.',
      'A person can inspect the parameters, modify them, reject them, or approve the key relocation.',
    ],
  },
  {
    image: '06-regression.png',
    title: 'THE REPAIR IS PROVEN',
    kicker: '19 OF 19 VALIDATION CHECKS PASS',
    captions: [
      'Approval creates a checkpoint and executes through the same service used by the human interface.',
      'A seeded regression proves the repaired quest route is reachable. The result is not hard-coded.',
    ],
  },
  {
    image: '07-audit.png',
    title: 'AUDITABLE PROVENANCE',
    kicker: 'EVERY ACTOR AND DECISION REMAINS VISIBLE',
    captions: [
      'The audit distinguishes native WebMCP activity, human approval, validation, and reversible checkpoints.',
      'Judges can see exactly where agent capability ends and human authority begins.',
    ],
  },
  {
    image: '08-rollback.png',
    title: 'ROLLBACK RESTORES THE DEFECT',
    kicker: 'REVERSIBLE AND REPRODUCIBLE',
    captions: [
      'Rollback restores the previous checkpoint without erasing governance history.',
      'When progression analysis runs again, the original key-behind-its-own-gate defect returns.',
    ],
  },
  {
    image: '09-tool-registry.png',
    title: '30 CAPABILITIES · 7 DOMAINS',
    kicker: 'WEBMCP IS THE PRODUCT INTERFACE',
    captions: [
      'Closed schemas validate nested input, and mutation tools advertise their approval boundary.',
      'Gameplay, quests, encounters, simulation, QA, and governance all share one service layer.',
    ],
  },
  {
    image: '10-closing.png',
    title: 'BUILD WORLDS TOGETHER',
    kicker: 'FORGE · HUMAN-GOVERNED AGENTIC OPERATIONS',
    captions: [
      'Agents do the investigative work. People retain meaningful control.',
      'Every result remains visible, testable, auditable, and reversible.',
    ],
  },
];

function run(command, args) {
  const result = spawnSync(command, args, { cwd: root, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`${command} failed:\n${result.stdout}\n${result.stderr}`);
  return result.stdout.trim();
}

function escapeHtml(value) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

function captionDuration(text, intro = false) {
  if (intro) return 6;
  const words = text.trim().split(/\s+/).length;
  return Math.max(4.4, Math.min(8.5, words / 2.7 + 1.1));
}

function formatSrtTime(seconds) {
  const milliseconds = Math.max(0, Math.round(seconds * 1000));
  const hours = Math.floor(milliseconds / 3_600_000);
  const minutes = Math.floor((milliseconds % 3_600_000) / 60_000);
  const secs = Math.floor((milliseconds % 60_000) / 1000);
  const millis = milliseconds % 1000;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(millis).padStart(3, '0')}`;
}

function writeOriginalAmbientMusic(durationSeconds, destination) {
  const chords = [
    [73.42, 146.83, 174.61, 220.0],
    [58.27, 116.54, 146.83, 174.61],
    [87.31, 130.81, 174.61, 220.0],
    [65.41, 130.81, 164.81, 196.0],
  ];
  const totalSamples = Math.ceil(durationSeconds * sampleRate);
  const pcm = Buffer.alloc(totalSamples * 4);
  const chordSeconds = 8;

  function chordValue(chord, time, phaseOffset) {
    return chord.reduce((sum, frequency, index) => {
      const detune = 1 + (index - 1.5) * 0.0009;
      const fundamental = Math.sin(Math.PI * 2 * frequency * detune * time + phaseOffset * index);
      const harmonic = 0.2 * Math.sin(Math.PI * 4 * frequency * time + 0.4 * index);
      return sum + fundamental + harmonic;
    }, 0) / chord.length;
  }

  for (let index = 0; index < totalSamples; index += 1) {
    const time = index / sampleRate;
    const chordPosition = time / chordSeconds;
    const chordIndex = Math.floor(chordPosition) % chords.length;
    const nextChordIndex = (chordIndex + 1) % chords.length;
    const withinChord = time % chordSeconds;
    const crossfade = Math.max(0, Math.min(1, (withinChord - 6.2) / 1.8));
    const smooth = crossfade * crossfade * (3 - 2 * crossfade);
    const leftPad = chordValue(chords[chordIndex], time, 0.07) * (1 - smooth) + chordValue(chords[nextChordIndex], time, 0.07) * smooth;
    const rightPad = chordValue(chords[chordIndex], time, 0.13) * (1 - smooth) + chordValue(chords[nextChordIndex], time, 0.13) * smooth;
    const root = chords[chordIndex][0] / 2;
    const bass = Math.sin(Math.PI * 2 * root * time) * 0.34;
    const pulsePosition = time % 4;
    const bellEnvelope = Math.exp(-2.6 * pulsePosition);
    const bellFrequency = chords[chordIndex][2] * 2;
    const bell = Math.sin(Math.PI * 2 * bellFrequency * time) * bellEnvelope * 0.18;
    const motion = 0.78 + 0.22 * Math.sin(Math.PI * 2 * time / 11);
    const globalFade = Math.min(1, time / 2.5, (durationSeconds - time) / 3);
    const left = Math.max(-1, Math.min(1, (leftPad * 0.15 * motion + bass * 0.07 + bell * 0.45) * globalFade));
    const right = Math.max(-1, Math.min(1, (rightPad * 0.15 * motion + bass * 0.07 + bell * 0.35) * globalFade));
    pcm.writeInt16LE(Math.round(left * 32767), index * 4);
    pcm.writeInt16LE(Math.round(right * 32767), index * 4 + 2);
  }

  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(2, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 4, 28);
  header.writeUInt16LE(4, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcm.length, 40);
  return writeFile(destination, Buffer.concat([header, pcm]));
}

await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
const clipFiles = [];
const captionCues = [];
let timeline = 0;
let cueNumber = 1;
let frameIndex = 1;

for (const [chapterIndex, chapter] of chapters.entries()) {
  const imagePath = path.join(outputDir, chapter.image);
  await readFile(imagePath);
  const imageUrl = pathToFileURL(imagePath).href;

  for (const [captionIndex, caption] of chapter.captions.entries()) {
    const sequence = String(frameIndex).padStart(2, '0');
    const duration = captionDuration(caption, chapter.intro);
    const frameHtmlPath = path.join(outputDir, `caption-frame-${sequence}.html`);
    const framePath = path.join(outputDir, `caption-frame-${sequence}.png`);
    const titleCard = chapter.intro ? ' intro' : '';
    const html = `<!doctype html><html><head><meta charset="utf-8"><style>
*{box-sizing:border-box}html,body{width:1920px;height:1080px;margin:0;overflow:hidden;background:#060a0b;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#f5f2e9}
.bg{position:absolute;inset:-70px;background:url("${imageUrl}") center/cover;filter:blur(34px) brightness(.38) saturate(.68);transform:scale(1.12)}
.shot{position:absolute;left:50%;top:50%;height:1000px;max-width:1500px;transform:translate(-50%,-50%);object-fit:contain;border:1px solid rgba(244,196,98,.16);box-shadow:0 30px 100px rgba(0,0,0,.76)}
.intro .shot{opacity:.14;filter:blur(5px);transform:translate(-50%,-50%) scale(1.04)}
.shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(3,7,8,.93),rgba(3,7,8,.08) 25%,rgba(3,7,8,.06) 68%,rgba(3,7,8,.96))}
.brand{position:absolute;top:34px;left:64px;color:#f5c661;font:700 18px ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.24em}
.counter{position:absolute;top:34px;right:64px;color:#9be7c5;font:600 16px ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.14em}
.title{position:absolute;top:78px;left:64px;right:64px}.title h1{margin:0;font-size:54px;line-height:1.03;letter-spacing:-.035em;text-shadow:0 3px 24px #000}.title p{margin:12px 0 0;color:#f5c661;font:700 16px ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.2em}
.intro .title{top:250px;left:160px;right:160px;text-align:center}.intro .title h1{font-size:118px}.intro .title p{font-size:22px;margin-top:22px}
.caption{position:absolute;left:64px;right:64px;bottom:54px;display:flex;align-items:flex-start;gap:18px;border:1px solid rgba(255,255,255,.1);border-left:5px solid #f5c661;border-radius:16px;background:rgba(4,8,9,.9);padding:22px 28px;font-size:34px;font-weight:650;line-height:1.3;box-shadow:0 18px 50px rgba(0,0,0,.5)}
.intro .caption{left:250px;right:250px;bottom:190px;justify-content:center;text-align:center;font-size:38px;border-left:1px solid rgba(255,255,255,.1)}
.url{position:absolute;right:64px;bottom:18px;color:#a6ada9;font:500 14px ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.08em}
</style></head><body class="${titleCard.trim()}"><div class="bg"></div><img class="shot" src="${imageUrl}"><div class="shade"></div><div class="brand">FORGE / WEBMCP CHALLENGE</div><div class="counter">${String(chapterIndex + 1).padStart(2, '0')} / ${String(chapters.length).padStart(2, '0')}</div><div class="title"><h1>${escapeHtml(chapter.title)}</h1><p>${escapeHtml(chapter.kicker)}</p></div><div class="caption">${escapeHtml(caption)}</div><div class="url">forge-human-agent-world-laboratory.themfpretty.chatgpt.site</div></body></html>`;
    await writeFile(frameHtmlPath, html);
    await page.goto(pathToFileURL(frameHtmlPath).href);
    await page.screenshot({ path: framePath });

    const clipPath = path.join(outputDir, `caption-clip-${sequence}.mp4`);
    const fadeOutStart = Math.max(0, duration - 0.28).toFixed(3);
    run('ffmpeg', [
      '-y', '-hide_banner', '-loglevel', 'error', '-loop', '1', '-framerate', '30', '-i', framePath,
      '-t', duration.toFixed(3), '-vf', `fade=t=in:st=0:d=0.25,fade=t=out:st=${fadeOutStart}:d=0.28,format=yuv420p`,
      '-r', '30', '-an', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-g', '60', '-movflags', '+faststart', clipPath,
    ]);
    clipFiles.push(clipPath);
    captionCues.push(`${cueNumber}\n${formatSrtTime(timeline)} --> ${formatSrtTime(timeline + duration)}\n${caption}\n`);
    timeline += duration;
    cueNumber += 1;
    frameIndex += 1;
  }
}

await browser.close();

const concatPath = path.join(outputDir, 'caption-concat.txt');
await writeFile(concatPath, clipFiles.map((file) => `file '${file.replaceAll("'", "'\\''")}'`).join('\n'));
const silentVideoPath = path.join(outputDir, 'FORGE-WebMCP-Demo-captioned-silent.mp4');
run('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', concatPath, '-c', 'copy', '-movflags', '+faststart', silentVideoPath]);

const musicPath = path.join(outputDir, 'FORGE-original-ambient-music.wav');
await writeOriginalAmbientMusic(timeline, musicPath);
const videoPath = path.join(outputDir, 'FORGE-WebMCP-Demo-captioned.mp4');
run('ffmpeg', [
  '-y', '-hide_banner', '-loglevel', 'error', '-i', silentVideoPath, '-i', musicPath,
  '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k',
  '-af', 'loudnorm=I=-24:LRA=7:TP=-2', '-shortest',
  '-metadata', 'title=FORGE — Human-Agent World Laboratory',
  '-metadata', 'comment=Caption-led WebMCP Challenge demo with original ambient music',
  '-movflags', '+faststart', videoPath,
]);

const captionsPath = path.join(outputDir, 'FORGE-WebMCP-Demo-captioned.srt');
await writeFile(captionsPath, captionCues.join('\n'));
const finalDuration = Number(run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nokey=1:noprint_wrappers=1', videoPath]));
console.log(JSON.stringify({ videoPath, captionsPath, musicPath, durationSeconds: finalDuration, resolution: '1920x1080', captionCards: clipFiles.length, voice: false }, null, 2));
