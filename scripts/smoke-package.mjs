import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

// Run under a desktop session, or xvfb-run on Linux. The application gets a
// disposable profile and an OS-assigned local debugging port.
const executable = process.argv[2];
assert.ok(executable, 'Usage: node scripts/smoke-package.mjs <packaged-executable>');
const profile = await mkdtemp(path.join(tmpdir(), 'screen-pinyin-smoke-'));
const child = spawn(path.resolve(executable), [
  '--remote-debugging-port=0',
  `--user-data-dir=${profile}`,
  ...process.argv.slice(3),
], { cwd: profile, env: { ...process.env, XDG_CONFIG_HOME: profile } });
let output = '';
let launchError;
let socket;
child.on('error', error => { launchError = error; });
for (const stream of [child.stdout, child.stderr]) {
  stream.on('data', chunk => { output += chunk; });
}

async function until(check, message) {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (launchError) throw launchError;
    assert.ok(!output.includes('A JavaScript error occurred'), output);
    assert.equal(child.exitCode, null, `App exited: ${output}`);
    const result = await check();
    if (result) return result;
    await delay(200);
  }
  throw new Error(`${message}\n${output}`);
}

let requestId = 0;
function call(method, params) {
  const id = ++requestId;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.removeEventListener('message', receive);
      reject(new Error(`Timed out: ${method}`));
    }, 15_000);
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
}

try {
  const endpoint = await until(
    () => output.match(/DevTools listening on (ws:\/\/[^\s]+)/)?.[1],
    'No debugging endpoint from packaged app',
  );
  const origin = new URL(endpoint).origin.replace('ws:', 'http:');
  const target = await until(async () => {
    const targets = await fetch(`${origin}/json/list`).then(response => response.json());
    return targets.find(item => item.type === 'page' && item.url.includes('main_window'));
  }, 'Main window did not load');
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await once(socket, 'open');
  await until(async () => {
    const result = await call('Runtime.evaluate', {
      expression: 'Boolean(window.electronAPI && document.querySelector("#root")?.textContent)',
      returnByValue: true,
    });
    return result.result.value;
  }, 'Renderer or preload did not initialize');
  const result = await call('Runtime.evaluate', {
    expression: `(async () => ({
      ready: await window.electronAPI.dictionaryReady(),
      entry: await window.electronAPI.dictionaryGet('你好'),
      words: await window.electronAPI.segmentText('你好中国'),
      translation: await window.electronAPI.translate('你好'),
      cards: await window.electronAPI.flashcardGetAll(),
    }))()`,
    awaitPromise: true,
    returnByValue: true,
  });
  assert.equal(result.exceptionDetails, undefined, JSON.stringify(result.exceptionDetails));
  const value = result.result.value;
  assert.equal(value.ready, true, 'Bundled SQLite dictionary is unavailable');
  assert.match(value.entry.definitions, /hello/i);
  assert.equal(value.words.success, true, 'Native word segmentation failed');
  assert.ok(value.words.segments.length > 0, 'Native word segmentation returned no words');
  assert.equal(value.translation.success, true, 'Dictionary translation without Azure failed');
  assert.equal(value.translation.fromDictionary, true);
  assert.deepEqual(value.cards, [], 'Fresh profile should have an empty flashcard database');
  console.log('PASS: packaged renderer, preload, SQLite dictionary, native segmentation, local translation and flashcard database');
} catch (error) {
  console.error(output);
  throw error;
} finally {
  socket?.close();
  const exited = once(child, 'exit');
  if (child.exitCode === null) {
    child.kill('SIGTERM');
    await Promise.race([exited, delay(5000)]);
    if (child.exitCode === null && child.signalCode === null) {
      child.kill('SIGKILL');
      await exited;
    }
  }
  await rm(profile, { recursive: true, force: true });
}
