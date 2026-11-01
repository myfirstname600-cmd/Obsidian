/* 知识星图 · 交互原型 v1.1（本地 / 手机所有者编辑 + 只读发布）
 * 08 Quiet 定稿方向。纯前端、假数据、localStorage。
 * 关键变化：
 * - 树：一级分类 > 知识点文件；只能展开，不能收起；新增直接落文件
 * - 文件：独立页面（hash 路由），不再使用抽屉
 * - 删除掌握度 / 复习
 * - 星图：完整展示、自动旋转、不随树点击变化；新增/删除时更新
 */
(function () {
  'use strict';

  window.__KN_ERRORS = [];
  window.addEventListener('error', (event) => {
    window.__KN_ERRORS.push(String(event.message || event.error || 'unknown'));
  });

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const STORAGE_KEY = 'knowledge-nebula-prototype-v1';
  const HISTORY_KEY = 'knowledge-nebula-history-v1';
  const HISTORY_LIMIT = 40;
  const HISTORY_MIN_INTERVAL = 8000;
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const nowIso = () => new Date().toISOString();
  const uid = (prefix) => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

  const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '']);
  const IS_LOCAL_DEV = location.protocol === 'file:' || LOCAL_HOSTS.has(location.hostname);
  const FORCED_READONLY = new URLSearchParams(location.search).get('readonly') === '1';
  const OWNER_TOKEN_KEY = 'knowledge-nebula-github-token-v1';
  const OWNER_REPO = {
    owner: 'myfirstname600-cmd',
    repo: 'Obsidian',
    branch: 'main',
    path: 'prototype/published-vault.js'
  };
  let STORED_OWNER_TOKEN = '';
  try { STORED_OWNER_TOKEN = localStorage.getItem(OWNER_TOKEN_KEY) || ''; } catch (err) { /* storage unavailable */ }
  const OWNER_MODE = !FORCED_READONLY && (IS_LOCAL_DEV || !!STORED_OWNER_TOKEN);
  const READ_ONLY = FORCED_READONLY || (!IS_LOCAL_DEV && !STORED_OWNER_TOKEN);
  const LOCAL_READONLY_PREVIEW = IS_LOCAL_DEV && FORCED_READONLY;

  const DESIGN_ID = document.documentElement.getAttribute('data-design') || '8';
  const DESIGN_PRESETS = {
    '1': {
      graphBg: '#0d0e10', autoLink: 'rgba(124, 140, 255, 0.16)', manualLink: 'rgba(124, 140, 255, 0.55)',
      nodeAccent: '#ffffff', palette: ['#7c8cff', '#d7a15c', '#72c69f', '#d78fb5']
    },
    '2': {
      graphBg: '#fcfbf8', autoLink: 'rgba(40, 37, 32, 0.12)', manualLink: 'rgba(165, 28, 48, 0.48)',
      nodeAccent: '#1d1c19', palette: ['#a51c30', '#8a5a00', '#2f6b3a', '#3b4a5a']
    },
    '3': {
      graphBg: '#1e1e1e', autoLink: 'rgba(86, 156, 214, 0.18)', manualLink: 'rgba(197, 134, 192, 0.55)',
      nodeAccent: '#ffffff', palette: ['#569cd6', '#dcdcaa', '#4ec9b0', '#c586c0']
    },
    '4': {
      graphBg: '#eef2f7', autoLink: 'rgba(31, 58, 95, 0.14)', manualLink: 'rgba(29, 78, 216, 0.5)',
      nodeAccent: '#0f172a', palette: ['#1d4ed8', '#b45309', '#047857', '#9f1239']
    },
    '5': {
      graphBg: '#050505', autoLink: 'rgba(245, 185, 66, 0.12)', manualLink: 'rgba(245, 185, 66, 0.5)',
      nodeAccent: '#f5b942', palette: ['#f5b942', '#9a9a9a', '#4fd1c5', '#e07a5f']
    },
    '6': {
      graphBg: '#f7f8fa', autoLink: 'rgba(30, 30, 30, 0.12)', manualLink: 'rgba(13, 153, 255, 0.5)',
      nodeAccent: '#111827', palette: ['#0d99ff', '#7c4dff', '#0f9d58', '#e5484d']
    },
    '7': {
      graphBg: '#fcfbf8', autoLink: 'rgba(40, 37, 32, 0.1)', manualLink: 'rgba(59, 91, 219, 0.38)',
      nodeAccent: '#1f2937', palette: ['#3b5bdb', '#9a5b2e', '#2f6b52', '#6b5b95']
    },
    '8': {
      graphBg: '#f7f7f9', autoLink: 'rgba(109, 40, 217, 0.34)', manualLink: 'rgba(37, 99, 235, 0.66)',
      nodeAccent: '#7c3aed', palette: ['#7c3aed', '#2563eb', '#059669', '#d97706']
    }
  };
  const DESIGN = DESIGN_PRESETS[DESIGN_ID] || DESIGN_PRESETS['8'];

  const els = {
    app: $('#app'),
    workspace: $('#workspace'),
    stage: $('#stage'),
    editorTabs: $('#editor-tabs'),
    tabNew: $('#tab-new'),
    tabGraph: $('#tab-graph'),
    emptyWorkspace: $('#empty-workspace'),
    emptyNew: $('#empty-new'),
    emptyGraph: $('#empty-graph'),
    emptySwitch: $('#empty-switch'),
    ribbonNew: $('#ribbon-new'),
    ribbonSearch: $('#ribbon-search'),
    ribbonGraph: $('#ribbon-graph'),
    ribbonPalette: $('#ribbon-palette'),
    ribbonBackup: $('#ribbon-backup'),
    ribbonSettings: $('#ribbon-settings'),
    ribbonInstall: $('#ribbon-install'),
    emptyInstall: $('#empty-install'),
    statusNetwork: $('#status-network'),
    vaultNew: $('#vault-new'),
    vaultOwner: $('#vault-owner'),
    emptyOwner: $('#empty-owner'),
    ownerModal: $('#owner-modal'),
    ownerToken: $('#owner-token'),
    ownerStatus: $('#owner-status'),
    ownerConnect: $('#owner-connect'),
    ownerClear: $('#owner-clear'),
    ownerClose: $('#owner-close'),
    ownerCancel: $('#owner-cancel'),
    btnPublishGithub: $('#btn-publish-github'),
    sidebarGraph: $('#sidebar-graph'),
    sidebarGraphCount: $('#sidebar-graph-count'),
    statusFile: $('#status-file'),
    statusBacklinks: $('#status-backlinks'),
    statusWords: $('#status-words'),
    statusSave: $('#status-save'),
    statusVault: $('#status-vault'),
    graphWrap: $('#graph-wrap'),
    graph: $('#graph'),
    labels: $('#labels-layer'),
    sidebar: $('#sidebar'),
    sidebarToggle: $('#sidebar-toggle'),
    sidebarClose: $('#sidebar-close'),
    sidebarCollapse: $('#sidebar-collapse'),
    sidebarExpand: $('#sidebar-expand'),
    mobileOverlay: $('#mobile-overlay'),
    search: $('#search-input'),
    searchResults: $('#search-results'),
    searchResultList: $('#search-result-list'),
    treeSection: $('#tree-section'),
    tree: $('#category-tree'),
    recent: $('#recent-list'),
    recentCount: $('#recent-count'),
    stats: $('#stats'),
    overviewGrid: $('#overview-grid'),
    hint: $('#graph-hint'),
    panel: $('#detail-panel'),
    panelClose: $('#panel-close'),
    panelChip: $('#panel-category-chip'),
    panelUpdated: $('#panel-updated'),
    panelReading: $('#panel-reading'),
    panelSource: $('#panel-source'),
    markdownSourceWrap: $('#markdown-source-wrap'),
    markdownSource: $('#markdown-source'),
    markdownPreview: $('#markdown-preview'),
    title: $('#kp-title'),
    categorySelect: $('#kp-category-select'),
    tags: $('#kp-tags'),
    editor: $('#editor'),
    saveStatus: $('#save-status'),
    btnAdd: $('#btn-add'),
    btnReset: $('#btn-reset'),
    btnMore: $('#btn-more'),
    moreMenu: $('#more-menu'),
    btnExport: $('#btn-export'),
    btnImport: $('#btn-import'),
    importFile: $('#import-file'),
    btnExportMd: $('#btn-export-md'),
    btnImportMd: $('#btn-import-md'),
    importMd: $('#import-md'),
    btnPublish: $('#btn-publish'),
    btnFit: $('#btn-fit'),
    btnRotate: $('#btn-rotate'),
    btnCollapseGraph: $('#btn-collapse-graph'),
    graphFallback: $('#graph-fallback'),
    graphFallbackTag: $('#graph-fallback-tag'),
    btnHistory: $('#btn-history'),
    historyCount: $('#history-count'),
    historyModal: $('#history-modal'),
    historyList: $('#history-list'),
    historyClose: $('#history-close'),
    btnDelete: $('#btn-delete'),
    noteOutline: $('#note-outline'),
    noteBacklinks: $('#note-backlinks'),
    noteOutlinks: $('#note-outlinks'),
    outlineCount: $('#outline-count'),
    backlinkCount: $('#backlink-count'),
    outlinkCount: $('#outlink-count'),
    btnWikiLink: $('#btn-wikilink'),
    palette: $('#command-palette'),
    paletteInput: $('#palette-input'),
    paletteList: $('#palette-list'),
    paletteMode: $('#palette-title'),
    toast: $('#toast')
  };

  const state = {
    categories: [],
    kps: [],
    relations: [],
    history: {},
    readOnly: READ_ONLY,
    readOnlyPreview: LOCAL_READONLY_PREVIEW,
    publishedAt: null,
    ownerMode: OWNER_MODE,
    ownerToken: STORED_OWNER_TOKEN,
    ownerVerified: IS_LOCAL_DEV,
    ownerBusy: false,
    lastCommitUrl: '',
    selectedId: null,
    selectedCategoryId: null,
    expanded: new Set(),
    search: '',
    matchIds: new Set(),
    graph: null,
    labels: new Map(),
    hoverId: null,
    saveTimer: null,
    toastTimer: null,
    initialFit: false,
    userInteracted: false,
    interacting: false,
    rotationResumeAt: 0,
    autoRotate: true,
    focusTitleOnOpen: false,
    needsFit: false,
    sidebarCollapsed: false,
    noteMode: false,
    readingMode: false,
    sourceMode: false,
    sourceMarkdown: '',
    paletteMode: 'commands',
    paletteItems: [],
    paletteIndex: 0,
    linkSignatures: new Map(),
    graphFallback: null,
    fallbackLayout: [],
    fallbackHover: null,
    fallbackBound: false,
    installPrompt: null,
    tabs: [],
    activeTabId: null,
    labelLast: 0,
    lastFrame: 0
  };

  /* ------------------------------ data ------------------------------ */
  function defaultData() {
    return {
      categories: clone(window.PROTOTYPE_DATA.categories),
      kps: clone(window.PROTOTYPE_DATA.knowledgePoints),
      relations: clone(window.PROTOTYPE_DATA.manualRelations)
    };
  }

  function normalizeData(raw) {
    if (!raw || !Array.isArray(raw.categories) || !Array.isArray(raw.kps)) return defaultData();
    const rawCats = raw.categories.filter((c) => c && c.id);
    const catMap = new Map(rawCats.map((c) => [c.id, c]));
    let tops = rawCats.filter((c) => !c.parentId);
    if (!tops.length) tops = rawCats.slice();
    if (!tops.length) return defaultData();

    const topOf = (id) => {
      let current = catMap.get(id);
      const seen = new Set();
      while (current && current.parentId && !seen.has(current.id)) {
        seen.add(current.id);
        current = catMap.get(current.parentId);
      }
      return current;
    };

    const categories = tops.map((cat, index) => ({
      id: cat.id,
      name: cat.name || '未分类',
      parentId: null,
      color: cat.color || '#94a3b8',
      order: cat.order || index + 1
    }));
    const catIds = new Set(categories.map((c) => c.id));
    const kpIds = new Set();

    const kps = raw.kps
      .filter((kp) => kp && kp.id)
      .map((kp) => {
        const rawCategoryId = kp.categoryId || kp.topicId;
        const top = topOf(rawCategoryId);
        const categoryId = top && catIds.has(top.id) ? top.id : categories[0].id;
        kpIds.add(kp.id);
        return {
          id: kp.id,
          title: kp.title || '未命名知识点',
          categoryId,
          tags: Array.isArray(kp.tags) ? kp.tags : [],
          summary: kp.summary || '',
          updatedAt: kp.updatedAt || nowIso(),
          content: kp.content || ''
        };
      });

    const relations = (Array.isArray(raw.relations) ? raw.relations : [])
      .filter((rel) => rel && kpIds.has(rel.from) && kpIds.has(rel.to));

    return { categories, kps, relations };
  }

  function loadLocalData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultData();
      return normalizeData(JSON.parse(raw));
    } catch (err) {
      return defaultData();
    }
  }

  function loadPublishedData() {
    const published = window.PUBLISHED_VAULT;
    if (!published) return null;
    const source = published.data || published;
    if (!source || !Array.isArray(source.categories) || !Array.isArray(source.kps)) return null;
    state.publishedAt = published.exportedAt || published.publishedAt || null;
    return normalizeData(source);
  }

  function loadData() {
    if (state.readOnly) {
      const published = loadPublishedData();
      if (published) return published;
      if (state.readOnlyPreview) return loadLocalData();
      return defaultData();
    }
    if (state.ownerMode && !IS_LOCAL_DEV) {
      try {
        if (!localStorage.getItem(STORAGE_KEY)) {
          const published = loadPublishedData();
          if (published) return published;
        }
      } catch (err) { /* ignore */ }
    }
    return loadLocalData();
  }

  function persist() {
    if (state.readOnly) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      categories: state.categories,
      kps: state.kps,
      relations: state.relations
    }));
  }

  function normalizeHistoryRaw(raw) {
    if (!raw || typeof raw !== 'object') return {};
    const clean = {};
    Object.keys(raw).forEach((key) => {
      if (!Array.isArray(raw[key])) return;
      const list = raw[key]
        .filter((entry) => entry && typeof entry.ts === 'number')
        .slice(-HISTORY_LIMIT);
      if (list.length) clean[key] = list;
    });
    return clean;
  }

  function loadHistory() {
    if (state.readOnly) return {};
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (!raw) return {};
      return normalizeHistoryRaw(JSON.parse(raw));
    } catch (err) {
      return {};
    }
  }

  function persistHistory() {
    if (state.readOnly) return;
    localStorage.setItem(HISTORY_KEY, JSON.stringify(state.history));
  }

  function updateHistoryCount() {
    if (!els.historyCount) return;
    const count = state.selectedId && Array.isArray(state.history[state.selectedId])
      ? state.history[state.selectedId].length
      : 0;
    els.historyCount.textContent = String(count);
  }

  function snapshotVersion(kp, options) {
    if (!kp || state.readOnly) return;
    const opts = options || {};
    const list = Array.isArray(state.history[kp.id]) ? state.history[kp.id] : [];
    const entry = {
      ts: Date.now(),
      title: kp.title || '未命名知识点',
      content: kp.content || '',
      tags: clone(kp.tags || []),
      categoryId: kp.categoryId,
      summary: kp.summary || '',
      baseline: !!opts.baseline
    };
    const last = list[list.length - 1];
    const same = last
      && last.title === entry.title
      && (last.content || '') === entry.content
      && (last.categoryId || '') === (entry.categoryId || '')
      && JSON.stringify(last.tags || []) === JSON.stringify(entry.tags || []);
    if (same) return;
    if (last && !opts.force && !last.baseline && entry.ts - last.ts < HISTORY_MIN_INTERVAL) {
      list[list.length - 1] = entry;
    } else {
      list.push(entry);
    }
    if (list.length > HISTORY_LIMIT) list.splice(0, list.length - HISTORY_LIMIT);
    state.history[kp.id] = list;
    try { persistHistory(); } catch (err) { /* ignore */ }
    updateHistoryCount();
  }

  function applyDesignPalette() {
    state.categories
      .slice()
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .forEach((category, index) => {
        category.color = DESIGN.palette[index % DESIGN.palette.length];
      });
  }

  function resetToDefault() {
    const data = defaultData();
    state.categories = data.categories;
    state.kps = data.kps;
    state.relations = data.relations;
    state.history = {};
    state.search = '';
    state.matchIds = new Set();
    state.selectedId = null;
    state.selectedCategoryId = null;
    state.expanded = new Set();
    state.hoverId = null;
    applyDesignPalette();
    const first = topCategories()[0];
    if (first) state.expanded.add(first.id);
  }

  /* ------------------------------ helpers ------------------------------ */
  function catById(id) { return state.categories.find((c) => c.id === id) || null; }
  function kpById(id) { return state.kps.find((k) => k.id === id) || null; }
  function topCategories() {
    return state.categories.slice().sort((a, b) => (a.order || 0) - (b.order || 0));
  }
  function kpsOfCategory(categoryId) {
    return state.kps.filter((kp) => kp.categoryId === categoryId);
  }
  function categoryName(id) { return catById(id)?.name || '未分类'; }
  function colorOf(kp) { return catById(kp.categoryId)?.color || '#94a3b8'; }
  function countLinks() {
    // 直接和图上实际连线保持一致（分类枢纽 + 手动关系 + 分类主干 + 双向链接）
    return buildGraphData().links.length;
  }
  function uniqueTags() {
    const tags = new Set();
    state.kps.forEach((kp) => (kp.tags || []).forEach((tag) => tags.add(tag)));
    return tags;
  }
  function timeAgo(iso) {
    if (!iso) return '';
    const diff = Date.now() - new Date(iso).getTime();
    if (!Number.isFinite(diff)) return '';
    if (diff < 60 * 1000) return '刚刚';
    if (diff < 60 * 60 * 1000) return `${Math.floor(diff / 60000)} 分钟前`;
    if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / 3600000)} 小时前`;
    if (diff < 7 * 24 * 60 * 60 * 1000) return `${Math.floor(diff / 86400000)} 天前`;
    return new Date(iso).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
  }
  function clock(iso) {
    return new Date(iso).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  }
  function stripHtml(html) {
    const div = document.createElement('div');
    div.innerHTML = html || '';
    return (div.textContent || '').replace(/\s+/g, ' ').trim();
  }
  function parseTags(value) {
    return String(value || '')
      .split(/[,，]/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 12);
  }
  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ------------------------------ wikilinks ------------------------------ */
  function normalizeLinkTitle(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }
  function linkKey(value) {
    return normalizeLinkTitle(value).toLowerCase();
  }
  function findKpByTitle(title) {
    const key = linkKey(title);
    if (!key) return null;
    return state.kps.find((kp) => linkKey(kp.title) === key) || null;
  }
  function extractWikiLinks(html) {
    const wrap = document.createElement('div');
    wrap.innerHTML = html || '';
    const results = [];
    const add = (value) => {
      const target = normalizeLinkTitle(String(value || '').split('|')[0]);
      if (target && !results.some((item) => linkKey(item) === linkKey(target))) results.push(target);
    };
    wrap.querySelectorAll('a.wiki-link, [data-wiki]').forEach((el) => {
      add(el.dataset.wiki || el.textContent || '');
    });
    const walker = document.createTreeWalker(wrap, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node) {
      if (!node.parentElement || !node.parentElement.closest('a.wiki-link, pre, code')) {
        const text = node.nodeValue || '';
        let match;
        const regex = /\[\[([^\]]+)\]\]/g;
        while ((match = regex.exec(text))) add(match[1]);
      }
      node = walker.nextNode();
    }
    return results;
  }
  function wikiSignature(kp) {
    return linkKey(kp.title) + '::' + extractWikiLinks(kp.content).map(linkKey).sort().join('|');
  }
  function makeWikiAnchor(title, alias) {
    const target = normalizeLinkTitle(title);
    const anchor = document.createElement('a');
    anchor.className = 'wiki-link';
    anchor.href = '#';
    anchor.dataset.wiki = target;
    anchor.textContent = normalizeLinkTitle(alias) || target;
    return anchor;
  }
  function refreshWikiLinkStates() {
    if (!els.editor) return;
    els.editor.querySelectorAll('a.wiki-link').forEach((anchor) => {
      const target = anchor.dataset.wiki || '';
      anchor.classList.toggle('is-missing', !findKpByTitle(target));
      anchor.title = findKpByTitle(target)
        ? `打开「${target}」`
        : `创建「${target}」并打开`;
    });
  }
  function normalizeWikiLinksInEditor(markDirtyAfter) {
    if (!state.selectedId || !els.editor) return false;
    const walker = document.createTreeWalker(els.editor, NodeFilter.SHOW_TEXT);
    const nodes = [];
    let node = walker.nextNode();
    while (node) {
      if (!node.parentElement || !node.parentElement.closest('a.wiki-link, pre, code')) {
        if (/\[\[[^\]]+\]\]/.test(node.nodeValue || '')) nodes.push(node);
      }
      node = walker.nextNode();
    }
    let changed = false;
    nodes.forEach((textNode) => {
      const text = textNode.nodeValue || '';
      const fragment = document.createDocumentFragment();
      const regex = /\[\[([^\]]+)\]\]/g;
      let last = 0;
      let match;
      while ((match = regex.exec(text))) {
        if (match.index > last) fragment.appendChild(document.createTextNode(text.slice(last, match.index)));
        const parts = match[1].split('|');
        const target = normalizeLinkTitle(parts[0]);
        if (target) {
          fragment.appendChild(makeWikiAnchor(target, parts[1] || target));
          changed = true;
        } else {
          fragment.appendChild(document.createTextNode(match[0]));
        }
        last = regex.lastIndex;
      }
      if (last < text.length) fragment.appendChild(document.createTextNode(text.slice(last)));
      if (textNode.parentNode) textNode.parentNode.replaceChild(fragment, textNode);
    });
    if (changed) {
      refreshWikiLinkStates();
      if (markDirtyAfter) {
        const kp = kpById(state.selectedId);
        if (kp) kp.content = els.editor.innerHTML;
        markDirty();
      }
    }
    return changed;
  }
  function toast(message) {
    els.toast.textContent = message;
    els.toast.classList.add('show');
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(() => els.toast.classList.remove('show'), 2200);
  }
  function setSaveStatus(text, kind) {
    if (state.readOnly) {
      text = '只读 · 已发布';
      kind = 'saved';
    }
    els.saveStatus.textContent = text;
    els.saveStatus.className = 'save-status' + (kind ? ` ${kind}` : '');
    if (els.statusSave) {
      els.statusSave.textContent = text;
      els.statusSave.className = kind || '';
    }
  }
  function lighten(hex, amount) {
    const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '');
    if (!match) return hex;
    const mix = (v) => Math.round(parseInt(v, 16) + (255 - parseInt(v, 16)) * amount);
    return `rgb(${mix(match[1])},${mix(match[2])},${mix(match[3])})`;
  }
  function hexToRgba(hex, alpha) {
    const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '');
    if (!match) return `rgba(212, 162, 78, ${alpha})`;
    return `rgba(${parseInt(match[1], 16)}, ${parseInt(match[2], 16)}, ${parseInt(match[3], 16)}, ${alpha})`;
  }
  function isTypingTarget(target) {
    if (!target) return false;
    return target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName);
  }

  /* ------------------------------ graph ------------------------------ */
  const CENTERS = [
    { x: -190, y: 80, z: 0 },
    { x: 190, y: 100, z: 50 },
    { x: -15, y: -160, z: -90 },
    { x: 125, y: -95, z: 145 }
  ];

  function buildGraphData() {
    const cats = topCategories();
    const centers = new Map(cats.map((category, index) => [category.id, CENTERS[index % CENTERS.length]]));
    const nodes = [];
    const categoryNodeIds = new Map();

    cats.forEach((category, index) => {
      const center = centers.get(category.id) || { x: 0, y: 0, z: 0 };
      const id = `cat:${category.id}`;
      categoryNodeIds.set(category.id, id);
      nodes.push({
        id,
        title: category.name,
        categoryId: category.id,
        color: category.color,
        degree: 0,
        isCategory: true,
        isAnchor: true,
        x: center.x,
        y: center.y,
        z: center.z
      });
    });

    const perCategoryIndex = new Map();
    state.kps.forEach((kp, index) => {
      const category = catById(kp.categoryId);
      const center = centers.get(kp.categoryId) || { x: 0, y: 0, z: 0 };
      const localIndex = perCategoryIndex.get(kp.categoryId) || 0;
      perCategoryIndex.set(kp.categoryId, localIndex + 1);
      const angle = localIndex * 2.399 + index * 0.11;
      const radius = 58 + (localIndex % 2) * 12;
      nodes.push({
        id: kp.id,
        title: kp.title || '未命名知识点',
        categoryId: kp.categoryId,
        color: category?.color || '#94a3b8',
        degree: 0,
        isCategory: false,
        isAnchor: false,
        x: center.x + Math.cos(angle) * radius,
        y: center.y + Math.sin(angle) * radius,
        z: center.z + Math.sin(angle * 1.7) * (radius * 0.8)
      });
    });

    const nodeMap = new Map(nodes.map((node) => [node.id, node]));
    const links = [];
    const seen = new Set();
    const pairSeen = new Set();

    cats.forEach((category) => {
      const hubId = categoryNodeIds.get(category.id);
      const hub = nodeMap.get(hubId);
      if (!hub) return;
      nodes
        .filter((node) => !node.isCategory && node.categoryId === category.id)
        .forEach((file) => {
          links.push({
            source: hubId,
            target: file.id,
            type: 'hub',
            color: hexToRgba(category.color, 0.52)
          });
        });
    });

    // 分类之间加一条主干连线，保证新建分类不会成为孤立节点
    for (let i = 1; i < cats.length; i += 1) {
      links.push({
        source: categoryNodeIds.get(cats[i - 1].id),
        target: categoryNodeIds.get(cats[i].id),
        type: 'backbone',
        color: 'rgba(240, 210, 150, 0.34)'
      });
    }

    state.relations.forEach((rel) => {
      if (!nodeMap.has(rel.from) || !nodeMap.has(rel.to) || rel.from === rel.to) return;
      if (nodeMap.get(rel.from)?.isCategory || nodeMap.get(rel.to)?.isCategory) return;
      const key = `manual:${[rel.from, rel.to].sort().join(':')}`;
      if (seen.has(key)) return;
      seen.add(key);
      pairSeen.add([rel.from, rel.to].sort().join('|'));
      links.push({
        source: rel.from,
        target: rel.to,
        type: 'manual',
        manual: true,
        color: DESIGN.manualLink,
        relation: rel.type
      });
    });

    // [[双向链接]] 直接映射成图上的连线
    const titleToId = new Map();
    state.kps.forEach((kp) => {
      const key = linkKey(kp.title);
      if (key && !titleToId.has(key)) titleToId.set(key, kp.id);
    });
    state.kps.forEach((kp) => {
      extractWikiLinks(kp.content).forEach((title) => {
        const targetId = titleToId.get(linkKey(title));
        if (!targetId || targetId === kp.id) return;
        const pair = [kp.id, targetId].sort().join('|');
        if (pairSeen.has(pair)) return;
        pairSeen.add(pair);
        links.push({
          source: kp.id,
          target: targetId,
          type: 'wiki',
          color: 'rgba(140, 200, 255, 0.68)'
        });
      });
    });

    links.forEach((link) => {
      const a = nodeMap.get(link.source);
      const b = nodeMap.get(link.target);
      if (a) a.degree += 1;
      if (b) b.degree += 1;
    });

    cats.forEach((category) => {
      const files = nodes.filter((node) => !node.isCategory && node.categoryId === category.id);
      if (!files.length) return;
      files
        .slice()
        .sort((a, b) => b.degree - a.degree)
        .slice(0, 1)
        .forEach((file) => { file.isAnchor = true; });
    });

    return { nodes, links };
  }

  function nodeColor(node) {
    if (node.isCategory) {
      return state.hoverId === node.id ? lighten(node.color, 0.45) : lighten(node.color, 0.16);
    }
    if (state.hoverId === node.id) return lighten(node.color, 0.35);
    if (state.search && state.matchIds.has(node.id)) return '#f0d49a';
    return node.color;
  }

  function linkColor(link) {
    if (state.hoverId) {
      const from = typeof link.source === 'object' ? link.source.id : link.source;
      const to = typeof link.target === 'object' ? link.target.id : link.target;
      if (from === state.hoverId || to === state.hoverId) return 'rgba(242, 217, 168, 0.95)';
    }
    return link.color || (link.manual ? DESIGN.manualLink : DESIGN.autoLink);
  }

  function supportsWebGL() {
    try {
      const canvas = document.createElement('canvas');
      return !!(canvas.getContext('webgl2')
        || canvas.getContext('webgl')
        || canvas.getContext('experimental-webgl'));
    } catch (err) {
      return false;
    }
  }

  function initGraph() {
    if (!window.ForceGraph3D) {
      initFallbackGraph('3D 图库未加载');
      return;
    }
    if (!supportsWebGL()) {
      initFallbackGraph('WebGL 不可用');
      return;
    }
    try {
      init3DGraph();
    } catch (err) {
      initFallbackGraph('3D 图初始化失败');
    }
  }

  function initFallbackGraph(reason) {
    if (!els.graphFallback || !els.graphWrap) return;
    state.graph = null;
    document.body.classList.add('graph-fallback-mode');
    if (els.graphFallbackTag) {
      els.graphFallbackTag.textContent = `2D 兼容视图 · ${reason}`;
    }
    if (els.labels) els.labels.innerHTML = '';
    state.labels.clear();
    state.graphFallback = { reason, data: buildGraphData() };
    computeFallbackLayout();
    if (!state.fallbackBound) {
      els.graphFallback.addEventListener('click', onFallbackClick);
      els.graphFallback.addEventListener('mousemove', onFallbackMove);
      els.graphFallback.addEventListener('mouseleave', () => {
        if (state.fallbackHover !== null) {
          state.fallbackHover = null;
          renderFallbackGraph();
        }
        els.graphFallback.style.cursor = 'default';
      });
      window.addEventListener('resize', resizeGraph);
      state.fallbackBound = true;
    }
    if (els.btnRotate) {
      els.btnRotate.classList.remove('active');
      els.btnRotate.disabled = true;
      els.btnRotate.title = '2D 兼容视图不支持自动旋转';
      els.btnRotate.setAttribute('aria-label', '2D 兼容视图不支持自动旋转');
    }
    renderFallbackGraph();
  }

  function computeFallbackLayout() {
    if (!state.graphFallback) return;
    const data = state.graphFallback.data;
    const cats = data.nodes.filter((node) => node.isCategory);
    let seed = 20261101;
    const random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    const nodes = data.nodes.map((node, index) => {
      const copy = { ...node, vx: 0, vy: 0 };
      if (node.isCategory) {
        const angle = -Math.PI / 2 + (Math.max(1, cats.length) ? (index / Math.max(1, cats.length)) * Math.PI * 2 : 0);
        copy.x = 0.5 + Math.cos(angle) * 0.27;
        copy.y = 0.5 + Math.sin(angle) * 0.27;
      } else {
        const catIndex = Math.max(0, cats.findIndex((cat) => cat.id === node.categoryId));
        const angle = -Math.PI / 2 + (cats.length ? (catIndex / cats.length) * Math.PI * 2 : 0);
        copy.x = 0.5 + Math.cos(angle) * 0.27 + (random() - 0.5) * 0.24;
        copy.y = 0.5 + Math.sin(angle) * 0.27 + (random() - 0.5) * 0.24;
      }
      copy.x = Math.min(0.85, Math.max(0.15, copy.x));
      copy.y = Math.min(0.85, Math.max(0.15, copy.y));
      return copy;
    });
    const byId = new Map(nodes.map((node) => [node.id, node]));
    const links = data.links
      .map((link) => ({
        ...link,
        source: typeof link.source === 'object' ? link.source.id : link.source,
        target: typeof link.target === 'object' ? link.target.id : link.target
      }))
      .filter((link) => byId.has(link.source) && byId.has(link.target));

    for (let iteration = 0; iteration < 220; iteration += 1) {
      nodes.forEach((node) => {
        node.vx *= 0.82;
        node.vy *= 0.82;
        node.vx += (0.5 - node.x) * 0.0018;
        node.vy += (0.5 - node.y) * 0.0018;
      });
      for (let i = 0; i < nodes.length; i += 1) {
        for (let j = i + 1; j < nodes.length; j += 1) {
          const a = nodes[i];
          const b = nodes[j];
          let dx = a.x - b.x;
          let dy = a.y - b.y;
          const dist2 = dx * dx + dy * dy + 0.0004;
          const strength = 0.000012 / dist2;
          const dist = Math.sqrt(dist2);
          dx /= dist;
          dy /= dist;
          a.vx += dx * strength;
          a.vy += dy * strength;
          b.vx -= dx * strength;
          b.vy -= dy * strength;
        }
      }
      links.forEach((link) => {
        const a = byId.get(link.source);
        const b = byId.get(link.target);
        if (!a || !b) return;
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.0001;
        const force = (dist - (link.manual ? 0.2 : 0.15)) * 0.035;
        dx /= dist;
        dy /= dist;
        a.vx += dx * force;
        a.vy += dy * force;
        b.vx -= dx * force;
        b.vy -= dy * force;
      });
      nodes.forEach((node) => {
        node.x = Math.min(0.98, Math.max(0.02, node.x + node.vx));
        node.y = Math.min(0.98, Math.max(0.02, node.y + node.vy));
      });
    }

    const xs = nodes.map((node) => node.x);
    const ys = nodes.map((node) => node.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    nodes.forEach((node) => {
      node.x = 0.1 + ((node.x - minX) / Math.max(0.0001, maxX - minX)) * 0.8;
      node.y = 0.1 + ((node.y - minY) / Math.max(0.0001, maxY - minY)) * 0.8;
    });
    state.graphFallback.nodes = nodes;
    state.graphFallback.links = links;
  }

  function renderFallbackGraph() {
    if (!state.graphFallback || !els.graphFallback || !els.graphWrap) return;
    const rect = els.graphWrap.getBoundingClientRect();
    if (rect.width < 60 || rect.height < 60) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.6);
    const canvas = els.graphFallback;
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);

    const nodes = state.graphFallback.nodes || [];
    const links = state.graphFallback.links || [];
    if (!nodes.length) return;
    const padX = Math.max(26, rect.width * 0.06);
    const padY = Math.max(24, rect.height * 0.08);
    const plotW = rect.width - padX * 2;
    const plotH = rect.height - padY * 2;
    const byId = new Map();
    const showAllLabels = rect.width >= 560;
    const categoryRadius = Math.max(13, Math.min(19, rect.width / 48));
    const screen = nodes.map((node) => {
      const radius = node.isCategory ? categoryRadius
        : node.isAnchor ? 7.5 : Math.max(4.6, Math.min(6.2, rect.width / 120));
      const item = {
        node,
        x: padX + node.x * plotW,
        y: padY + node.y * plotH,
        r: radius
      };
      byId.set(node.id, item);
      return item;
    });

    ctx.lineCap = 'round';
    links.forEach((link) => {
      const a = byId.get(link.source);
      const b = byId.get(link.target);
      if (!a || !b) return;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = link.color || (link.manual ? DESIGN.manualLink : DESIGN.autoLink);
      ctx.lineWidth = link.manual ? 1.5 : link.type === 'backbone' ? 1.1 : 1;
      ctx.stroke();
    });

    screen.forEach(({ node, x, y, r }) => {
      const isHover = state.fallbackHover === node.id;
      const isMatch = !!state.search && state.matchIds.has(node.id);
      ctx.beginPath();
      ctx.arc(x, y, r + (isHover || isMatch ? 2 : 0), 0, Math.PI * 2);
      ctx.fillStyle = node.color;
      ctx.fill();
      ctx.lineWidth = node.isCategory ? 2 : 1.2;
      ctx.strokeStyle = isHover || isMatch ? '#6d28d9' : '#ffffff';
      ctx.stroke();
      if (node.isCategory) {
        ctx.fillStyle = '#211f26';
        ctx.font = `600 ${Math.max(8, Math.min(10, r * 0.62))}px "Inter", "Microsoft YaHei", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(node.title, x, y, r * 1.8);
      } else if (showAllLabels || isHover) {
        ctx.fillStyle = '#4a4a50';
        ctx.font = `${isHover ? 600 : 500} ${isHover ? 9 : 7.5}px "Inter", "Microsoft YaHei", sans-serif`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(node.title, x + r + 3, y);
      }
    });
    state.fallbackLayout = screen;
  }

  function fallbackNodeAt(event) {
    const rect = els.graphFallback.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    let best = null;
    state.fallbackLayout.forEach((item) => {
      const dist = Math.hypot(item.x - x, item.y - y);
      if (dist <= item.r + 8 && (!best || dist < best.dist)) best = { item, dist };
    });
    return best ? best.item : null;
  }

  function onFallbackMove(event) {
    const hit = fallbackNodeAt(event);
    const hoverId = hit ? hit.node.id : null;
    els.graphFallback.style.cursor = hit ? 'pointer' : 'default';
    if (hoverId !== state.fallbackHover) {
      state.fallbackHover = hoverId;
      renderFallbackGraph();
    }
  }

  function onFallbackClick(event) {
    const hit = fallbackNodeAt(event);
    if (!hit) return;
    if (hit.node.isCategory) selectCategory(hit.node.categoryId);
    else selectKp(hit.node.id);
  }

  function init3DGraph() {
    if (!window.ForceGraph3D) {
      initFallbackGraph('3D 图库未加载');
      return;
    }
    const graph = window.ForceGraph3D()(els.graph);
    state.graph = graph;

    graph
      .backgroundColor(DESIGN.graphBg)
      .showNavInfo(false)
      .enableNodeDrag(false)
      .nodeRelSize(5.4)
      .nodeVal((node) => {
        if (node.isCategory) return 34 + Math.min(20, (node.degree || 0) * 1.5);
        if (node.isAnchor) return 9 + Math.min(7, (node.degree || 0) * 0.8);
        return 4.2 + Math.min(5, (node.degree || 0) * 0.55);
      })
      .nodeColor((node) => nodeColor(node))
      .nodeOpacity(0.001)
      .nodeResolution(8)
      .nodeLabel((node) => node.title)
      .linkColor((link) => linkColor(link))
      .linkWidth((link) => {
        if (link.manual) return 1.9;
        if (link.type === 'backbone') return 1.15;
        return 1.35;
      })
      .linkOpacity(0.95)
      .linkCurvature(0)
      .linkDirectionalParticles(0)
      .d3AlphaDecay(0.04)
      .d3VelocityDecay(0.3)
      .warmupTicks(25)
      .cooldownTicks(120)
      .cooldownTime(3500)
      .onNodeHover((node) => {
        // 悬停只改变鼠标指针，不改变节点/连线样式，也不暂停旋转
        if (els.graphWrap) els.graphWrap.style.cursor = node ? 'pointer' : '';
      })
      .onNodeClick((node) => {
        if (!node) return;
        if (node.isCategory) selectCategory(node.categoryId);
        else selectKp(node.id);
      })
      .onEngineStop(() => {
        if (!state.initialFit) {
          state.initialFit = true;
          fitGraph(52);
        }
      });

    try {
      const controls = graph.controls();
      if (controls) {
        // 3d-force-graph 的 autoRotate 在引擎冷却后不会继续刷新；改成手动旋转
        controls.autoRotate = false;
        controls.autoRotateSpeed = 0;
        controls.enableDamping = true;
        controls.dampingFactor = 0.08;
      }
    } catch (err) { /* ignore */ }

    try {
      const renderer = graph.renderer();
      if (renderer && renderer.setPixelRatio) {
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      }
    } catch (err) { /* ignore */ }

    try {
      const charge = graph.d3Force('charge');
      if (charge && charge.strength) charge.strength(-260);
      const link = graph.d3Force('link');
      if (link && link.distance) link.distance((l) => (l.manual ? 140 : 110));
    } catch (err) { /* ignore */ }

    graph.graphData(buildGraphData());
    try {
      graph.cameraPosition({ x: 0, y: -30, z: 820 }, { x: 0, y: -30, z: 0 }, 0);
    } catch (err) { /* ignore */ }

    createLabels();
    refreshGraphStyle();
    requestAnimationFrame(frameLoop);
    window.addEventListener('resize', resizeGraph);
    resizeGraph();
    setTimeout(() => { if (!state.selectedId && !state.userInteracted) fitGraph(52); }, 1000);
    setTimeout(() => { if (!state.selectedId && !state.userInteracted) fitGraph(52); }, 2400);
  }

  function resizeGraph() {
    if (!els.graphWrap) return;
    if (!state.graph) {
      if (state.graphFallback) renderFallbackGraph();
      return;
    }
    try {
      state.graph.width(els.graphWrap.clientWidth).height(els.graphWrap.clientHeight);
    } catch (err) { /* ignore */ }
  }

  function fitGraph(padding) {
    if (state.noteMode) return;
    if (!state.graph) {
      if (state.graphFallback) renderFallbackGraph();
      return;
    }
    try { state.graph.zoomToFit(900, padding == null ? 36 : padding); } catch (err) { /* ignore */ }
  }

  function setAutoRotate(enabled) {
    state.autoRotate = !!enabled;
    state.rotationResumeAt = 0;
    if (els.btnRotate) {
      els.btnRotate.classList.toggle('active', state.autoRotate);
      els.btnRotate.title = state.autoRotate ? '暂停自动旋转' : '继续自动旋转';
      els.btnRotate.setAttribute('aria-label', state.autoRotate ? '暂停自动旋转' : '继续自动旋转');
    }
  }

  function pauseGraph() {
    try { if (state.graph && state.graph.pauseAnimation) state.graph.pauseAnimation(); } catch (err) { /* ignore */ }
  }

  function resumeGraph() {
    try { if (state.graph && state.graph.resumeAnimation) state.graph.resumeAnimation(); } catch (err) { /* ignore */ }
    setTimeout(resizeGraph, 50);
  }

  function refreshGraphStyle() {
    if (!state.graph) {
      if (state.graphFallback) renderFallbackGraph();
      return;
    }
    state.graph
      .nodeColor((node) => nodeColor(node))
      .linkColor((link) => linkColor(link))
      .nodeVisibility(() => true)
      .linkVisibility(() => true);
  }

  function createLabels() {
    els.labels.innerHTML = '';
    state.labels.clear();
    if (!state.graph) return;
    state.graph.graphData().nodes.forEach((node) => {
      const badge = document.createElement('button');
      badge.type = 'button';
      badge.className = 'node-badge'
        + (node.isCategory ? ' is-category' : '')
        + (node.isAnchor && !node.isCategory ? ' is-anchor' : '');
      badge.style.setProperty('--node-color', node.color);
      badge.title = node.title;
      badge.setAttribute('aria-label', node.title);
      const text = document.createElement('span');
      text.className = 'node-badge-text';
      text.textContent = node.title;
      badge.appendChild(text);
      badge.addEventListener('click', (event) => {
        event.stopPropagation();
        if (node.isCategory) selectCategory(node.categoryId);
        else selectKp(node.id);
      });
      els.labels.appendChild(badge);
      state.labels.set(node.id, badge);
    });
  }

  function updateLabels() {
    if (!state.graph || state.noteMode) return;
    const nodes = state.graph.graphData().nodes;
    const width = els.graphWrap.clientWidth;
    const height = els.graphWrap.clientHeight;
    nodes.forEach((node) => {
      const badge = state.labels.get(node.id);
      if (!badge) return;
      if (!Number.isFinite(node.x) || !Number.isFinite(node.y) || !Number.isFinite(node.z)) {
        badge.style.display = 'none';
        return;
      }
      const pos = state.graph.graph2ScreenCoords(node.x, node.y, node.z);
      if (!pos || !Number.isFinite(pos.x) || !Number.isFinite(pos.y)) {
        badge.style.display = 'none';
        return;
      }
      if (pos.x < -70 || pos.x > width + 70 || pos.y < -70 || pos.y > height + 70) {
        badge.style.display = 'none';
        return;
      }
      badge.style.display = 'flex';
      badge.style.transform = `translate(-50%, -50%) translate3d(${pos.x}px, ${pos.y}px, 0)`;
      badge.classList.toggle('is-match', !!state.search && state.matchIds.has(node.id));
      badge.classList.toggle('is-hover', state.hoverId === node.id);
    });
  }

  function rotateCamera(dt) {
    const graph = state.graph;
    if (!graph) return;
    try {
      const camera = graph.camera();
      const controls = graph.controls();
      if (!camera || !controls) return;
      const target = controls.target || { x: 0, y: 0, z: 0 };
      const dx = camera.position.x - target.x;
      const dz = camera.position.z - target.z;
      if (!Number.isFinite(dx) || !Number.isFinite(dz)) return;
      const angle = Math.min(0.04, dt * 0.00022); // 约 0.22 rad/s
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const nx = dx * cos - dz * sin;
      const nz = dx * sin + dz * cos;
      graph.cameraPosition(
        { x: target.x + nx, y: camera.position.y, z: target.z + nz },
        { x: target.x, y: target.y, z: target.z },
        0
      );
    } catch (err) { /* ignore */ }
  }

  function frameLoop(timestamp) {
    if (state.graph && !state.noteMode) {
      const dt = state.lastFrame ? Math.min(50, timestamp - state.lastFrame) : 16;
      if (state.autoRotate
        && !state.interacting
        && performance.now() >= state.rotationResumeAt
        && document.visibilityState !== 'hidden') {
        rotateCamera(dt);
      }
      try { updateLabels(); } catch (err) { /* ignore */ }
    }
    state.lastFrame = timestamp;
    requestAnimationFrame(frameLoop);
  }

  function rebuildGraph() {
    if (!state.graph) {
      if (state.graphFallback) {
        state.graphFallback.data = buildGraphData();
        state.fallbackHover = null;
        computeFallbackLayout();
        renderFallbackGraph();
      }
      return;
    }
    const previous = new Map(state.graph.graphData().nodes.map((node) => [node.id, { x: node.x, y: node.y, z: node.z }]));
    const data = buildGraphData();
    data.nodes.forEach((node) => {
      const old = previous.get(node.id);
      if (old && Number.isFinite(old.x) && Number.isFinite(old.y) && Number.isFinite(old.z)) {
        node.x = old.x;
        node.y = old.y;
        node.z = old.z;
      }
    });
    state.graph.graphData(data);
    createLabels();
    refreshGraphStyle();
  }

  function updateGraphNode(kp) {
    if (!state.graph) {
      if (state.graphFallback) {
        const fallbackNode = (state.graphFallback.data.nodes || []).find((node) => node.id === kp.id);
        if (fallbackNode) {
          fallbackNode.title = kp.title || '未命名知识点';
          fallbackNode.color = colorOf(kp);
        }
        renderFallbackGraph();
      }
      return;
    }
    const node = state.graph.graphData().nodes.find((n) => n.id === kp.id);
    if (!node) return;
    node.title = kp.title || '未命名知识点';
    node.categoryId = kp.categoryId;
    node.color = colorOf(kp);
    const badge = state.labels.get(kp.id);
    if (badge) {
      const text = badge.querySelector('.node-badge-text');
      if (text) text.textContent = node.title;
      badge.title = node.title;
      badge.style.setProperty('--node-color', node.color);
    }
    refreshGraphStyle();
  }

  /* ------------------------------ search ------------------------------ */
  function recomputeMatches() {
    const query = state.search.trim().toLowerCase();
    state.matchIds = new Set();
    if (!query) return;
    state.kps.forEach((kp) => {
      const haystack = [
        kp.title,
        kp.summary,
        (kp.tags || []).join(' '),
        categoryName(kp.categoryId),
        stripHtml(kp.content)
      ].join(' ').toLowerCase();
      if (haystack.includes(query)) state.matchIds.add(kp.id);
    });
  }

  function renderSearchResults() {
    if (!state.search) return;
    els.searchResultList.innerHTML = '';
    const matches = state.kps.filter((kp) => state.matchIds.has(kp.id));
    if (!matches.length) {
      const empty = document.createElement('div');
      empty.className = 'result-empty';
      empty.textContent = '没有找到匹配的知识点。';
      els.searchResultList.appendChild(empty);
      return;
    }
    matches.slice(0, 20).forEach((kp) => {
      const btn = document.createElement('button');
      btn.className = 'result-item';
      const title = document.createElement('span');
      title.className = 'result-title';
      title.textContent = kp.title;
      const snippet = document.createElement('span');
      snippet.className = 'result-snippet';
      snippet.textContent = kp.summary || stripHtml(kp.content).slice(0, 80) || categoryName(kp.categoryId);
      btn.append(title, snippet);
      btn.addEventListener('click', () => selectKp(kp.id));
      els.searchResultList.appendChild(btn);
    });
  }

  function handleSearchInput() {
    state.search = els.search.value.trim();
    recomputeMatches();
    const hasSearch = !!state.search;
    els.searchResults.classList.toggle('hidden', !hasSearch);
    els.treeSection.classList.toggle('hidden', hasSearch);
    if (hasSearch) renderSearchResults();
    refreshGraphStyle();
  }

  function clearSearch() {
    state.search = '';
    state.matchIds = new Set();
    els.search.value = '';
    els.searchResults.classList.add('hidden');
    els.treeSection.classList.remove('hidden');
    refreshGraphStyle();
  }

  /* ------------------------------ tree ------------------------------ */
  function startCategoryRename(category, nameEl) {
    if (state.readOnly) return;
    const input = document.createElement('input');
    input.className = 'tree-rename';
    input.value = category.name;
    input.setAttribute('aria-label', '重命名分类');
    nameEl.replaceWith(input);
    input.focus();
    input.select();
    let committed = false;
    const commit = () => {
      if (committed) return;
      committed = true;
      const value = input.value.trim();
      if (value) {
        category.name = value;
        try { persist(); } catch (err) { /* ignore */ }
      }
      renderTree();
      if (state.noteMode && state.selectedId) updateNoteMeta(kpById(state.selectedId));
    };
    input.addEventListener('click', (event) => event.stopPropagation());
    input.addEventListener('dblclick', (event) => event.stopPropagation());
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') { event.preventDefault(); commit(); }
      else if (event.key === 'Escape') { event.preventDefault(); renderTree(); }
    });
    input.addEventListener('blur', commit);
  }

  function deleteCategory(categoryId) {
    if (state.readOnly) return;
    const category = catById(categoryId);
    if (!category) return;
    const files = state.kps.filter((kp) => kp.categoryId === categoryId);
    const message = files.length
      ? `删除分类「${category.name}」及其中 ${files.length} 个知识点？此操作不可撤销。`
      : `删除空分类「${category.name}」？`;
    if (!window.confirm(message)) return;

    const removedIds = new Set(files.map((kp) => kp.id));
    clearTimeout(state.saveTimer);
    state.saveTimer = null;

    if (state.selectedId && removedIds.has(state.selectedId)) {
      state.selectedId = null;
      state.noteMode = false;
      document.body.classList.remove('note-mode');
      closeHistory();
      if (location.hash && location.hash !== '#/') location.hash = '#/';
    }

    state.categories = state.categories.filter((item) => item.id !== categoryId);
    state.kps = state.kps.filter((kp) => kp.categoryId !== categoryId);
    state.relations = state.relations.filter((rel) => {
      if (removedIds.has(rel.from) || removedIds.has(rel.to)) return false;
      return true;
    });
    files.forEach((kp) => { delete state.history[kp.id]; });
    if (state.selectedCategoryId === categoryId) state.selectedCategoryId = null;
    state.expanded.delete(categoryId);
    state.tabs = state.tabs.filter((tab) => !removedIds.has(tab.id));
    if (!state.tabs.length) state.tabs = [{ id: 'graph', type: 'graph', title: '知识网络' }];
    if (removedIds.has(state.activeTabId)) state.activeTabId = 'graph';
    renderTabs();
    try {
      persist();
      persistHistory();
    } catch (err) { /* ignore */ }
    rebuildGraph();
    renderAll();
    updateHistoryCount();
    updateStatusBar();
    if (!state.noteMode) {
      resumeGraph();
      setTimeout(() => fitGraph(52), 120);
    }
    toast(`已删除分类「${category.name}」`);
  }

  function renderTree() {
    els.tree.innerHTML = '';
    const all = document.createElement('button');
    all.className = 'tree-all' + (state.selectedCategoryId ? '' : ' is-active');
    const allLabel = document.createElement('span');
    allLabel.textContent = '全部知识点';
    const allCount = document.createElement('span');
    allCount.className = 'count';
    allCount.textContent = String(state.kps.length);
    all.append(allLabel, allCount);
    all.addEventListener('click', () => {
      state.selectedCategoryId = null;
      renderTree();
    });
    els.tree.appendChild(all);

    topCategories().forEach((category) => {
      const files = kpsOfCategory(category.id);
      const expanded = state.expanded.has(category.id);
      const row = document.createElement('div');
      row.className = 'tree-top'
        + (state.selectedCategoryId === category.id ? ' is-active' : '')
        + (expanded ? ' is-expanded' : '');
      row.tabIndex = 0;
      row.setAttribute('role', 'button');
      row.title = '点击展开/收起；双击重命名';

      const chevron = document.createElement('span');
      chevron.className = 'chevron';
      chevron.textContent = '▶';
      const dot = document.createElement('span');
      dot.className = 'dot';
      dot.style.background = category.color;
      dot.style.boxShadow = `0 0 7px ${category.color}`;
      const name = document.createElement('span');
      name.className = 'tree-name';
      name.textContent = category.name;
      const count = document.createElement('span');
      count.className = 'count';
      count.textContent = String(files.length);
      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'tree-del';
      del.title = '删除这个分类';
      del.setAttribute('aria-label', `删除分类 ${category.name}`);
      del.textContent = '×';
      del.addEventListener('click', (event) => {
        event.stopPropagation();
        deleteCategory(category.id);
      });
      del.addEventListener('dblclick', (event) => event.stopPropagation());
      row.append(chevron, dot, name, count);
      if (!state.readOnly) row.append(del);

      row.addEventListener('click', () => {
        state.selectedCategoryId = category.id;
        if (state.expanded.has(category.id)) state.expanded.delete(category.id);
        else state.expanded.add(category.id);
        renderTree();
      });
      row.addEventListener('keydown', (event) => {
        if (event.target !== row) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          row.click();
        }
      });
      if (!state.readOnly) {
        row.addEventListener('dblclick', (event) => {
          event.stopPropagation();
          startCategoryRename(category, name);
        });
      }
      els.tree.appendChild(row);

      if (!expanded) return;
      const children = document.createElement('div');
      children.className = 'tree-children';
      if (!files.length) {
        const empty = document.createElement('div');
        empty.className = 'tree-empty';
        empty.textContent = state.readOnly ? '空分类' : '空分类 · 点上方「新建」添加文件';
        children.appendChild(empty);
      }
      files
        .slice()
        .sort((a, b) => (a.title || '').localeCompare(b.title || '', 'zh-CN'))
        .forEach((kp) => {
          const file = document.createElement('button');
          file.className = 'tree-kp' + (state.selectedId === kp.id ? ' is-current' : '');
          const fileIcon = document.createElement('span');
          fileIcon.className = 'file-dot';
          fileIcon.style.background = category.color;
          const label = document.createElement('span');
          label.textContent = kp.title || '未命名知识点';
          file.append(fileIcon, label);
          file.addEventListener('click', () => selectKp(kp.id));
          children.appendChild(file);
        });
      els.tree.appendChild(children);
    });
  }

  /* ------------------------------ dashboard ------------------------------ */
  function renderRecent() {
    const list = state.kps
      .slice()
      .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))
      .slice(0, 6);
    if (els.recentCount) els.recentCount.textContent = `${state.kps.length} 个`;
    els.recent.innerHTML = '';
    if (!list.length) {
      const empty = document.createElement('div');
      empty.className = 'result-empty';
      empty.textContent = '还没有知识点，点左下「新建」开始。';
      els.recent.appendChild(empty);
      return;
    }
    list.forEach((kp) => {
      const btn = document.createElement('button');
      btn.className = 'recent-item';
      const title = document.createElement('span');
      title.className = 'recent-title';
      title.textContent = kp.title || '未命名知识点';
      const meta = document.createElement('span');
      meta.className = 'recent-meta';
      const dot = document.createElement('span');
      dot.className = 'recent-dot';
      dot.style.background = colorOf(kp);
      const category = document.createElement('span');
      category.textContent = categoryName(kp.categoryId);
      const time = document.createElement('span');
      time.textContent = timeAgo(kp.updatedAt);
      meta.append(dot, category, time);
      btn.append(title, meta);
      btn.addEventListener('click', () => selectKp(kp.id));
      els.recent.appendChild(btn);
    });
  }

  function renderOverview() {
    const items = [
      { value: state.kps.length, label: '知识点' },
      { value: state.categories.length, label: '分类' },
      { value: countLinks(), label: '连接' },
      { value: uniqueTags().size, label: '标签' }
    ];
    els.overviewGrid.innerHTML = '';
    items.forEach((item) => {
      const box = document.createElement('div');
      box.className = 'overview-item';
      const value = document.createElement('div');
      value.className = 'overview-value';
      value.textContent = String(item.value);
      const label = document.createElement('div');
      label.className = 'overview-label';
      label.textContent = item.label;
      box.append(value, label);
      els.overviewGrid.appendChild(box);
    });
  }

  function renderStats() {
    els.stats.textContent = `${state.kps.length} 个知识点 · ${state.categories.length} 个分类 · ${countLinks()} 条连接`;
  }

  function renderDashboard() {
    renderRecent();
    renderOverview();
    renderStats();
  }

  function renderAll() {
    renderTree();
    renderDashboard();
    refreshGraphStyle();
  }

  /* ------------------------------ note page ------------------------------ */
  function noteIdFromHash() {
    const match = location.hash.match(/^#\/note\/(.+)$/);
    if (!match) return null;
    try { return decodeURIComponent(match[1]); } catch (err) { return match[1]; }
  }

  function buildCategorySelect(selectedId) {
    els.categorySelect.innerHTML = '';
    topCategories().forEach((category) => {
      const option = document.createElement('option');
      option.value = category.id;
      option.textContent = category.name;
      if (category.id === selectedId) option.selected = true;
      els.categorySelect.appendChild(option);
    });
  }

  function updateNoteMeta(kp) {
    const category = catById(kp.categoryId);
    els.panelChip.textContent = category ? category.name : '未分类';
    if (category) {
      els.panelChip.style.color = category.color;
      els.panelChip.style.borderColor = category.color;
      els.panelChip.style.background = 'transparent';
    }
    els.panelUpdated.textContent = `更新于 ${timeAgo(kp.updatedAt)}`;
  }

  function renderInspector() {
    const kp = kpById(state.selectedId);
    if (!state.noteMode || !kp || !els.noteOutline) {
      if (els.noteOutline) els.noteOutline.innerHTML = '';
      if (els.noteBacklinks) els.noteBacklinks.innerHTML = '';
      if (els.noteOutlinks) els.noteOutlinks.innerHTML = '';
      return;
    }

    const headings = Array.from(els.editor.querySelectorAll('h1, h2, h3'));
    els.noteOutline.innerHTML = '';
    els.outlineCount.textContent = String(headings.length);
    if (!headings.length) {
      const empty = document.createElement('div');
      empty.className = 'inspector-empty';
      empty.textContent = '正文里加 H2 / H3 标题后，这里会生成大纲。';
      els.noteOutline.appendChild(empty);
    } else {
      headings.forEach((heading) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'inspector-item inspector-heading';
        button.dataset.level = heading.tagName === 'H2' ? '2' : heading.tagName === 'H3' ? '3' : '1';
        const arrow = document.createElement('span');
        arrow.className = 'inspector-arrow';
        arrow.textContent = '#';
        const label = document.createElement('span');
        label.textContent = heading.textContent.trim() || '（无标题）';
        label.style.overflow = 'hidden';
        label.style.textOverflow = 'ellipsis';
        label.style.whiteSpace = 'nowrap';
        button.append(arrow, label);
        button.addEventListener('click', () => {
          const top = heading.getBoundingClientRect().top
            - els.editor.getBoundingClientRect().top
            + els.editor.scrollTop
            - 12;
          els.editor.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
        });
        els.noteOutline.appendChild(button);
      });
    }

    const currentKey = linkKey(kp.title);
    const backlinks = state.kps.filter((other) => {
      if (other.id === kp.id) return false;
      return extractWikiLinks(other.content).some((title) => linkKey(title) === currentKey);
    });
    els.noteBacklinks.innerHTML = '';
    els.backlinkCount.textContent = String(backlinks.length);
    if (!backlinks.length) {
      const empty = document.createElement('div');
      empty.className = 'inspector-empty';
      empty.textContent = '还没有其他笔记链接到这里。用 [[标题]] 或在工具栏插入双链。';
      els.noteBacklinks.appendChild(empty);
    } else {
      backlinks.forEach((source) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'inspector-item';
        const dot = document.createElement('span');
        dot.className = 'inspector-dot';
        const label = document.createElement('span');
        label.textContent = source.title || '未命名知识点';
        label.style.overflow = 'hidden';
        label.style.textOverflow = 'ellipsis';
        label.style.whiteSpace = 'nowrap';
        button.append(dot, label);
        button.title = categoryName(source.categoryId);
        button.addEventListener('click', () => selectKp(source.id));
        els.noteBacklinks.appendChild(button);
      });
    }

    const outgoing = extractWikiLinks(els.editor.innerHTML);
    els.noteOutlinks.innerHTML = '';
    els.outlinkCount.textContent = String(outgoing.length);
    if (!outgoing.length) {
      const empty = document.createElement('div');
      empty.className = 'inspector-empty';
      empty.textContent = '当前笔记还没有双链。';
      els.noteOutlinks.appendChild(empty);
    } else {
      outgoing.forEach((title) => {
        const target = findKpByTitle(title);
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'inspector-item is-link' + (target ? '' : ' is-missing');
        const dot = document.createElement('span');
        dot.className = 'inspector-dot';
        const label = document.createElement('span');
        label.textContent = title;
        label.style.overflow = 'hidden';
        label.style.textOverflow = 'ellipsis';
        label.style.whiteSpace = 'nowrap';
        button.append(dot, label);
        button.title = target ? '打开这条笔记' : '点击创建这条笔记';
        button.addEventListener('click', () => openWikiTarget(title, kp));
        els.noteOutlinks.appendChild(button);
      });
    }
    updateStatusBar();
  }

  function openWikiTarget(title, sourceKp) {
    const targetTitle = normalizeLinkTitle(title);
    if (!targetTitle) return;
    const existing = findKpByTitle(targetTitle);
    if (existing) {
      selectKp(existing.id);
      return;
    }
    if (state.readOnly) {
      toast(`目标笔记「${targetTitle}」不存在`);
      return;
    }
    const source = sourceKp || kpById(state.selectedId);
    let categoryId = source?.categoryId || state.selectedCategoryId || state.categories[0]?.id;
    if (!catById(categoryId)) {
      const category = {
        id: uid('cat'),
        name: '新分类',
        parentId: null,
        color: DESIGN.palette[state.categories.length % DESIGN.palette.length],
        order: Math.max(0, ...state.categories.map((item) => item.order || 0)) + 1
      };
      state.categories.push(category);
      categoryId = category.id;
    }
    const kp = {
      id: uid('kp'),
      title: targetTitle,
      categoryId,
      tags: [],
      summary: '',
      updatedAt: nowIso(),
      content: '<p><br></p>'
    };
    state.kps.push(kp);
    state.expanded.add(categoryId);
    state.selectedCategoryId = categoryId;
    state.needsFit = true;
    try { persist(); } catch (err) { /* ignore */ }
    rebuildGraph();
    renderAll();
    selectKp(kp.id, true);
    toast(`已创建「${targetTitle}」`);
  }

  function insertWikiLink() {
    if (!state.noteMode) {
      toast('先打开一条笔记，再插入双链');
      return;
    }
    const selection = window.getSelection();
    const selectedText = selection ? normalizeLinkTitle(selection.toString()) : '';
    const title = selectedText || normalizeLinkTitle(window.prompt('要链接到哪个知识点？'));
    if (!title) return;
    const target = findKpByTitle(title);
    const html = `<a class="wiki-link${target ? '' : ' is-missing'}" href="#" data-wiki="${escapeHtml(title)}">${escapeHtml(title)}</a>`;
    els.editor.focus();
    document.execCommand('insertHTML', false, html);
    els.editor.dispatchEvent(new Event('input', { bubbles: true }));
    refreshWikiLinkStates();
    toast(target ? `已插入双链「${title}」` : `已插入「${title}」，点击可创建`);
  }

  function formatHistoryTime(ts) {
    const date = new Date(ts);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString('zh-CN', {
      month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  }

  function renderHistory() {
    const list = Array.isArray(state.history[state.selectedId]) ? state.history[state.selectedId] : [];
    els.historyList.innerHTML = '';
    if (!list.length) {
      const empty = document.createElement('div');
      empty.className = 'history-empty';
      empty.innerHTML = '<strong>还没有版本记录</strong><span>开始编辑后，停止输入约 0.7 秒会自动保存并生成第一个版本。</span>';
      els.historyList.appendChild(empty);
      return;
    }
    list
      .slice()
      .reverse()
      .forEach((entry, index) => {
        const item = document.createElement('div');
        item.className = 'history-item' + (index === 0 ? ' is-latest' : '');

        const main = document.createElement('div');
        main.className = 'history-main';
        const top = document.createElement('div');
        top.className = 'history-top';
        const title = document.createElement('span');
        title.className = 'history-title';
        title.textContent = entry.title || '未命名知识点';
        const time = document.createElement('span');
        time.className = 'history-time';
        time.textContent = formatHistoryTime(entry.ts);
        top.append(title, time);
        const meta = document.createElement('div');
        meta.className = 'history-meta';
        const category = document.createElement('span');
        category.textContent = categoryName(entry.categoryId);
        const preview = document.createElement('span');
        preview.className = 'history-preview';
        preview.textContent = stripHtml(entry.content).slice(0, 120) || '（空白内容）';
        meta.append(category, preview);
        main.append(top, meta);

        const actions = document.createElement('div');
        actions.className = 'history-actions';
        if (index === 0) {
          const badge = document.createElement('span');
          badge.className = 'history-badge';
          badge.textContent = '最新';
          actions.appendChild(badge);
        } else if (entry.baseline) {
          const badge = document.createElement('span');
          badge.className = 'history-badge history-badge-muted';
          badge.textContent = '初始';
          actions.appendChild(badge);
        }
        const restore = document.createElement('button');
        restore.className = 'btn tiny';
        restore.textContent = '恢复';
        restore.addEventListener('click', () => restoreVersion(entry));
        actions.appendChild(restore);

        item.append(main, actions);
        els.historyList.appendChild(item);
      });
  }

  function openHistory() {
    if (!state.selectedId) return;
    flushSave();
    renderHistory();
    els.historyModal.classList.remove('hidden');
    updateHistoryCount();
  }

  function closeHistory() {
    if (els.historyModal) els.historyModal.classList.add('hidden');
  }

  function restoreVersion(entry) {
    const kp = kpById(state.selectedId);
    if (!kp || !entry) return;
    resetSourceMode();
    snapshotVersion(kp, { force: true });
    kp.title = entry.title || '未命名知识点';
    kp.content = entry.content || '';
    kp.tags = clone(entry.tags || []);
    if (catById(entry.categoryId)) kp.categoryId = entry.categoryId;
    kp.summary = entry.summary || stripHtml(kp.content).slice(0, 80);
    kp.updatedAt = nowIso();
    state.expanded.add(kp.categoryId);
    els.title.value = kp.title;
    els.tags.value = (kp.tags || []).join(', ');
    buildCategorySelect(kp.categoryId);
    els.editor.innerHTML = kp.content && kp.content.trim() ? kp.content : '<p><br></p>';
    els.editor.scrollTop = 0;
    normalizeWikiLinksInEditor(false);
    kp.content = els.editor.innerHTML;
    state.linkSignatures.set(kp.id, wikiSignature(kp));
    try { persist(); } catch (err) { /* ignore */ }
    updateNoteMeta(kp);
    rebuildGraph();
    renderTree();
    renderDashboard();
    renderInspector();
    setSaveStatus('已恢复 · ' + clock(kp.updatedAt), 'saved');
    snapshotVersion(kp, { force: true });
    updateHistoryCount();
    closeHistory();
    toast('已恢复到这个版本');
  }

  function renderSourcePreview() {
    if (!els.markdownPreview) return;
    const html = window.KnowledgeMarkdown
      ? window.KnowledgeMarkdown.markdownToHtml(els.markdownSource.value)
      : '';
    els.markdownPreview.innerHTML = html || '<p></p>';
  }

  function syncSourceToEditor() {
    if (!state.sourceMode || !state.selectedId || !window.KnowledgeMarkdown) return;
    state.sourceMarkdown = els.markdownSource.value;
    const html = window.KnowledgeMarkdown.markdownToHtml(state.sourceMarkdown);
    els.editor.innerHTML = html || '<p><br></p>';
    renderSourcePreview();
    markDirty();
  }

  function resetSourceMode() {
    state.sourceMode = false;
    state.sourceMarkdown = '';
    document.body.classList.remove('source-mode');
    if (els.panelSource) {
      els.panelSource.classList.remove('is-active');
      els.panelSource.title = 'Markdown 源码 (Ctrl+Shift+M)';
    }
    if (els.markdownSourceWrap) els.markdownSourceWrap.setAttribute('aria-hidden', 'true');
    if (els.markdownSource) els.markdownSource.value = '';
    if (els.markdownPreview) els.markdownPreview.innerHTML = '';
  }

  function setSourceMode(enabled) {
    if (state.readOnly) {
      if (enabled) toast('只读模式不能编辑 Markdown 源码');
      return;
    }
    if (!state.noteMode) {
      if (enabled) toast('先打开一条笔记');
      return;
    }
    if (!window.KnowledgeMarkdown) {
      toast('Markdown 组件未加载');
      return;
    }
    if (enabled) {
      if (state.readingMode) setReadingMode(false);
      flushSave();
      state.sourceMode = true;
      document.body.classList.add('source-mode');
      if (els.panelSource) {
        els.panelSource.classList.add('is-active');
        els.panelSource.title = '退出 Markdown 源码 (Ctrl+Shift+M)';
      }
      if (els.markdownSourceWrap) els.markdownSourceWrap.setAttribute('aria-hidden', 'false');
      state.sourceMarkdown = window.KnowledgeMarkdown.htmlToMarkdown(els.editor.innerHTML);
      els.markdownSource.value = state.sourceMarkdown;
      renderSourcePreview();
      updateStatusBar();
      setTimeout(() => {
        els.markdownSource.focus();
        els.markdownSource.setSelectionRange(0, 0);
      }, 30);
      return;
    }
    if (!state.sourceMode) return;
    syncSourceToEditor();
    state.sourceMode = false;
    document.body.classList.remove('source-mode');
    if (els.panelSource) {
      els.panelSource.classList.remove('is-active');
      els.panelSource.title = 'Markdown 源码 (Ctrl+Shift+M)';
    }
    if (els.markdownSourceWrap) els.markdownSourceWrap.setAttribute('aria-hidden', 'true');
    flushSave();
    renderInspector();
    updateStatusBar();
    els.editor.focus();
  }

  function setReadingMode(enabled) {
    if (!state.noteMode) {
      if (enabled) toast('先打开一条笔记');
      return;
    }
    if (enabled && state.sourceMode) setSourceMode(false);
    if (enabled) flushSave();
    state.readingMode = !!enabled;
    document.body.classList.toggle('reading-mode', state.readingMode);
    els.editor.contentEditable = (state.readingMode || state.readOnly) ? 'false' : 'true';
    els.title.readOnly = state.readingMode || state.readOnly;
    els.categorySelect.disabled = state.readingMode || state.readOnly;
    els.tags.readOnly = state.readingMode || state.readOnly;
    els.panelReading.classList.toggle('is-active', state.readingMode);
    els.panelReading.title = state.readingMode ? '退出阅读视图 (Ctrl+E)' : '切换阅读视图 (Ctrl+E)';
    updateStatusBar();
    renderInspector();
  }

  function openNote(kp, focusTitle) {
    if (!kp) return;
    if (state.selectedId && state.selectedId !== kp.id) flushSave();
    resetSourceMode();
    ensureNoteTab(kp);
    state.noteMode = true;
    state.selectedId = kp.id;
    state.readingMode = false;
    document.body.classList.remove('reading-mode');
    els.editor.contentEditable = state.readOnly ? 'false' : 'true';
    els.title.readOnly = state.readOnly;
    els.categorySelect.disabled = state.readOnly;
    els.tags.readOnly = state.readOnly;
    els.panelReading.classList.remove('is-active');
    els.panelReading.title = '切换阅读视图 (Ctrl+E)';
    state.selectedCategoryId = kp.categoryId;
    state.expanded.add(kp.categoryId);
    document.body.classList.add('note-mode');
    els.title.value = kp.title || '';
    buildCategorySelect(kp.categoryId);
    els.tags.value = (kp.tags || []).join(', ');
    els.editor.innerHTML = kp.content && kp.content.trim() ? kp.content : '<p><br></p>';
    normalizeWikiLinksInEditor(false);
    kp.content = els.editor.innerHTML;
    state.linkSignatures.set(kp.id, wikiSignature(kp));
    els.editor.scrollTop = 0;
    updateNoteMeta(kp);
    renderInspector();
    setSaveStatus('已保存 · ' + clock(kp.updatedAt), 'saved');
    if (!Array.isArray(state.history[kp.id]) || !state.history[kp.id].length) {
      snapshotVersion(kp, { force: true, baseline: true });
    }
    updateHistoryCount();
    renderTree();
    updateStatusBar();
    pauseGraph();
    if (window.innerWidth <= 900) closeSidebar();
    if (focusTitle) {
      setTimeout(() => { els.title.focus(); els.title.select(); }, 80);
    }
  }

  function closeNoteView() {
    flushSave();
    resetSourceMode();
    closeHistory();
    state.noteMode = false;
    state.readingMode = false;
    state.selectedId = null;
    const graphTab = state.tabs.find((tab) => tab.type === 'graph');
    state.activeTabId = graphTab ? 'graph' : (state.tabs[0]?.id || null);
    document.body.classList.remove('note-mode', 'reading-mode');
    resumeGraph();
    updateHistoryCount();
    renderTabs();
    updateStatusBar();
    renderTree();
    if (state.needsFit) {
      state.needsFit = false;
      setTimeout(() => fitGraph(52), 160);
    }
    if (window.innerWidth <= 900) closeSidebar();
  }

  function syncRoute() {
    const id = noteIdFromHash();
    const kp = id ? kpById(id) : null;
    if (kp) {
      const focus = state.focusTitleOnOpen;
      state.focusTitleOnOpen = false;
      openNote(kp, focus);
    } else {
      closeNoteView();
    }
  }

  function selectCategory(categoryId) {
    if (!catById(categoryId)) return;
    state.selectedCategoryId = categoryId;
    state.expanded.add(categoryId);
    renderTree();
  }

  function selectKp(id, focusTitle) {
    const kp = kpById(id);
    if (!kp) return;
    if (state.search) clearSearch();
    state.selectedCategoryId = kp.categoryId;
    state.expanded.add(kp.categoryId);
    state.focusTitleOnOpen = !!focusTitle;
    renderTree();
    const target = `#/note/${encodeURIComponent(id)}`;
    if (location.hash === target) syncRoute();
    else location.hash = target;
  }

  function renderTabs() {
    if (!els.editorTabs) return;
    els.editorTabs.innerHTML = '';
    state.tabs.forEach((tab) => {
      const tabEl = document.createElement('div');
      tabEl.className = 'workspace-tab' + (state.activeTabId === tab.id ? ' is-active' : '');
      tabEl.setAttribute('role', 'tab');
      tabEl.tabIndex = 0;
      tabEl.setAttribute('aria-selected', state.activeTabId === tab.id ? 'true' : 'false');
      const icon = document.createElement('span');
      icon.className = 'tab-icon';
      icon.textContent = tab.type === 'graph' ? '◉' : '¶';
      const label = document.createElement('span');
      label.className = 'tab-label';
      label.textContent = tab.title || '未命名';
      tabEl.append(icon, label);
      const close = document.createElement('button');
      close.type = 'button';
      close.className = 'tab-close';
      close.title = '关闭标签';
      close.setAttribute('aria-label', `关闭 ${tab.title || '标签'}`);
      close.textContent = '×';
      close.addEventListener('click', (event) => {
        event.stopPropagation();
        closeTab(tab.id);
      });
      tabEl.appendChild(close);
      tabEl.addEventListener('click', () => activateTab(tab.id));
      tabEl.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          activateTab(tab.id);
        }
      });
      els.editorTabs.appendChild(tabEl);
    });
    if (els.ribbonGraph) els.ribbonGraph.classList.toggle('is-active', state.activeTabId === 'graph');
    if (els.sidebarGraph) els.sidebarGraph.classList.toggle('is-active', state.activeTabId === 'graph');
    if (els.sidebarGraphCount) els.sidebarGraphCount.textContent = String(state.kps.length);
    const empty = state.tabs.length === 0;
    document.body.classList.toggle('empty-tabs', empty);
    if (els.emptyWorkspace) els.emptyWorkspace.classList.toggle('hidden', !empty);
    if (empty) {
      state.activeTabId = null;
      state.noteMode = false;
      state.selectedId = null;
      state.readingMode = false;
      document.body.classList.remove('note-mode', 'reading-mode');
      closeHistory();
      pauseGraph();
    }
    updateStatusBar();
  }

  function ensureNoteTab(kp) {
    let tab = state.tabs.find((item) => item.type === 'note' && item.id === kp.id);
    if (!tab) {
      tab = { id: kp.id, type: 'note', title: kp.title || '未命名知识点' };
      state.tabs.push(tab);
      const noteTabs = state.tabs.filter((item) => item.type === 'note');
      if (noteTabs.length > 8) {
        const removable = noteTabs.find((item) => item.id !== kp.id && item.id !== state.activeTabId);
        if (removable) state.tabs = state.tabs.filter((item) => item.id !== removable.id);
      }
    }
    tab.title = kp.title || '未命名知识点';
    state.activeTabId = kp.id;
    renderTabs();
  }

  function removeNoteTab(id) {
    const index = state.tabs.findIndex((item) => item.id === id);
    if (index < 0) return;
    const wasActive = state.activeTabId === id;
    state.tabs.splice(index, 1);
    if (state.tabs.length === 0) state.tabs.push({ id: 'graph', type: 'graph', title: '知识网络' });
    if (wasActive) {
      const next = state.tabs[Math.max(0, index - 1)] || state.tabs[0];
      state.activeTabId = next.id;
    }
    renderTabs();
  }

  function activateTab(id) {
    const tab = state.tabs.find((item) => item.id === id);
    if (!tab) return;
    state.activeTabId = id;
    renderTabs();
    if (tab.type === 'graph') {
      if (location.hash && location.hash !== '#/') location.hash = '#/';
      else closeNoteView();
      return;
    }
    const target = `#/note/${encodeURIComponent(id)}`;
    if (location.hash === target) syncRoute();
    else location.hash = target;
  }

  function closeTab(id) {
    const index = state.tabs.findIndex((item) => item.id === id);
    if (index < 0) return;
    const tab = state.tabs[index];
    const wasActive = state.activeTabId === id;
    if (tab.type === 'note' && wasActive) flushSave();
    state.tabs.splice(index, 1);

    if (!wasActive) {
      renderTabs();
      return;
    }

    if (state.tabs.length === 0) {
      state.activeTabId = null;
      state.noteMode = false;
      state.readingMode = false;
      state.selectedId = null;
      document.body.classList.remove('note-mode', 'reading-mode');
      closeHistory();
      resumeGraph();
      if (location.hash && location.hash !== '#/') history.replaceState(null, '', '#/');
      renderTabs();
      updateStatusBar();
      return;
    }

    const next = state.tabs[Math.min(index, state.tabs.length - 1)] || state.tabs[0];
    state.activeTabId = next.id;
    renderTabs();
    if (next.type === 'graph') {
      if (location.hash && location.hash !== '#/') location.hash = '#/';
      else closeNoteView();
    } else {
      const target = `#/note/${encodeURIComponent(next.id)}`;
      if (location.hash === target) syncRoute();
      else location.hash = target;
    }
  }

  function updateStatusBar() {
    const kp = kpById(state.selectedId);
    if (!els.statusFile) return;
    if (!state.tabs.length) {
      els.statusFile.textContent = '没有打开的标签';
      els.statusBacklinks.textContent = '';
      els.statusWords.textContent = '';
      els.statusSave.textContent = state.readOnly ? '只读' : '本地存储';
      els.statusSave.className = state.readOnly ? 'saved' : '';
      els.statusVault.textContent = state.readOnly ? '已发布'
        : state.ownerToken && !IS_LOCAL_DEV ? 'GitHub 编辑' : '知识星图';
      return;
    }
    if (state.noteMode && kp) {
      els.statusFile.textContent = `${categoryName(kp.categoryId)} / ${kp.title || '未命名知识点'}`;
      const characters = stripHtml(els.editor.innerHTML).replace(/\s+/g, '').length;
      els.statusWords.textContent = `${characters} 字`;
      els.statusBacklinks.textContent = `${els.backlinkCount ? els.backlinkCount.textContent : 0} 个反向链接`;
      els.statusSave.textContent = state.readOnly ? '只读' : els.saveStatus.textContent;
      els.statusSave.className = state.readOnly ? 'saved' : els.saveStatus.className;
      els.statusVault.textContent = state.readOnly ? '已发布'
        : state.ownerToken && !IS_LOCAL_DEV ? 'GitHub 编辑'
          : state.readingMode ? '阅读视图'
            : state.sourceMode ? 'Markdown 源码' : '知识星图';
    } else {
      els.statusFile.textContent = '知识网络';
      els.statusWords.textContent = `${state.kps.length} 篇笔记`;
      els.statusBacklinks.textContent = `${countLinks()} 条连接`;
      els.statusSave.textContent = state.readOnly ? '只读' : '本地存储';
      els.statusSave.className = state.readOnly ? 'saved' : '';
      els.statusVault.textContent = state.readOnly ? '已发布'
        : state.ownerToken && !IS_LOCAL_DEV ? 'GitHub 编辑' : '知识星图';
    }
  }

  function goDashboard() {
    closeHistory();
    let graphTab = state.tabs.find((tab) => tab.type === 'graph');
    if (!graphTab) {
      graphTab = { id: 'graph', type: 'graph', title: '知识网络' };
      state.tabs.unshift(graphTab);
    }
    state.activeTabId = 'graph';
    document.body.classList.remove('empty-tabs');
    renderTabs();
    if (location.hash && location.hash !== '#/') location.hash = '#/';
    else closeNoteView();
    resumeGraph();
    requestAnimationFrame(() => {
      resizeGraph();
      setTimeout(() => fitGraph(44), 120);
    });
  }

  function markDirty() {
    if (!state.selectedId || state.readOnly) return;
    setSaveStatus('保存中…', 'saving');
    clearTimeout(state.saveTimer);
    state.saveTimer = setTimeout(commitSave, 700);
  }

  function commitSave() {
    clearTimeout(state.saveTimer);
    state.saveTimer = null;
    if (state.readOnly) return;
    const kp = kpById(state.selectedId);
    if (!kp) return;
    if (document.activeElement !== els.editor) normalizeWikiLinksInEditor(false);
    kp.title = (els.title.value || '').trim() || '未命名知识点';
    kp.content = els.editor.innerHTML;
    kp.tags = parseTags(els.tags.value);
    kp.updatedAt = nowIso();
    if (!kp.summary) kp.summary = stripHtml(kp.content).slice(0, 80);
    try {
      persist();
      setSaveStatus('已保存 · ' + clock(kp.updatedAt), 'saved');
    } catch (err) {
      setSaveStatus('保存失败：本地存储空间不足', 'error');
    }
    updateNoteMeta(kp);
    const activeNoteTab = state.tabs.find((tab) => tab.type === 'note' && tab.id === kp.id);
    if (activeNoteTab) {
      activeNoteTab.title = kp.title;
      renderTabs();
    }
    const signature = wikiSignature(kp);
    const graphChanged = state.linkSignatures.get(kp.id) !== signature;
    state.linkSignatures.set(kp.id, signature);
    if (graphChanged) rebuildGraph();
    else updateGraphNode(kp);
    snapshotVersion(kp);
    updateHistoryCount();
    renderTree();
    renderDashboard();
    renderInspector();
    updateStatusBar();
  }

  function flushSave() {
    if (!state.saveTimer) return;
    clearTimeout(state.saveTimer);
    state.saveTimer = null;
    commitSave();
  }

  function addFile() {
    if (state.readOnly) {
      toast('只读模式：请在本地编辑后发布快照');
      return;
    }
    flushSave();
    let category = state.selectedCategoryId ? catById(state.selectedCategoryId) : null;
    if (!category) {
      const base = '新分类';
      let name = base;
      let index = 2;
      while (state.categories.some((c) => c.name === name)) {
        name = `${base} ${index}`;
        index += 1;
      }
      category = {
        id: uid('cat'),
        name,
        parentId: null,
        color: DESIGN.palette[state.categories.length % DESIGN.palette.length],
        order: Math.max(0, ...state.categories.map((c) => c.order || 0)) + 1
      };
      state.categories.push(category);
    }
    state.selectedCategoryId = category.id;
    state.expanded.add(category.id);
    const kp = {
      id: uid('kp'),
      title: '未命名知识点',
      categoryId: category.id,
      tags: [],
      summary: '',
      updatedAt: nowIso(),
      content: ''
    };
    state.kps.push(kp);
    state.needsFit = true;
    try { persist(); } catch (err) { /* ignore */ }
    rebuildGraph();
    renderAll();
    selectKp(kp.id, true);
    toast('已新建空白文件，直接输入标题即可重命名');
  }

  function deleteCurrentKp() {
    if (state.readOnly) return;
    const kp = kpById(state.selectedId);
    if (!kp) return;
    if (!window.confirm(`删除「${kp.title}」？`)) return;
    resetSourceMode();
    clearTimeout(state.saveTimer);
    state.saveTimer = null;
    state.kps = state.kps.filter((item) => item.id !== kp.id);
    state.relations = state.relations.filter((rel) => rel.from !== kp.id && rel.to !== kp.id);
    delete state.history[kp.id];
    try {
      persist();
      persistHistory();
    } catch (err) { /* ignore */ }
    const graphTab = state.tabs.find((tab) => tab.type === 'graph');
    state.tabs = state.tabs.filter((tab) => tab.id !== kp.id);
    const nextNote = state.tabs.find((tab) => tab.type === 'note');
    state.selectedId = null;
    state.noteMode = false;
    state.readingMode = false;
    document.body.classList.remove('note-mode', 'reading-mode');
    rebuildGraph();
    renderAll();
    if (graphTab) {
      state.activeTabId = 'graph';
      renderTabs();
      if (location.hash && location.hash !== '#/') location.hash = '#/';
      resumeGraph();
      setTimeout(() => fitGraph(52), 120);
    } else if (nextNote) {
      state.activeTabId = nextNote.id;
      renderTabs();
      const target = `#/note/${encodeURIComponent(nextNote.id)}`;
      if (location.hash === target) syncRoute();
      else location.hash = target;
    } else {
      state.activeTabId = null;
      renderTabs();
      if (location.hash && location.hash !== '#/') history.replaceState(null, '', '#/');
      updateStatusBar();
    }
    toast('已删除');
  }

  function resetPrototype() {
    if (state.readOnly) return;
    if (!window.confirm('恢复示例数据？当前修改和版本历史会全部清除。')) return;
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(HISTORY_KEY);
    resetToDefault();
    state.tabs = [];
    state.activeTabId = null;
    renderTabs();
    if (location.hash && location.hash !== '#/') location.hash = '#/';
    else closeNoteView();
    rebuildGraph();
    renderAll();
    updateStatusBar();
    closeMoreMenu();
    toast('已恢复示例数据');
  }

  function toggleMoreMenu(force) {
    const willOpen = typeof force === 'boolean' ? force : els.moreMenu.classList.contains('hidden');
    els.moreMenu.classList.toggle('hidden', !willOpen);
    els.btnMore.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
  }

  function closeMoreMenu() {
    els.moreMenu.classList.add('hidden');
    els.btnMore.setAttribute('aria-expanded', 'false');
  }

  function exportBackup() {
    flushSave();
    closeMoreMenu();
    const payload = {
      app: 'knowledge-nebula',
      version: 1,
      exportedAt: new Date().toISOString(),
      data: {
        categories: state.categories,
        kps: state.kps,
        relations: state.relations
      },
      history: state.history
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `knowledge-nebula-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('已导出备份 JSON');
  }

  function importBackup(file) {
    if (!file || state.readOnly) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const payload = JSON.parse(String(reader.result || ''));
        const source = payload && payload.data ? payload.data : payload;
        if (!source || !Array.isArray(source.categories) || !Array.isArray(source.kps)) {
          throw new Error('备份文件缺少 categories / kps');
        }
        if (!window.confirm('导入会覆盖当前数据和版本历史，继续？')) return;
        const data = normalizeData(source);
        if (!data.categories.length) throw new Error('备份里没有有效分类');
        clearTimeout(state.saveTimer);
        state.saveTimer = null;
        state.categories = data.categories;
        state.kps = data.kps;
        state.relations = data.relations;
        state.history = normalizeHistoryRaw(payload && payload.history ? payload.history : {});
        applyDesignPalette();
        state.search = '';
        state.matchIds = new Set();
        state.selectedId = null;
        state.selectedCategoryId = null;
        state.expanded = new Set();
        state.hoverId = null;
        state.tabs = [{ id: 'graph', type: 'graph', title: '知识网络' }];
        state.activeTabId = 'graph';
        renderTabs();
        const first = topCategories()[0];
        if (first) state.expanded.add(first.id);
        try {
          persist();
          persistHistory();
        } catch (err) {
          throw new Error('本地存储空间不足');
        }
        closeHistory();
        closeMoreMenu();
        if (location.hash && location.hash !== '#/') location.hash = '#/';
        else closeNoteView();
        rebuildGraph();
        renderAll();
        updateHistoryCount();
        updateStatusBar();
        toast('备份已导入');
      } catch (err) {
        toast('导入失败：' + (err.message || '文件格式不正确'));
      }
    };
    reader.onerror = () => toast('导入失败：读取文件时出错');
    reader.readAsText(file);
  }

  /* ------------------------------ Markdown / Obsidian vault ------------------------------ */
  function sanitizeFileName(value, fallback) {
    const name = String(value || '')
      .replace(/[\\/:*?"<>|]/g, '-')
      .replace(/\s+/g, ' ')
      .replace(/^[.\s]+|[.\s]+$/g, '')
      .slice(0, 80);
    return name || fallback || '未命名';
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  function markdownFrontmatter(kp) {
    const tags = Array.isArray(kp.tags) ? kp.tags : [];
    return [
      '---',
      `title: ${JSON.stringify(kp.title || '未命名知识点')}`,
      `category: ${JSON.stringify(categoryName(kp.categoryId))}`,
      `tags: ${JSON.stringify(tags)}`,
      `updated: ${JSON.stringify(kp.updatedAt || new Date().toISOString())}`,
      '---',
      ''
    ].join('\n') + '\n';
  }

  function noteToMarkdown(kp) {
    if (!window.KnowledgeMarkdown) return '';
    const body = window.KnowledgeMarkdown.htmlToMarkdown(kp.content || '');
    return markdownFrontmatter(kp) + '\n' + body;
  }

  async function exportMarkdownVault() {
    closeMoreMenu();
    flushSave();
    if (!window.JSZip || !window.KnowledgeMarkdown) {
      toast('Markdown 导出组件未加载');
      return;
    }
    if (!state.kps.length) {
      toast('还没有可导出的笔记');
      return;
    }
    toast('正在生成 Obsidian Vault…');
    try {
      const zip = new window.JSZip();
      const folderNames = new Map();
      const usedFolders = new Set();
      topCategories().forEach((category) => {
        let folder = sanitizeFileName(category.name, '分类');
        let suffix = 2;
        while (usedFolders.has(folder.toLowerCase())) {
          folder = `${sanitizeFileName(category.name, '分类')} (${suffix++})`;
        }
        usedFolders.add(folder.toLowerCase());
        folderNames.set(category.id, folder);
      });
      folderNames.set('__unfiled__', '未分类');
      const usedFiles = new Map();
      state.kps.forEach((kp) => {
        const folder = folderNames.get(kp.categoryId) || folderNames.get('__unfiled__');
        if (!usedFiles.has(folder)) usedFiles.set(folder, new Set());
        let fileName = sanitizeFileName(kp.title, '未命名笔记');
        let suffix = 2;
        while (usedFiles.get(folder).has(fileName.toLowerCase())) {
          fileName = `${sanitizeFileName(kp.title, '未命名笔记')} (${suffix++})`;
        }
        usedFiles.get(folder).add(fileName.toLowerCase());
        zip.file(`${folder}/${fileName}.md`, noteToMarkdown(kp));
      });
      const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
      downloadBlob(blob, `knowledge-vault-${new Date().toISOString().slice(0, 10)}.zip`);
      toast(`已导出 ${state.kps.length} 篇 Markdown 笔记`);
    } catch (err) {
      toast('导出失败：' + (err.message || '未知错误'));
    }
  }

  function exportCurrentMarkdown() {
    flushSave();
    const kp = kpById(state.selectedId);
    if (!kp) {
      toast('先打开一条笔记');
      return;
    }
    if (!window.KnowledgeMarkdown) {
      toast('Markdown 组件未加载');
      return;
    }
    const blob = new Blob([noteToMarkdown(kp)], { type: 'text/markdown;charset=utf-8' });
    downloadBlob(blob, `${sanitizeFileName(kp.title, '未命名笔记')}.md`);
    toast('已导出当前笔记 Markdown');
  }

  function exportPublishedVault() {
    if (state.readOnly) return;
    closeMoreMenu();
    flushSave();
    const payload = {
      app: 'knowledge-nebula',
      version: 1,
      exportedAt: nowIso(),
      data: {
        categories: state.categories,
        kps: state.kps,
        relations: state.relations
      }
    };
    const text = '/* Published read-only snapshot generated by Knowledge Nebula. */\n'
      + 'window.PUBLISHED_VAULT = ' + JSON.stringify(payload, null, 2) + ';\n';
    downloadBlob(new Blob([text], { type: 'text/javascript;charset=utf-8' }), 'published-vault.js');
    toast('已生成 published-vault.js；替换 prototype/published-vault.js 后提交');
  }

  function previewReadOnly() {
    const url = new URL(location.href);
    url.search = '?readonly=1';
    url.hash = location.hash;
    window.open(url.toString(), '_blank', 'noopener');
  }

  function parseMarkdownFrontmatter(raw) {
    const text = String(raw || '').replace(/\uFEFF/g, '').replace(/\r\n?/g, '\n');
    const lines = text.split('\n');
    const meta = {};
    let bodyStart = 0;
    if (lines[0] && lines[0].trim() === '---') {
      const end = lines.indexOf('---', 1);
      if (end > 0) {
        lines.slice(1, end).forEach((line) => {
          const match = line.match(/^([A-Za-z_][\w-]*)\s*:\s*(.*)$/);
          if (!match) return;
          let value = match[2].trim();
          if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
          }
          meta[match[1].toLowerCase()] = value;
        });
        bodyStart = end + 1;
      }
    }
    let tags = [];
    if (meta.tags) {
      const rawTags = meta.tags.trim();
      if (rawTags.startsWith('[') && rawTags.endsWith(']')) {
        tags = rawTags.slice(1, -1).split(',').map((tag) => tag.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
      } else {
        tags = rawTags.split(',').map((tag) => tag.trim()).filter(Boolean);
      }
    }
    return {
      meta,
      tags,
      body: lines.slice(bodyStart).join('\n').replace(/^\n+/, '')
    };
  }

  function ensureCategoryByName(name) {
    const clean = String(name || '').trim() || '导入';
    const existing = state.categories.find((category) => category.name.toLowerCase() === clean.toLowerCase());
    if (existing) return existing;
    const order = state.categories.reduce((max, category) => Math.max(max, Number(category.order) || 0), 0) + 1;
    const category = {
      id: uid('cat'),
      name: clean,
      parentId: null,
      color: DESIGN.palette[state.categories.length % DESIGN.palette.length],
      order
    };
    state.categories.push(category);
    return category;
  }

  function uniqueNoteTitle(base) {
    const clean = String(base || '').trim() || '未命名笔记';
    if (!state.kps.some((kp) => kp.title === clean)) return clean;
    let index = 2;
    while (state.kps.some((kp) => kp.title === `${clean} (${index})`)) index += 1;
    return `${clean} (${index})`;
  }

  async function importMarkdownFiles(files) {
    if (state.readOnly) return;
    const list = Array.from(files || []).filter((file) => file && /\.(md|markdown)$/i.test(file.name));
    if (!list.length) {
      toast('没有找到 Markdown 文件');
      return;
    }
    if (!window.KnowledgeMarkdown) {
      toast('Markdown 组件未加载');
      return;
    }
    toast(`正在导入 ${list.length} 篇 Markdown…`);
    try {
      const imported = [];
      for (const file of list) {
        const raw = await file.text();
        const parsed = parseMarkdownFrontmatter(raw);
        const fallbackTitle = file.name.replace(/\.(md|markdown)$/i, '');
        let title = parsed.meta.title || fallbackTitle;
        const heading = parsed.body.match(/^#\s+(.+)$/m);
        if (!parsed.meta.title && heading) title = heading[1].trim();
        const categoryNameValue = parsed.meta.category || '';
        const category = categoryNameValue
          ? ensureCategoryByName(categoryNameValue)
          : ensureCategoryByName(state.selectedCategoryId ? categoryName(state.selectedCategoryId) : '导入');
        const html = window.KnowledgeMarkdown.markdownToHtml(parsed.body);
        const kp = {
          id: uid('kp'),
          title: uniqueNoteTitle(title),
          categoryId: category.id,
          tags: parsed.tags,
          summary: stripHtml(html).replace(/\s+/g, ' ').slice(0, 80),
          updatedAt: new Date().toISOString(),
          content: html
        };
        state.kps.push(kp);
        state.expanded.add(category.id);
        imported.push(kp);
      }
      persist();
      persistHistory();
      rebuildGraph();
      renderAll();
      updateHistoryCount();
      if (imported[0]) selectKp(imported[0].id);
      toast(`已导入 ${imported.length} 篇 Markdown 笔记`);
    } catch (err) {
      toast('导入失败：' + (err.message || '文件读取错误'));
    }
  }

  function triggerMarkdownImport() {
    closeMoreMenu();
    if (!els.importMd) return;
    els.importMd.value = '';
    els.importMd.click();
  }

  /* ------------------------------ editor ------------------------------ */
  function applyCommand(command) {
    els.editor.focus();
    document.execCommand(command, false, null);
    els.editor.dispatchEvent(new Event('input', { bubbles: true }));
  }
  function applyBlock(block) {
    els.editor.focus();
    document.execCommand('formatBlock', false, block);
    els.editor.dispatchEvent(new Event('input', { bubbles: true }));
  }

  /* ------------------------------ sidebar collapse ------------------------------ */
  function setSidebarCollapsed(collapsed) {
    const next = !!collapsed && window.innerWidth > 900;
    state.sidebarCollapsed = next;
    els.app.classList.toggle('sidebar-collapsed', next);
    if (els.sidebarCollapse) els.sidebarCollapse.setAttribute('aria-expanded', next ? 'false' : 'true');
    resizeGraph();
    setTimeout(resizeGraph, 90);
    setTimeout(() => {
      resizeGraph();
      updateLabels();
    }, 340);
  }

  /* ------------------------------ command palette ------------------------------ */
  function paletteCommands() {
    if (state.readOnly) {
      return [
        { label: '快速切换笔记', hint: 'Ctrl+O', run: () => openPalette('notes') },
        { label: '搜索笔记', hint: 'K', run: () => { closePalette(); els.search.focus(); els.search.select(); } },
        {
          label: state.sidebarCollapsed ? '展开分类栏' : '收起分类栏',
          hint: '«',
          run: () => setSidebarCollapsed(!state.sidebarCollapsed)
        },
        { label: '适配星图视角', hint: '⌖', run: () => fitGraph(44) },
        { label: '返回知识网络', hint: 'Esc', run: () => goDashboard() },
        { label: state.readingMode ? '退出阅读视图' : '切换阅读视图', hint: 'Ctrl+E', run: () => setReadingMode(!state.readingMode) },
        { label: '所有者登录 / 手机编辑', hint: 'GitHub', run: () => openOwnerModal() },
        { label: '安装到桌面 / 主屏幕', hint: 'PWA', run: () => installPwa() }
      ];
    }
    const commands = [
      { label: '新建知识点', hint: 'N', run: () => addFile() },
      {
        label: '新建一级分类',
        hint: '新建分类 + 空白笔记',
        run: () => { state.selectedCategoryId = null; addFile(); }
      },
      { label: '快速切换笔记', hint: 'Ctrl+O', run: () => openPalette('notes') },
      { label: '搜索笔记', hint: 'K', run: () => { closePalette(); els.search.focus(); els.search.select(); } },
      {
        label: state.sidebarCollapsed ? '展开分类栏' : '收起分类栏',
        hint: '«',
        run: () => setSidebarCollapsed(!state.sidebarCollapsed)
      },
      {
        label: state.autoRotate ? '暂停自动旋转' : '继续自动旋转',
        hint: '⟳',
        run: () => setAutoRotate(!state.autoRotate)
      },
      { label: '适配星图视角', hint: '⌖', run: () => fitGraph(44) },
      { label: '返回知识网络', hint: 'Esc', run: () => goDashboard() },
      { label: '收起知识网络标签', hint: '标签', run: () => {
        if (state.tabs.some((tab) => tab.type === 'graph')) closeTab('graph');
        else toast('知识网络标签未打开');
      } },
      { label: '插入双向链接', hint: '[[ ]]', run: () => insertWikiLink() },
      { label: state.readingMode ? '退出阅读视图' : '切换阅读视图', hint: 'Ctrl+E', run: () => setReadingMode(!state.readingMode) },
      { label: state.sourceMode ? '退出 Markdown 源码' : '切换 Markdown 源码', hint: 'Ctrl+Shift+M', run: () => setSourceMode(!state.sourceMode) },
      { label: '版本历史', hint: '历史', run: () => { if (state.noteMode) openHistory(); else toast('先打开一条笔记'); } },
      { label: '导出备份', hint: 'JSON', run: () => exportBackup() },
      { label: '导出 Obsidian Vault', hint: 'Markdown ZIP', run: () => exportMarkdownVault() },
      { label: '导出当前笔记 Markdown', hint: '.md', run: () => exportCurrentMarkdown() },
      { label: '导入 Markdown 笔记', hint: 'Obsidian', run: () => triggerMarkdownImport() },
      { label: '导出发布快照', hint: '只读站', run: () => exportPublishedVault() },
      { label: '发布到 GitHub Pages', hint: 'GitHub', run: () => publishToGitHub() },
      { label: 'GitHub 发布设置 / 所有者登录', hint: 'Token', run: () => openOwnerModal() },
      { label: '预览访客只读页', hint: '新标签', run: () => previewReadOnly() },
      { label: '安装到桌面 / 主屏幕', hint: 'PWA', run: () => installPwa() },
      { label: '恢复示例数据', hint: '重置', run: () => resetPrototype() }
    ];
    return commands;
  }

  function renderPalette() {
    const input = els.paletteInput;
    const query = input.value.trim().toLowerCase();
    let items;
    if (state.paletteMode === 'notes') {
      items = state.kps
        .slice()
        .sort((a, b) => (a.title || '').localeCompare(b.title || '', 'zh-CN'))
        .map((kp) => ({
          label: kp.title || '未命名知识点',
          hint: categoryName(kp.categoryId),
          run: () => selectKp(kp.id)
        }));
    } else {
      items = paletteCommands();
    }
    if (query) {
      items = items.filter((item) => `${item.label} ${item.hint || ''}`.toLowerCase().includes(query));
    }
    state.paletteItems = items;
    state.paletteIndex = Math.min(state.paletteIndex, Math.max(0, items.length - 1));
    els.paletteList.innerHTML = '';
    if (!items.length) {
      const empty = document.createElement('div');
      empty.className = 'palette-empty';
      empty.textContent = '没有匹配项';
      els.paletteList.appendChild(empty);
      return;
    }
    items.forEach((item, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'palette-item' + (index === state.paletteIndex ? ' is-active' : '');
      button.setAttribute('role', 'option');
      button.dataset.index = String(index);
      const label = document.createElement('span');
      label.className = 'palette-label';
      label.textContent = item.label;
      const hint = document.createElement('span');
      hint.className = 'palette-hint';
      hint.textContent = item.hint || '';
      button.append(label, hint);
      button.addEventListener('mouseenter', () => {
        state.paletteIndex = index;
        els.paletteList.querySelectorAll('.palette-item').forEach((el, i) => {
          el.classList.toggle('is-active', i === index);
        });
      });
      button.addEventListener('click', () => runPaletteItem(item));
      els.paletteList.appendChild(button);
    });
  }

  function openPalette(mode) {
    state.paletteMode = mode || 'commands';
    state.paletteIndex = 0;
    els.paletteInput.value = '';
    els.paletteMode.textContent = state.paletteMode === 'notes' ? '笔记' : '命令';
    els.paletteInput.placeholder = state.paletteMode === 'notes'
      ? '输入笔记标题…'
      : '输入命令，例如“新建”“旋转”“导出”…';
    els.palette.classList.remove('hidden');
    renderPalette();
    setTimeout(() => els.paletteInput.focus(), 0);
  }

  function closePalette() {
    els.palette.classList.add('hidden');
  }

  function runPaletteItem(item) {
    if (!item) return;
    closePalette();
    item.run();
  }

  function movePalette(delta) {
    if (!state.paletteItems.length) return;
    state.paletteIndex = (state.paletteIndex + delta + state.paletteItems.length) % state.paletteItems.length;
    els.paletteList.querySelectorAll('.palette-item').forEach((el, index) => {
      el.classList.toggle('is-active', index === state.paletteIndex);
    });
    const active = els.paletteList.querySelector('.palette-item.is-active');
    if (active) active.scrollIntoView({ block: 'nearest' });
  }

  /* ------------------------------ sidebar mobile ------------------------------ */
  function openSidebar() {
    els.sidebar.classList.add('open');
    els.mobileOverlay.classList.remove('hidden');
  }
  function closeSidebar() {
    els.sidebar.classList.remove('open');
    els.mobileOverlay.classList.add('hidden');
  }

  /* ------------------------------ events ------------------------------ */
  /* ------------------------------ PWA ------------------------------ */
  function isStandaloneMode() {
    return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches)
      || window.navigator.standalone === true;
  }

  function setInstallVisible(visible) {
    [els.ribbonInstall, els.emptyInstall].forEach((button) => {
      if (button) button.classList.toggle('hidden', !visible);
    });
  }

  function installPwa() {
    if (isStandaloneMode()) {
      toast('已经以独立应用方式运行');
      return;
    }
    if (!state.installPrompt) {
      toast('请用浏览器菜单选择「安装应用 / 添加到主屏幕」');
      return;
    }
    const prompt = state.installPrompt;
    state.installPrompt = null;
    setInstallVisible(false);
    prompt.prompt();
    if (prompt.userChoice) {
      prompt.userChoice.then((choice) => {
        if (choice && choice.outcome === 'accepted') toast('正在安装知识星图');
        else toast('已取消安装');
      });
    }
  }

  function updateNetworkStatus() {
    if (!els.statusNetwork) return;
    const online = navigator.onLine;
    els.statusNetwork.textContent = online ? '在线' : '离线可用';
    els.statusNetwork.classList.toggle('is-offline', !online);
    els.statusNetwork.title = online ? '在线，本地数据无需网络' : '离线模式，已缓存应用可打开';
  }

  function updateOwnerButton() {
    if (!els.vaultOwner) return;
    const connected = !!state.ownerToken;
    els.vaultOwner.classList.toggle('is-active', connected);
    els.vaultOwner.title = connected
      ? 'GitHub 已连接 · 点击管理 / 发布'
      : state.readOnly ? '所有者登录 / 手机编辑' : 'GitHub 发布设置';
  }

  function applyReadOnlyMode() {
    document.body.classList.toggle('readonly-mode', state.readOnly);
    document.body.classList.toggle('owner-mode', !state.readOnly && !!state.ownerToken);
    updateOwnerButton();
    if (!state.readOnly) return;
    els.title.readOnly = true;
    els.categorySelect.disabled = true;
    els.tags.readOnly = true;
    els.editor.contentEditable = 'false';
    setSaveStatus('只读 · 已发布', 'saved');
  }

  function applyOwnerMode() {
    state.readOnly = false;
    state.ownerMode = true;
    document.body.classList.remove('readonly-mode');
    document.body.classList.toggle('owner-mode', !!state.ownerToken);
    state.history = loadHistory();
    if (state.noteMode) {
      els.title.readOnly = false;
      els.categorySelect.disabled = false;
      els.tags.readOnly = false;
      els.editor.contentEditable = 'true';
      renderInspector();
    }
    renderTree();
    updateOwnerButton();
    updateStatusBar();
    setSaveStatus(state.ownerToken ? '所有者编辑 · GitHub 已连接' : '所有者编辑 · 未连接 GitHub', state.ownerToken ? 'saved' : '');
  }

  function openOwnerModal() {
    if (!els.ownerModal) return;
    if (FORCED_READONLY) {
      toast('当前是只读预览模式；请去掉 ?readonly=1 后再登录');
      return;
    }
    if (els.ownerStatus) {
      els.ownerStatus.classList.remove('is-ok', 'is-error');
      els.ownerStatus.textContent = state.ownerToken ? '已保存 Token · 可更新' : '未连接';
      if (state.ownerToken) els.ownerStatus.classList.add('is-ok');
    }
    if (els.ownerToken) {
      els.ownerToken.value = '';
      els.ownerToken.placeholder = state.ownerToken ? '已保存 Token；输入新 Token 可替换' : 'github_pat_...';
    }
    els.ownerModal.classList.remove('hidden');
    setTimeout(() => { if (els.ownerToken) els.ownerToken.focus(); }, 30);
  }

  function closeOwnerModal() {
    if (els.ownerModal) els.ownerModal.classList.add('hidden');
  }

  function setOwnerStatus(text, ok) {
    if (!els.ownerStatus) return;
    els.ownerStatus.textContent = text;
    els.ownerStatus.classList.toggle('is-ok', !!ok);
    els.ownerStatus.classList.toggle('is-error', ok === false);
  }

  function githubHeaders(token) {
    return {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    };
  }

  async function githubApi(token, path, options) {
    const opts = options || {};
    const headers = { ...githubHeaders(token), ...(opts.headers || {}) };
    if (opts.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
    const response = await fetch(`https://api.github.com${path}`, { ...opts, headers });
    if (!response.ok) {
      let message = `GitHub API ${response.status}`;
      try {
        const data = await response.json();
        if (data && data.message) message = data.message;
      } catch (err) { /* ignore */ }
      const error = new Error(message);
      error.status = response.status;
      throw error;
    }
    return response;
  }

  async function validateOwnerToken(token) {
    const path = `/repos/${OWNER_REPO.owner}/${OWNER_REPO.repo}`;
    const response = await githubApi(token, path);
    const repo = await response.json();
    if (repo.permissions && repo.permissions.push === false) {
      const error = new Error('这个 Token 没有该仓库的写入权限');
      error.status = 403;
      throw error;
    }
    return repo;
  }

  async function connectOwnerToken() {
    if (state.ownerBusy) return;
    const token = (els.ownerToken.value || '').trim();
    if (!token) {
      setOwnerStatus('请输入 GitHub Token', false);
      return;
    }
    state.ownerBusy = true;
    if (els.ownerConnect) {
      els.ownerConnect.disabled = true;
      els.ownerConnect.textContent = '验证中…';
    }
    setOwnerStatus('正在验证 GitHub 权限…', null);
    try {
      await validateOwnerToken(token);
      try { localStorage.setItem(OWNER_TOKEN_KEY, token); } catch (err) { /* ignore */ }
      state.ownerToken = token;
      state.ownerVerified = true;
      state.ownerMode = true;
      applyOwnerMode();
      setOwnerStatus('已连接，编辑模式已开启', true);
      closeOwnerModal();
      toast('所有者编辑已开启；修改后可从 ⋯ 菜单发布');
    } catch (err) {
      setOwnerStatus(err.message || 'Token 验证失败', false);
      toast('连接失败：' + (err.message || 'GitHub 验证失败'));
    } finally {
      state.ownerBusy = false;
      if (els.ownerConnect) {
        els.ownerConnect.disabled = false;
        els.ownerConnect.textContent = '验证并启用编辑';
      }
    }
  }

  function clearOwnerToken() {
    if (!window.confirm('清除本机保存的 GitHub Token？清除后手机/浏览器会回到只读模式。')) return;
    try { localStorage.removeItem(OWNER_TOKEN_KEY); } catch (err) { /* ignore */ }
    state.ownerToken = '';
    state.ownerVerified = false;
    state.ownerMode = IS_LOCAL_DEV;
    closeOwnerModal();
    if (!IS_LOCAL_DEV) {
      state.readOnly = true;
      applyReadOnlyMode();
      toast('Token 已清除，回到只读模式');
      setTimeout(() => location.reload(), 300);
      return;
    }
    document.body.classList.remove('owner-mode');
    updateOwnerButton();
    setSaveStatus('所有者编辑 · 未连接 GitHub', '');
    toast('Token 已清除');
  }

  function utf8ToBase64(text) {
    const bytes = new TextEncoder().encode(text);
    let binary = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return btoa(binary);
  }

  function buildPublishedPayload() {
    return {
      app: 'knowledge-nebula',
      version: 1,
      exportedAt: nowIso(),
      data: {
        categories: state.categories,
        kps: state.kps,
        relations: state.relations
      }
    };
  }

  function buildPublishedText() {
    return '/* Published read-only snapshot generated by Knowledge Nebula. */\n'
      + 'window.PUBLISHED_VAULT = ' + JSON.stringify(buildPublishedPayload(), null, 2) + ';\n';
  }

  async function publishToGitHub() {
    if (!state.ownerToken) {
      openOwnerModal();
      toast('先验证 GitHub Token 才能发布');
      return;
    }
    if (state.ownerBusy) return;
    closeMoreMenu();
    flushSave();
    state.ownerBusy = true;
    const button = els.btnPublishGithub;
    if (button) {
      button.disabled = true;
      button.textContent = '发布中…';
    }
    toast('正在提交到 GitHub…');
    try {
      const filePath = `/repos/${OWNER_REPO.owner}/${OWNER_REPO.repo}/contents/${OWNER_REPO.path}`;
      let sha = null;
      try {
        const current = await githubApi(state.ownerToken, `${filePath}?ref=${OWNER_REPO.branch}`);
        const data = await current.json();
        sha = data.sha || null;
      } catch (err) {
        if (err.status !== 404) throw err;
      }
      const body = {
        message: `publish: ${new Date().toISOString().slice(0, 19)}`,
        content: utf8ToBase64(buildPublishedText()),
        branch: OWNER_REPO.branch
      };
      if (sha) body.sha = sha;
      const response = await githubApi(state.ownerToken, filePath, {
        method: 'PUT',
        body: JSON.stringify(body)
      });
      const data = await response.json();
      state.lastCommitUrl = (data.commit && data.commit.html_url) || '';
      state.publishedAt = nowIso();
      setSaveStatus('已发布 · GitHub Pages 更新中', 'saved');
      updateStatusBar();
      toast('已提交发布；GitHub Pages 约 1 分钟内更新');
    } catch (err) {
      if (err.status === 401 || err.status === 403) {
        toast('发布失败：Token 无效或没有 Contents 写权限');
      } else {
        toast('发布失败：' + (err.message || 'GitHub API 错误'));
      }
    } finally {
      state.ownerBusy = false;
      if (button) {
        button.disabled = false;
        button.textContent = '发布到 GitHub Pages';
      }
    }
  }

  async function validateStoredOwnerToken() {
    if (!state.ownerToken || IS_LOCAL_DEV || state.readOnly) return;
    try {
      await validateOwnerToken(state.ownerToken);
      state.ownerVerified = true;
      updateOwnerButton();
    } catch (err) {
      if (err.status === 401 || err.status === 403) {
        try { localStorage.removeItem(OWNER_TOKEN_KEY); } catch (e) { /* ignore */ }
        state.ownerToken = '';
        state.ownerVerified = false;
        state.ownerMode = false;
        state.readOnly = true;
        applyReadOnlyMode();
        toast('保存的 GitHub Token 已失效，已回到只读模式');
      }
    }
  }

  function initPwa() {
    updateNetworkStatus();
    window.addEventListener('online', () => {
      updateNetworkStatus();
      toast('已恢复在线');
    });
    window.addEventListener('offline', () => {
      updateNetworkStatus();
      toast('离线模式：已缓存内容仍可打开');
    });
    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      state.installPrompt = event;
      setInstallVisible(true);
    });
    window.addEventListener('appinstalled', () => {
      state.installPrompt = null;
      setInstallVisible(false);
      toast('已安装到桌面 / 主屏幕');
    });
    if (isStandaloneMode()) setInstallVisible(false);
  }

  function handleLaunchAction() {
    const params = new URLSearchParams(location.search);
    const action = params.get('action');
    if (!action) return;
    const cleanUrl = location.pathname + location.hash;
    history.replaceState(null, '', cleanUrl);
    setTimeout(() => {
      if (action === 'new') addFile();
      else if (action === 'graph') goDashboard();
    }, 120);
  }

  function bindEvents() {
    els.btnAdd.addEventListener('click', addFile);
    els.btnReset.addEventListener('click', resetPrototype);
    [els.tabNew, els.ribbonNew, els.vaultNew, els.emptyNew].forEach((button) => {
      if (button) button.addEventListener('click', addFile);
    });
    if (els.emptyGraph) els.emptyGraph.addEventListener('click', goDashboard);
    if (els.emptySwitch) els.emptySwitch.addEventListener('click', () => openPalette('notes'));
    if (els.sidebarGraph) els.sidebarGraph.addEventListener('click', goDashboard);
    [els.tabGraph, els.ribbonGraph].forEach((button) => {
      if (button) button.addEventListener('click', goDashboard);
    });
    if (els.ribbonSearch) els.ribbonSearch.addEventListener('click', () => {
      els.search.focus();
      els.search.select();
    });
    if (els.ribbonPalette) els.ribbonPalette.addEventListener('click', () => openPalette('commands'));
    if (els.ribbonBackup) els.ribbonBackup.addEventListener('click', exportBackup);
    if (els.ribbonSettings) els.ribbonSettings.addEventListener('click', () => setSidebarCollapsed(!state.sidebarCollapsed));
    [els.ribbonInstall, els.emptyInstall].forEach((button) => {
      if (button) button.addEventListener('click', installPwa);
    });
    els.btnMore.addEventListener('click', () => toggleMoreMenu());
    els.btnExport.addEventListener('click', exportBackup);
    els.btnImport.addEventListener('click', () => {
      closeMoreMenu();
      els.importFile.value = '';
      els.importFile.click();
    });
    els.importFile.addEventListener('change', () => {
      const file = els.importFile.files && els.importFile.files[0];
      importBackup(file);
    });
    if (els.btnExportMd) els.btnExportMd.addEventListener('click', exportMarkdownVault);
    if (els.btnImportMd) els.btnImportMd.addEventListener('click', triggerMarkdownImport);
    if (els.btnPublish) els.btnPublish.addEventListener('click', exportPublishedVault);
    if (els.btnPublishGithub) els.btnPublishGithub.addEventListener('click', publishToGitHub);
    [els.vaultOwner, els.emptyOwner].forEach((button) => {
      if (button) button.addEventListener('click', openOwnerModal);
    });
    if (els.ownerClose) els.ownerClose.addEventListener('click', closeOwnerModal);
    if (els.ownerCancel) els.ownerCancel.addEventListener('click', closeOwnerModal);
    if (els.ownerConnect) els.ownerConnect.addEventListener('click', connectOwnerToken);
    if (els.ownerClear) els.ownerClear.addEventListener('click', clearOwnerToken);
    if (els.ownerModal) {
      const ownerBackdrop = els.ownerModal.querySelector('[data-close-owner]');
      if (ownerBackdrop) ownerBackdrop.addEventListener('click', closeOwnerModal);
    }
    if (els.importMd) els.importMd.addEventListener('change', () => {
      const files = els.importMd.files ? Array.from(els.importMd.files) : [];
      els.importMd.value = '';
      importMarkdownFiles(files);
    });
    document.addEventListener('click', (event) => {
      if (els.moreMenu.classList.contains('hidden')) return;
      if (els.moreMenu.contains(event.target) || els.btnMore.contains(event.target)) return;
      closeMoreMenu();
    });

    const paletteBackdrop = els.palette.querySelector('[data-close-palette]');
    if (paletteBackdrop) paletteBackdrop.addEventListener('click', closePalette);
    els.paletteInput.addEventListener('input', () => {
      state.paletteIndex = 0;
      renderPalette();
    });
    els.paletteInput.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowDown') { event.preventDefault(); movePalette(1); }
      else if (event.key === 'ArrowUp') { event.preventDefault(); movePalette(-1); }
      else if (event.key === 'Enter') {
        event.preventDefault();
        runPaletteItem(state.paletteItems[state.paletteIndex]);
      }
    });
    els.btnFit.addEventListener('click', () => { fitGraph(44); toast('已适配视图'); });
    els.btnCollapseGraph.addEventListener('click', () => {
      closeTab('graph');
      toast('已收起知识网络');
    });
    els.btnRotate.addEventListener('click', () => {
      setAutoRotate(!state.autoRotate);
      toast(state.autoRotate ? '自动旋转已开启' : '自动旋转已暂停，方便看细节');
    });
    els.panelClose.addEventListener('click', goDashboard);
    els.btnDelete.addEventListener('click', deleteCurrentKp);
    els.btnHistory.addEventListener('click', openHistory);
    els.historyClose.addEventListener('click', closeHistory);
    els.panelReading.addEventListener('click', () => setReadingMode(!state.readingMode));
    if (els.panelSource) els.panelSource.addEventListener('click', () => setSourceMode(!state.sourceMode));
    if (els.markdownSource) {
      els.markdownSource.addEventListener('input', syncSourceToEditor);
      els.markdownSource.addEventListener('keydown', (event) => {
        if (event.key !== 'Tab') return;
        event.preventDefault();
        const start = els.markdownSource.selectionStart;
        const end = els.markdownSource.selectionEnd;
        els.markdownSource.value = els.markdownSource.value.slice(0, start) + '  ' + els.markdownSource.value.slice(end);
        els.markdownSource.setSelectionRange(start + 2, start + 2);
        syncSourceToEditor();
      });
    }
    if (els.markdownPreview) {
      els.markdownPreview.addEventListener('click', (event) => {
        const wiki = event.target.closest('a.wiki-link');
        if (!wiki) return;
        event.preventDefault();
        openWikiTarget(wiki.getAttribute('data-wiki'), kpById(state.selectedId));
      });
    }
    const historyBackdrop = els.historyModal.querySelector('[data-close-history]');
    if (historyBackdrop) historyBackdrop.addEventListener('click', closeHistory);

    els.sidebarToggle.addEventListener('click', () => {
      if (els.sidebar.classList.contains('open')) closeSidebar(); else openSidebar();
    });
    els.sidebarClose.addEventListener('click', closeSidebar);
    els.mobileOverlay.addEventListener('click', closeSidebar);
    els.sidebarCollapse.addEventListener('click', () => setSidebarCollapsed(true));
    els.sidebarExpand.addEventListener('click', () => setSidebarCollapsed(false));

    els.search.addEventListener('input', handleSearchInput);
    els.search.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        clearSearch();
        els.search.blur();
      }
    });

    els.title.addEventListener('input', () => {
      if (state.readOnly) return;
      const kp = kpById(state.selectedId);
      if (!kp) return;
      kp.title = els.title.value.trim() || '未命名知识点';
      updateGraphNode(kp);
      updateNoteMeta(kp);
      markDirty();
    });
    els.title.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') { event.preventDefault(); els.title.blur(); }
    });

    els.categorySelect.addEventListener('change', () => {
      if (state.readOnly) return;
      const kp = kpById(state.selectedId);
      if (!kp) return;
      kp.categoryId = els.categorySelect.value;
      state.expanded.add(kp.categoryId);
      updateNoteMeta(kp);
      rebuildGraph();
      renderTree();
      markDirty();
    });

    els.tags.addEventListener('input', () => {
      if (state.readOnly) return;
      const kp = kpById(state.selectedId);
      if (!kp) return;
      kp.tags = parseTags(els.tags.value);
      markDirty();
    });

    els.editor.addEventListener('input', () => {
      if (state.readOnly) return;
      const kp = kpById(state.selectedId);
      if (!kp) return;
      kp.content = els.editor.innerHTML;
      markDirty();
    });
    els.editor.addEventListener('click', (event) => {
      const wiki = event.target.closest('a.wiki-link');
      if (wiki) {
        event.preventDefault();
        openWikiTarget(wiki.dataset.wiki || wiki.textContent, kpById(state.selectedId));
        return;
      }
      const link = event.target.closest('a');
      if (link) event.preventDefault();
    });
    els.editor.addEventListener('blur', () => {
      setTimeout(() => {
        if (normalizeWikiLinksInEditor(true)) renderInspector();
      }, 60);
    });
    els.btnWikiLink.addEventListener('click', insertWikiLink);

    $$('.toolbar [data-cmd]').forEach((button) => {
      button.addEventListener('mousedown', (event) => event.preventDefault());
      button.addEventListener('click', () => applyCommand(button.dataset.cmd));
    });
    $$('.toolbar [data-block]').forEach((button) => {
      button.addEventListener('mousedown', (event) => event.preventDefault());
      button.addEventListener('click', () => applyBlock(button.dataset.block));
    });

    $('#btn-link').addEventListener('click', () => {
      const url = window.prompt('输入普通链接地址');
      if (!url) return;
      els.editor.focus();
      document.execCommand('createLink', false, url);
      els.editor.dispatchEvent(new Event('input', { bubbles: true }));
    });
    $('#btn-image').addEventListener('click', () => {
      const url = window.prompt('输入图片 URL（原型暂不上传文件）');
      if (!url) return;
      els.editor.focus();
      document.execCommand('insertHTML', false, `<img src="${url.replace(/"/g, '&quot;')}" alt="">`);
      els.editor.dispatchEvent(new Event('input', { bubbles: true }));
    });
    $('#btn-table').addEventListener('click', () => {
      els.editor.focus();
      document.execCommand('insertHTML', false,
        '<table><thead><tr><th>列 1</th><th>列 2</th></tr></thead><tbody><tr><td>内容</td><td>内容</td></tr></tbody></table><p><br></p>');
      els.editor.dispatchEvent(new Event('input', { bubbles: true }));
    });
    $('#btn-formula').addEventListener('click', () => {
      els.editor.focus();
      document.execCommand('insertHTML', false, '<div class="math">E = mc² &nbsp; · &nbsp; O(n log n)</div><p><br></p>');
      els.editor.dispatchEvent(new Event('input', { bubbles: true }));
    });
    $('#btn-mermaid').addEventListener('click', () => {
      els.editor.focus();
      document.execCommand('insertHTML', false,
        '<div class="mermaid-block">graph TD;\n  A[开始] --> B[结束];</div><p><br></p>');
      els.editor.dispatchEvent(new Event('input', { bubbles: true }));
    });

    document.addEventListener('keydown', (event) => {
      const mod = event.metaKey || event.ctrlKey;
      if (mod && event.key.toLowerCase() === 'p') {
        event.preventDefault();
        openPalette('commands');
        return;
      }
      if (mod && event.key.toLowerCase() === 'o') {
        event.preventDefault();
        openPalette('notes');
        return;
      }
      if (mod && event.key.toLowerCase() === 'w') {
        event.preventDefault();
        closeTab(state.activeTabId);
        return;
      }
      if (mod && event.key.toLowerCase() === 'e') {
        event.preventDefault();
        setReadingMode(!state.readingMode);
        return;
      }
      if (mod && event.shiftKey && event.key.toLowerCase() === 'm') {
        event.preventDefault();
        setSourceMode(!state.sourceMode);
        return;
      }
      if (event.key === 'Escape') {
        if (!els.palette.classList.contains('hidden')) { closePalette(); return; }
        if (!els.moreMenu.classList.contains('hidden')) { closeMoreMenu(); return; }
        if (!els.historyModal.classList.contains('hidden')) { closeHistory(); return; }
        if (els.ownerModal && !els.ownerModal.classList.contains('hidden')) { closeOwnerModal(); return; }
        if (state.sourceMode) { setSourceMode(false); return; }
        if (state.noteMode) { goDashboard(); return; }
        if (els.sidebar.classList.contains('open')) { closeSidebar(); return; }
        if (state.search) { clearSearch(); return; }
      }
      if (isTypingTarget(event.target)) return;
      if (event.key.toLowerCase() === 'n' && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        if (state.readOnly) toast('只读模式：请在本地编辑后发布快照');
        else addFile();
      } else if (event.key.toLowerCase() === 'k' && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        els.search.focus();
        els.search.select();
      } else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        if (state.readOnly) {
          toast('只读模式，内容不可修改');
        } else {
          flushSave();
          toast('已保存');
        }
      }
    });

    // 只有 3D 图内部的操作才允许暂停/接管旋转；图外的点击、滚轮、移动都不影响
    els.graphWrap.addEventListener('pointerdown', () => {
      state.userInteracted = true;
      state.interacting = true;
    }, { passive: true, capture: true });
    window.addEventListener('pointerup', () => {
      if (!state.interacting) return;
      state.interacting = false;
      state.rotationResumeAt = performance.now() + 650;
    });
    window.addEventListener('pointercancel', () => {
      state.interacting = false;
      state.rotationResumeAt = performance.now() + 650;
    });
    els.graphWrap.addEventListener('wheel', (event) => {
      state.userInteracted = true;
      state.rotationResumeAt = performance.now() + 1200;
      // 鼠标在 3D 图内时滚轮只给图缩放，不再同时滚动主面板
      if (event.cancelable) event.preventDefault();
    }, { passive: false });
    window.addEventListener('hashchange', syncRoute);
    window.addEventListener('resize', () => {
      if (window.innerWidth <= 900 && state.sidebarCollapsed) setSidebarCollapsed(false);
    });
    window.addEventListener('beforeunload', flushSave);
  }

  /* ------------------------------ init ------------------------------ */
  function init() {
    const data = loadData();
    state.categories = data.categories;
    state.kps = data.kps;
    state.relations = data.relations;
    state.history = loadHistory();
    applyDesignPalette();
    applyReadOnlyMode();
    const first = topCategories()[0];
    if (first) state.expanded.add(first.id);

    initGraph();
    bindEvents();
    renderAll();
    renderTabs();
    updateHistoryCount();
    if (state.ownerMode && !state.readOnly && state.ownerToken && !IS_LOCAL_DEV) {
      setSaveStatus('所有者编辑 · GitHub 已连接', 'saved');
    } else {
      setSaveStatus('原型数据 · 自动保存到本机', '');
    }
    initPwa();
    syncRoute();
    handleLaunchAction();
    updateStatusBar();
    if (state.ownerMode && !state.readOnly && state.ownerToken && !IS_LOCAL_DEV) {
      updateOwnerButton();
      setTimeout(validateStoredOwnerToken, 500);
    }
    if (!state.kps.length) toast('点左下「新建」开始记录');
  }

  init();

  window.__KN = {
    state,
    selectKp,
    addFile,
    buildGraphData,
    fitGraph,
    openHistory,
    restoreVersion
  };
})();
