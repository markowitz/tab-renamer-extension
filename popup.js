const exactKey = (url) => `rename:exact:${url}`;
const baseKey = (origin) => `rename:base:${origin}`;
const prefixKey = (prefix) => `rename:prefix:${prefix}`;

let currentTab = null;
let scope = 'exact'; // 'exact' | 'base' | 'prefix'
const saved = { exact: '', base: '' }; // prefix is keyed by the path input value

async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTab = tab;

  const origin = new URL(tab.url).origin;
  const defaultPrefix = origin + new URL(tab.url).pathname;

  const all = await chrome.storage.local.get(null);
  saved.exact = all[exactKey(tab.url)]?.title ?? '';
  saved.base = all[baseKey(origin)]?.title ?? '';

  const prefixEntries = Object.values(all)
    .filter((v) => v?.matchType === 'prefix' && v.url && tab.url.startsWith(v.url));
  prefixEntries.sort((a, b) => b.url.length - a.url.length);
  const matchingPrefix = prefixEntries[0] ?? null;

  const prefixUrl = matchingPrefix?.url ?? defaultPrefix;
  document.getElementById('pathInput').value = prefixUrl;
  saved.prefixTitle = matchingPrefix?.title ?? '';

  if (saved.exact) scope = 'exact';
  else if (saved.prefixTitle) scope = 'prefix';
  else if (saved.base) scope = 'base';

  const isPrefix = scope === 'prefix';
  document.getElementById('scopeExact').classList.toggle('active', scope === 'exact');
  document.getElementById('scopeBase').classList.toggle('active', scope === 'base');
  document.getElementById('scopePrefix').classList.toggle('active', scope === 'prefix');
  document.getElementById('tabUrl').hidden = isPrefix;
  document.getElementById('pathRow').hidden = !isPrefix;

  renderScopeUrl();
  document.getElementById('nameInput').value = isPrefix ? saved.prefixTitle : (saved[scope] ?? '');

  document.getElementById('scopeExact').addEventListener('click', () => setScope('exact'));
  document.getElementById('scopeBase').addEventListener('click', () => setScope('base'));
  document.getElementById('scopePrefix').addEventListener('click', () => setScope('prefix'));
  document.getElementById('pathInput').addEventListener('input', onPrefixPathChange);
  document.getElementById('optionsLink').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });
  document.getElementById('saveBtn').addEventListener('click', save);
  document.getElementById('clearBtn').addEventListener('click', clear);
  document.getElementById('nameInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') save();
  });
}

async function onPrefixPathChange() {
  const prefix = document.getElementById('pathInput').value.trim();
  if (!prefix) return;
  const result = await chrome.storage.local.get(prefixKey(prefix));
  document.getElementById('nameInput').value = result[prefixKey(prefix)]?.title ?? '';
}

function setScope(newScope) {
  scope = newScope;
  const isPrefix = scope === 'prefix';

  ['scopeExact', 'scopeBase', 'scopePrefix'].forEach((id) => {
    document.getElementById(id).classList.toggle('active', id === `scope${capitalize(scope)}`);
  });

  document.getElementById('tabUrl').hidden = isPrefix;
  document.getElementById('pathRow').hidden = !isPrefix;

  if (isPrefix) {
    document.getElementById('nameInput').value = saved.prefixTitle ?? '';
  } else {
    renderScopeUrl();
    document.getElementById('nameInput').value = saved[scope] ?? '';
  }
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function renderScopeUrl() {
  const urlEl = document.getElementById('tabUrl');
  const display = scope === 'exact' ? currentTab.url : new URL(currentTab.url).origin;
  urlEl.textContent = display;
  urlEl.title = display;
}

async function save() {
  const title = document.getElementById('nameInput').value.trim();
  if (!title) return;

  const origin = new URL(currentTab.url).origin;

  if (scope === 'exact') {
    await chrome.storage.local.set({ [exactKey(currentTab.url)]: { url: currentTab.url, title, matchType: 'exact' } });
    saved.exact = title;
  } else if (scope === 'base') {
    await chrome.storage.local.set({ [baseKey(origin)]: { url: origin, title, matchType: 'base' } });
    saved.base = title;
  } else {
    const prefix = document.getElementById('pathInput').value.trim();
    if (!prefix) return;
    await chrome.storage.local.set({ [prefixKey(prefix)]: { url: prefix, title, matchType: 'prefix' } });
    saved.prefixTitle = title;
  }

  await reapply(title);
  showStatus('Saved!');
}

async function clear() {
  const origin = new URL(currentTab.url).origin;

  if (scope === 'exact') {
    await chrome.storage.local.remove(exactKey(currentTab.url));
    saved.exact = '';
  } else if (scope === 'base') {
    await chrome.storage.local.remove(baseKey(origin));
    saved.base = '';
  } else {
    const prefix = document.getElementById('pathInput').value.trim();
    if (prefix) await chrome.storage.local.remove(prefixKey(prefix));
    saved.prefixTitle = '';
  }

  document.getElementById('nameInput').value = '';
  chrome.tabs.reload(currentTab.id);
  showStatus('Cleared');
}

async function reapply(title) {
  const origin = new URL(currentTab.url).origin;
  const prefix = scope === 'prefix' ? document.getElementById('pathInput').value.trim() : null;
  try {
    await chrome.tabs.sendMessage(currentTab.id, {
      type: 'APPLY_RENAME',
      matchType: scope,
      url: scope === 'exact' ? currentTab.url : scope === 'base' ? origin : prefix,
      title,
    });
  } catch {
    // Content script may not be available on restricted pages — safe to ignore
  }
}

function showStatus(msg) {
  const el = document.getElementById('status');
  el.textContent = msg;
  setTimeout(() => { el.textContent = ''; }, 1500);
}

init();
