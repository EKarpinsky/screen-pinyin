import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, mkdtemp, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

// Drive the shipped Electron app through its UI and Chromium debugging protocol.
// No OCR, dictionary, IPC, or React state is replaced with fixtures.
const executable = process.argv[2];
assert.ok(executable, 'Usage: node scripts/capture/demo.mjs <packaged-executable>');
assert.ok(process.env.DISPLAY, 'Run under xvfb-run -a -s "-screen 0 1440x900x24"');
const scratchRoot = process.env.PAPERCLIP_RUN_SCRATCH_DIR || process.env.PAPERCLIP_SCRATCH_DIR || process.env.CAPTURE_SCRATCH_DIR;
assert.ok(scratchRoot, 'Set CAPTURE_SCRATCH_DIR to a temporary working directory');
await mkdir(scratchRoot, { recursive: true });
await mkdir('docs', { recursive: true });
const scratch = await mkdtemp(path.join(scratchRoot, 'screen-pinyin-capture-'));
const profile = path.join(scratch, 'profile');
await mkdir(profile);
const run = (command, args) => execFileSync(command, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const sample = path.resolve('docs/sample.png');
const sockets = [];
let child;
let background;
let recording;
let output = '';
let launchError;

async function until(check, description, timeout = 60_000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (launchError) throw launchError;
    if (child) assert.equal(child.exitCode, null, `App exited: ${output}`);
    const result = await check();
    if (result) return result;
    await delay(100);
  }
  throw new Error(`Timed out: ${description}\n${output}`);
}

async function connect(url) {
  const socket = new WebSocket(url);
  sockets.push(socket);
  await once(socket, 'open');
  let requestId = 0;
  const call = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++requestId;
    const timer = setTimeout(() => {
      socket.removeEventListener('message', receive);
      reject(new Error(`Timed out: ${method}`));
    }, 20_000);
    function receive(event) {
      const message = JSON.parse(event.data);
      if (message.id !== id) return;
      clearTimeout(timer);
      socket.removeEventListener('message', receive);
      if (message.error) reject(new Error(JSON.stringify(message.error)));
      else resolve(message.result);
    }
    socket.addEventListener('message', receive);
    socket.send(JSON.stringify({ id, method, params }));
  });
  return {
    call,
    async evaluate(expression) {
      const result = await call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
      assert.equal(result.exceptionDetails, undefined, JSON.stringify(result.exceptionDetails));
      return result.result.value;
    },
  };
}

async function clickText(page, text) {
  const point = await page.evaluate(`(() => {
    const el = [...document.querySelectorAll('button,[role="button"]')]
      .find(el => el.textContent.trim() === ${JSON.stringify(text)}
        || el.firstElementChild?.textContent.trim() === ${JSON.stringify(text)});
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return {x:r.x+r.width/2,y:r.y+r.height/2};
  })()`);
  assert.ok(point, `Missing clickable text: ${text}`);
  await clickPoint(page, point);
}

async function clickPoint(page, point) {
  for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) {
    await page.call('Input.dispatchMouseEvent', { type, ...point, button: 'left', clickCount: 1 });
  }
}

async function stop(process) {
  if (!process || process.exitCode !== null || process.signalCode !== null) return;
  const exited = once(process, 'exit');
  process.kill('SIGTERM');
  await Promise.race([exited, delay(5000)]);
  if (process.exitCode === null && process.signalCode === null) {
    process.kill('SIGKILL');
    await exited;
  }
}

