/* 原型验收脚本：用 Edge Headless + CDP 检查渲染、点击、编辑、自动保存、新增、复习。
 * 仅开发期使用，不属于原型交付物。
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PROFILE = path.join(process.env.TEMP || '.', 'dsh-cdp-profile');
const PORT = 9223;
const DESIGN = process.env.DESIGN || '';
const APP_URL = 'http://127.0.0.1:8765/' + (DESIGN ? '?design=' + DESIGN : '');
const SHOTS = path.resolve('prototype/shots');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

fs.mkdirSync(SHOTS, { recursive: true });
fs.rmSync(PROFILE, { recursive: true, force: true });

const edge = spawn(EDGE, [
  '--headless=new',
  '--no-sandbox',
  '--disable-gpu-sandbox',
  '--disable-features=NetworkServiceSandbox',
  '--enable-unsafe-swiftshader',
  '--hide-scrollbars',
  '--remote-debugging-port=' + PORT,
  '--user-data-dir=' + PROFILE,
  '--window-size=1440,900',
  APP_URL
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
  throw new Error('CDP page target not found');
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
  const file = path.join(SHOTS, name);
  fs.writeFileSync(file, Buffer.from(result.data, 'base64'));
  console.log('screenshot:', name);
}

async function main() {
  const page = await waitForPage();
  ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const handlers = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) handlers.reject(new Error(JSON.stringify(msg.error)));
      else handlers.resolve(msg.result);
      return;
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      runtimeErrors.push(JSON.stringify(msg.params && msg.params.exceptionDetails));
    }
    if (msg.method === 'Log.entryAdded' && msg.params && msg.params.entry && msg.params.entry.level === 'error') {
      consoleErrors.push(msg.params.entry.text);
    }
  };

  await send('Runtime.enable');
  await send('Page.enable');
  await send('Log.enable');
  await send('Page.navigate', { url: APP_URL });
  await sleep(6000);

  const diagnostics = await evaluate(`(() => {
    const labels = [...document.querySelectorAll('.node-label')];
    const visible = labels.filter((l) => l.classList.contains('visible'));
    const info = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return { className: el.className, rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }, opacity: s.opacity, display: s.display, transform: el.style.transform, text: el.textContent };
    };
    const state = window.__KN && window.__KN.state;
    const cam = state && state.graph ? state.graph.cameraPosition() : null;
    const canvas = document.querySelector('#graph canvas');
    return {
      errors: window.__KN_ERRORS || [],
      labels: labels.length,
      visible: visible.length,
      sample: info(labels[0]),
      layer: info(document.querySelector('#labels-layer')),
      camera: cam,
      cameraDist: cam ? Math.round(Math.hypot(cam.x, cam.y, cam.z)) : null,
      nodes: state && state.graph ? state.graph.graphData().nodes.length : null,
      canvas: canvas ? { width: canvas.width, height: canvas.height, rect: canvas.getBoundingClientRect().toJSON() } : null,
      treeKps: document.querySelectorAll('.tree-kp').length
    };
  })()`);
  console.log('DESIGN:', DESIGN || 'default');
  console.log('DIAGNOSTICS:', JSON.stringify(diagnostics, null, 2));
  await shot('cdp-home.png');

  // 如果标签没显示，手动调用一次定位并再次读状态
  if (diagnostics.visible === 0) {
    await evaluate('window.__KN.updateLabelPositions()');
    const retry = await evaluate(`(() => {
      const labels = [...document.querySelectorAll('.node-label')];
      const visible = labels.filter((l) => l.classList.contains('visible'));
      return { errors: window.__KN_ERRORS, labels: labels.length, visible: visible.length, sample: labels[0] ? { className: labels[0].className, opacity: getComputedStyle(labels[0]).opacity, transform: labels[0].style.transform, rect: labels[0].getBoundingClientRect().toJSON() } : null };
    })()`);
    console.log('LABEL RETRY:', JSON.stringify(retry, null, 2));
    await shot('cdp-home-retry.png');
  }

  // 1) 点击侧栏知识点，打开编辑面板
  await evaluate(`(() => {
    const btn = [...document.querySelectorAll('.tree-kp')].find((b) => b.textContent.includes('进程调度')) || document.querySelector('.tree-kp');
    btn.click();
    return !!btn;
  })()`);
  await sleep(1600);
  const panelState = await evaluate(`(() => ({
    panelOpen: document.querySelector('#detail-panel').classList.contains('open'),
    title: document.querySelector('#kp-title').value,
    editor: (document.querySelector('#editor').innerText || '').slice(0, 80),
    status: document.querySelector('#save-status').textContent,
    selected: window.__KN.state.selectedId
  }))()`);
  console.log('PANEL:', JSON.stringify(panelState));
  await shot('cdp-panel.png');

  // 2) 编辑标题和正文，验证自动保存
  await evaluate(`(() => {
    const title = document.querySelector('#kp-title');
    title.value = '进程调度 · 原型编辑测试';
    title.dispatchEvent(new Event('input', { bubbles: true }));
    const editor = document.querySelector('#editor');
    editor.innerHTML = '<p>这是自动保存测试段落。</p><h3>关键点</h3><ul><li>自动保存应在约 1 秒内完成</li><li>刷新后数据应保留</li></ul><div class="math">O(n log n)</div>';
    editor.dispatchEvent(new Event('input', { bubbles: true }));
  })()`);
  await sleep(1500);
  const saveState = await evaluate(`(() => ({
    status: document.querySelector('#save-status').textContent,
    title: document.querySelector('#kp-title').value,
    localStorageHasTitle: (localStorage.getItem('knowledge-nebula-prototype-v1') || '').includes('原型编辑测试'),
    recentFirst: document.querySelector('#recent-list .recent-title') ? document.querySelector('#recent-list .recent-title').textContent : null
  }))()`);
  console.log('AUTOSAVE:', JSON.stringify(saveState));
  await shot('cdp-autosave.png');

  // 3) 新增知识点
  await evaluate(`document.querySelector('#btn-add').click()`);
  await sleep(300);
  await evaluate(`(() => {
    const input = document.querySelector('#new-title');
    input.value = '原型新知识点';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    document.querySelector('#btn-create').click();
  })()`);
  await sleep(1600);
  const addState = await evaluate(`(() => ({
    kpCount: window.__KN.state.kps.length,
    treeKps: document.querySelectorAll('.tree-kp').length,
    selected: window.__KN.state.selectedId,
    panelTitle: document.querySelector('#kp-title').value,
    toast: document.querySelector('#toast').textContent
  }))()`);
  console.log('ADD:', JSON.stringify(addState));
  await shot('cdp-add.png');

  // 3.1) 删除新增节点，验证图谱与四块数据实时回退
  await evaluate(`(() => { window.confirm = () => true; document.querySelector('#btn-delete').click(); })()`);
  await sleep(1200);
  const deleteState = await evaluate(`(() => ({
    kpCount: window.__KN.state.kps.length,
    graphNodes: window.__KN.state.graph.graphData().nodes.length,
    overview: [...document.querySelectorAll('#overview-grid .overview-value')].map((el) => el.textContent),
    recentCount: document.querySelector('#recent-count') ? document.querySelector('#recent-count').textContent : null,
    panelOpen: document.querySelector('#detail-panel').classList.contains('open')
  }))()`);
  console.log('DELETE:', JSON.stringify(deleteState));

  // 4) 复习流程
  await evaluate(`document.querySelector('#btn-review').click()`);
  await sleep(500);
  await evaluate(`document.querySelector('#btn-reveal').click()`);
  await sleep(600);
  const reviewState = await evaluate(`(() => ({
    modalOpen: !document.querySelector('#review-modal').classList.contains('hidden'),
    title: document.querySelector('#review-kp-title').textContent,
    contentVisible: !document.querySelector('#review-content').classList.contains('hidden'),
    masteryVisible: !document.querySelector('#review-mastery').classList.contains('hidden')
  }))()`);
  console.log('REVIEW:', JSON.stringify(reviewState));
  await shot('cdp-review.png');

  // 5) 移动端布局检查
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await send('Page.navigate', { url: APP_URL });
  await sleep(5000);
  const mobileState = await evaluate(`(() => {
    const inspect = (id) => {
      const el = document.getElementById(id);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return { rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }, display: s.display, visibility: s.visibility, opacity: s.opacity, position: s.position, zIndex: s.zIndex };
    };
    return {
      viewport: { w: innerWidth, h: innerHeight },
      sidebarToggle: inspect('sidebar-toggle'),
      sidebarAdd: inspect('btn-add'),
      graphPanel: inspect('graph-wrap'),
      dataGrid: inspect('data-grid'),
      search: inspect('search-input'),
      reviewCardButton: inspect('btn-review-card')
    };
  })()`);
  console.log('MOBILE:', JSON.stringify(mobileState, null, 2));
  await shot('cdp-mobile.png');
  await send('Emulation.clearDeviceMetricsOverride');

  console.log('RUNTIME_ERRORS:', JSON.stringify(runtimeErrors));
  console.log('CONSOLE_ERRORS:', JSON.stringify(consoleErrors));
}

try {
  await main();
} catch (err) {
  console.error('FAILED:', err && err.stack ? err.stack : err);
  process.exitCode = 1;
} finally {
  try { if (ws) ws.close(); } catch (err) { /* ignore */ }
  try { edge.kill(); } catch (err) { /* ignore */ }
  await sleep(400);
}
