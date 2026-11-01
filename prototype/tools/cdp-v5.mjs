/* v0.5 交互验收：独立文件页面 / 树只展开 / 新建落文件 / 删除掌握度与复习 / 星图不随树变 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PROFILE = path.join(process.env.TEMP || '.', 'dsh-cdp-v5-profile');
const PORT = 9225;
const APP_URL = 'http://127.0.0.1:8765/';
const SHOTS = path.resolve('prototype/shots');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

fs.mkdirSync(SHOTS, { recursive: true });
fs.rmSync(PROFILE, { recursive: true, force: true });

const edge = spawn(EDGE, [
  '--headless=new', '--no-sandbox', '--disable-gpu-sandbox',
  '--disable-features=NetworkServiceSandbox', '--enable-unsafe-swiftshader',
  '--hide-scrollbars', '--remote-debugging-port=' + PORT,
  '--user-data-dir=' + PROFILE, '--window-size=1440,900', APP_URL
], { stdio: 'ignore' });

function getJson(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (err) { reject(err); }
      });
    });
    req.on('error', reject);
    req.setTimeout(5000, () => req.destroy(new Error('timeout')));
  });
}

async function waitForPage() {
  const started = Date.now();
  while (Date.now() - started < 20000) {
    try {
      const targets = await getJson(`http://127.0.0.1:${PORT}/json/list`);
      const page = targets.find((t) => t.type === 'page');
      if (page && page.webSocketDebuggerUrl) return page;
    } catch (err) { /* retry */ }
    await sleep(400);
  }
  throw new Error('CDP target not found');
}

let ws;
let seq = 0;
const pending = new Map();
const runtimeErrors = [];
const consoleErrors = [];

function send(method, params = {}) {
  const id = ++seq;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error('CDP timeout: ' + method));
    }, 15000);
    pending.set(id, {
      resolve: (value) => { clearTimeout(timer); resolve(value); },
      reject: (err) => { clearTimeout(timer); reject(err); }
    });
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) {
    throw new Error('Eval exception: ' + JSON.stringify(result.exceptionDetails.exception || result.exceptionDetails));
  }
  return result.result ? result.result.value : undefined;
}

async function shot(name) {
  const result = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(SHOTS, name), Buffer.from(result.data, 'base64'));
  console.log('screenshot:', name);
}