try {
  run('convert', ['-size', '1440x900', 'xc:#f3f0e7',
    '-fill', '#fffdf8', '-draw', 'roundrectangle 320,230 1120,670 18,18',
    '-font', 'DejaVu-Sans', '-fill', '#52655c', '-pointsize', '22', '-gravity', 'north',
    '-annotate', '+0+100', 'SCREENPINYIN  /  LOCAL OCR DEMO',
    '-font', process.env.CAPTURE_CJK_FONT || '/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc',
    '-fill', '#142e24', '-pointsize', '96', '-gravity', 'center', '-annotate', '+0-40', '电脑',
    '-font', 'DejaVu-Sans', '-fill', '#52655c', '-pointsize', '21', '-annotate', '+0+125',
    'Select the Chinese text to explore its meaning.', sample]);
  background = spawn(path.resolve('node_modules/electron/dist/electron'),
    [path.resolve('scripts/capture/sample-window.cjs'), sample, '--force-device-scale-factor=1', `--user-data-dir=${path.join(scratch, 'viewer-profile')}`, ...process.argv.slice(3)],
    { stdio: ['ignore', 'pipe', 'pipe'] });
  let backgroundOutput = '';
  for (const stream of [background.stdout, background.stderr]) stream.on('data', chunk => { backgroundOutput += chunk; });
  await until(() => {
    assert.equal(background.exitCode, null, backgroundOutput);
    return backgroundOutput.includes('Sample viewer ready');
  }, 'sample image viewer');
  child = spawn(path.resolve(executable), ['--remote-debugging-port=0', '--force-device-scale-factor=1', `--user-data-dir=${profile}`, ...process.argv.slice(3)], {
    cwd: scratch, env: { ...process.env, XDG_CONFIG_HOME: profile },
  });
  child.on('error', error => { launchError = error; });
  for (const stream of [child.stdout, child.stderr]) stream.on('data', chunk => { output += chunk; });
  const endpoint = await until(() => output.match(/DevTools listening on (ws:\/\/[^\s]+)/)?.[1], 'Electron startup');
  const origin = new URL(endpoint).origin.replace('ws:', 'http:');
  const targets = () => fetch(`${origin}/json/list`).then(r => r.json());
  const target = await until(async () => (await targets()).find(t => t.url.includes('main_window')), 'main window');
  const main = await connect(target.webSocketDebuggerUrl);
  await until(() => main.evaluate('Boolean(window.electronAPI && document.querySelector("#root")?.textContent)'), 'renderer');
  await until(() => output.includes('OCR worker ready'), 'OCR initialization');
  assert.ok(!await main.evaluate('window.electronAPI.getStoreValue("azureApiKey")'), 'Profile must have no Azure key');
  console.log('PASS: packaged Electron renderer and OCR worker started under Xvfb; Azure key absent');
  const browser = await connect(endpoint);
  const nativeId = run('xdotool', ['search', '--onlyvisible', '--pid', String(child.pid)]).trim().split('\n')[0];
  assert.ok(nativeId, 'Could not find main X11 window');
  run('xdotool', ['windowmove', nativeId, '0', '0', 'windowsize', nativeId, '1440', '900']);
  // Use the app's hide-window command so Electron can show it again after OCR.
  await main.evaluate('window.electronAPI.closeSettings()');
  await delay(300);
  run('xdotool', ['key', 'ctrl+shift+c']);
  const overlayTarget = await until(async () => (await targets()).find(t => t.url.includes('overlay_window')), 'selection overlay');
  const overlay = await connect(overlayTarget.webSocketDebuggerUrl);
  await until(() => overlay.evaluate('Boolean(document.querySelector("[style*=background-image]"))'), 'screen capture background');
  const overlaySize = await overlay.evaluate(`(() => {
    const r = document.querySelector('[style*=background-image]').getBoundingClientRect();
    return {width:r.width,height:r.height,viewportWidth:innerWidth,viewportHeight:innerHeight};
  })()`);
  assert.equal(overlaySize.width, overlaySize.viewportWidth, 'Selection overlay must cover the viewport width');
  assert.equal(overlaySize.height, overlaySize.viewportHeight, 'Selection overlay must cover the viewport height');
  assert.ok(overlaySize.width >= 1439 && overlaySize.height >= 899, 'Selection window must fill the Xvfb desktop');
  console.log(`PASS: selection overlay covers the desktop: ${JSON.stringify(overlaySize)}`);
  // The app currently opens detached DevTools for the overlay. Close that tool window as a user would.
  for (const devtools of (await targets()).filter(t => t.url.startsWith('devtools://'))) {
    await browser.call('Target.closeTarget', { targetId: devtools.id });
  }
  const video = path.join(scratch, 'capture.mkv');
  const recordingStarted = Date.now();
  recording = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'x11grab', '-video_size', '1440x900',
    '-framerate', '12', '-i', process.env.DISPLAY, '-t', '12', '-c:v', 'ffv1', video], { stdio: ['ignore', 'pipe', 'pipe'] });
  let recordingErrors = '';
  recording.stderr.on('data', chunk => { recordingErrors += chunk; });
  const recorded = once(recording, 'exit');
  await delay(800);
  await overlay.call('Input.dispatchMouseEvent', { type: 'mousePressed', x: 500, y: 300, button: 'left', clickCount: 1 });
  for (let step = 1; step <= 20; step++) {
    await overlay.call('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 500 + step * 22, y: 300 + step * 11, button: 'left', buttons: 1 });
    await delay(40);
  }
  await delay(600);
  await overlay.call('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 940, y: 520, button: 'left', clickCount: 1 });
  await until(() => main.evaluate('/original text/i.test(document.body.innerText) && document.body.innerText.includes("diàn nǎo")'), 'OCR results');
  const history = await main.evaluate('window.electronAPI.getHistory()');
  assert.equal(history[0].chinese, '电脑', 'Real screen OCR must match the rendered sample');
  assert.equal(history[0].pinyin, 'diàn nǎo');
  assert.match(history[0].english, /computer/);
  console.log(`PASS: screen region -> OCR -> local dictionary: ${JSON.stringify(history[0])}`);
  await delay(1000);
  await clickText(main, '电脑');
  await delay(800);
  await clickPoint(main, { x: 1350, y: 820 });
  await delay(200);
  run('import', ['-window', 'root', 'docs/screenshot.png']);
  await clickText(main, '电');
  await until(() => main.evaluate('/character/i.test(document.body.innerText)'), 'character detail');
  await delay(900);
  assert.ok(Date.now() - recordingStarted < 10_000, 'Character detail must appear with at least two seconds left in the recording');
  const visibleText = await main.evaluate('document.body.innerText');
  assert.match(visibleText, /electric|computer/i);
  assert.ok(!/Please set your Azure|Translation failed|No text detected/.test(visibleText), 'An error is visible');
  await writeFile(path.join(scratch, 'visible-text.txt'), visibleText);
  const [recordingCode] = await recorded;
  assert.equal(recordingCode, 0, recordingErrors);
  run('ffmpeg', ['-y', '-loglevel', 'error', '-i', video, '-filter_complex',
    'fps=10,split[a][b];[a]palettegen=max_colors=96[p];[b][p]paletteuse=dither=bayer:bayer_scale=4',
    '-loop', '0', 'docs/demo.gif']);
  for (const [file, limit] of [['sample.png', 1_000_000], ['screenshot.png', 1_000_000], ['demo.gif', 5_000_000]]) {
    const { size } = await stat(`docs/${file}`);
    assert.ok(size < limit, `${file}: ${size} exceeds ${limit}`);
    console.log(`PASS: docs/${file}: ${size} bytes`);
  }
  const duration = Number(run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', 'docs/demo.gif']).trim());
  assert.ok(duration > 0 && duration < 15, `GIF duration ${duration}`);
  console.log(`PASS: ${duration}s GIF; real region capture, OCR results, and character detail`);
} finally {
  for (const socket of sockets) socket.close();
  await stop(recording);
  await stop(child);
  await stop(background);
  await writeFile(path.join(scratchRoot, 'capture-app.log'), output);
  await rm(scratch, { recursive: true, force: true });
}