async function main() {
  const page = await waitForPage();
  ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const handlers = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) handlers.reject(new Error(JSON.stringify(msg.error)));
      else handlers.resolve(msg.result);
      return;
    }
    if (msg.method === 'Runtime.exceptionThrown') runtimeErrors.push(JSON.stringify(msg.params.exceptionDetails));
    if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error') consoleErrors.push(msg.params.entry.text);
  };

  await send('Runtime.enable');
  await send('Page.enable');
  await send('Log.enable');
  await send('Page.navigate', { url: APP_URL });
  await sleep(6000);

  const base = await evaluate(`(() => {
    const s = window.__KN.state;
    return {
      categories: s.categories.length,
      kps: s.kps.length,
      graphNodes: s.graph ? s.graph.graphData().nodes.length : null,
      treeTops: document.querySelectorAll('.tree-top').length,
      filesShown: document.querySelectorAll('.tree-kp').length,
      cards: document.querySelectorAll('.data-card').length,
      hasMastery: document.body.innerText.includes('掌握度'),
      hasReview: document.body.innerText.includes('复习'),
      autoRotate: s.autoRotate,
      hash: location.hash,
      noteMode: document.body.classList.contains('note-mode')
    };
  })()`);
  console.log('BASE:', JSON.stringify(base));
  await shot('v5-dashboard.png');

  // 树：初始展开；点一次收起；再点一次展开
  const treeState = () => evaluate(`(() => {
    const row = [...document.querySelectorAll('.tree-top')].find((el) => el.textContent.includes('计算机基础'));
    return { expanded: row.classList.contains('is-expanded'), files: document.querySelectorAll('.tree-kp').length, nodes: window.__KN.state.graph.graphData().nodes.length };
  })()`);
  console.log('TREE INITIAL:', JSON.stringify(await treeState()));
  await evaluate(`(() => {
    const row = [...document.querySelectorAll('.tree-top')].find((el) => el.textContent.includes('计算机基础'));
    row.click();
    return true;
  })()`);
  await sleep(250);
  console.log('TREE COLLAPSED:', JSON.stringify(await treeState()));
  await evaluate(`(() => {
    const row = [...document.querySelectorAll('.tree-top')].find((el) => el.textContent.includes('计算机基础'));
    row.click();
    return true;
  })()`);
  await sleep(250);
  console.log('TREE EXPANDED AGAIN:', JSON.stringify(await treeState()));

  // 点击文件 → 独立页面（不是抽屉）
  await evaluate(`(() => {
    const file = [...document.querySelectorAll('.tree-kp')].find((el) => el.textContent.includes('进程与线程'));
    file.click();
    return true;
  })()`);
  await sleep(900);
  const note = await evaluate(`(() => ({
    hash: location.hash,
    noteMode: document.body.classList.contains('note-mode'),
    panelOpen: getComputedStyle(document.querySelector('#detail-panel')).display,
    title: document.querySelector('#kp-title').value,
    hasMasterySelect: !!document.querySelector('#kp-mastery'),
    focusedId: document.activeElement ? document.activeElement.id : null,
    categoryOptions: document.querySelectorAll('#kp-category-select option').length
  }))()`);
  console.log('NOTE:', JSON.stringify(note));
  await shot('v5-note.png');

  // 编辑标题/正文并等待自动保存
  await evaluate(`(() => {
    const title = document.querySelector('#kp-title');
    title.value = '进程与线程 · 独立页面测试';
    title.dispatchEvent(new Event('input', { bubbles: true }));
    const editor = document.querySelector('#editor');
    editor.innerHTML = '<p>独立页面的自动保存测试。</p><h3>要点</h3><ul><li>直接页面，不弹抽屉</li><li>标题可重命名</li></ul>';
    editor.dispatchEvent(new Event('input', { bubbles: true }));
  })()`);
  await sleep(1200);
  const saved = await evaluate(`(() => ({
    status: document.querySelector('#save-status').textContent,
    treeFile: [...document.querySelectorAll('.tree-kp')].some((el) => el.textContent.includes('独立页面测试')),
    graphTitle: (() => { const n = window.__KN.state.graph.graphData().nodes.find((x) => x.id === window.__KN.state.selectedId); return n ? n.title : null; })(),
    stored: (localStorage.getItem('knowledge-nebula-prototype-v1') || '').includes('独立页面测试')
  }))()`);
  console.log('SAVED:', JSON.stringify(saved));
  await shot('v5-note-edited.png');

  // 返回星图
  await evaluate(`document.querySelector('#panel-close').click()`);
  await sleep(700);
  const back = await evaluate(`(() => ({
    noteMode: document.body.classList.contains('note-mode'),
    hash: location.hash,
    graphNodes: window.__KN.state.graph.graphData().nodes.length,
    files: document.querySelectorAll('.tree-kp').length
  }))()`);
  console.log('BACK:', JSON.stringify(back));

  // 选中分类后新增文件 → 独立页面，标题聚焦
  await evaluate(`(() => {
    const row = [...document.querySelectorAll('.tree-top')].find((el) => el.textContent.includes('计算机基础'));
    if (!row.classList.contains('is-expanded')) row.click();
    document.querySelector('#btn-add').click();
  })()`);
  await sleep(900);
  const added = await evaluate(`(() => ({
    noteMode: document.body.classList.contains('note-mode'),
    title: document.querySelector('#kp-title').value,
    focused: document.activeElement ? document.activeElement.id : null,
    kps: window.__KN.state.kps.length,
    categories: window.__KN.state.categories.length,
    graphNodes: window.__KN.state.graph.graphData().nodes.length
  }))()`);
  console.log('ADD UNDER CATEGORY:', JSON.stringify(added));
  await shot('v5-add-note.png');

  // 删除这个新文件，回星图
  await evaluate(`(() => { window.confirm = () => true; document.querySelector('#btn-delete').click(); })()`);
  await sleep(800);
  const afterDelete = await evaluate(`(() => ({
    kps: window.__KN.state.kps.length,
    graphNodes: window.__KN.state.graph.graphData().nodes.length,
    noteMode: document.body.classList.contains('note-mode'),
    hash: location.hash
  }))()`);
  console.log('DELETE:', JSON.stringify(afterDelete));

  // 清空选择后新增 → 新一级分类 + 文件
  await evaluate(`document.querySelector('.tree-all').click()`);
  await evaluate(`document.querySelector('#btn-add').click()`);
  await sleep(900);
  const newCategory = await evaluate(`(() => ({
    categories: window.__KN.state.categories.length,
    kps: window.__KN.state.kps.length,
    noteMode: document.body.classList.contains('note-mode'),
    title: document.querySelector('#kp-title').value,
    treeTops: document.querySelectorAll('.tree-top').length
  }))()`);
  console.log('ADD NEW CATEGORY:', JSON.stringify(newCategory));
  await shot('v5-add-category.png');

  console.log('RUNTIME_ERRORS:', JSON.stringify(runtimeErrors));
  console.log('CONSOLE_ERRORS:', JSON.stringify(consoleErrors));
}

try { await main(); } catch (err) {
  console.error('FAILED:', err && err.stack ? err.stack : err);
  process.exitCode = 1;
} finally {
  try { if (ws) ws.close(); } catch (err) { /* ignore */ }
  try { edge.kill(); } catch (err) { /* ignore */ }
  await sleep(400);
}
