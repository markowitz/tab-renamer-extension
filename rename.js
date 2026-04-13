const exactKey = (url) => `rename:exact:${url}`;
const baseKey = (origin) => `rename:base:${origin}`;
const prefixKey = (prefix) => `rename:prefix:${prefix}`;

const params = new URLSearchParams(location.search);
const tabId = parseInt(params.get('tabId'), 10);
const tabUrl = params.get('tabUrl') ?? '';

let scope = 'exact';
const saved = { exact: '', base: '' };
let tabOrigin = '';
let defaultPrefix = '';

async function init() {
  tabOrigin = new URL(tabUrl).origin;
  defaultPrefix = tabOrigin + new URL(tabUrl).pathname;

  const urlEl = document.getElementById('tabUrl');
  urlEl.textContent = tabUrl;
  urlEl.title = tabUrl;

  document.getElementById('pathInput').value = defaultPrefix;

  const [exactResult, baseResult, prefixResult] = await Promise.all([
    chrome.storage.local.get(exactKey(tabUrl)),
    chrome.storage.local.get(baseKey(tabOrigin)),
    chrome.storage.local.get(prefixKey(defaultPrefix)),
  ]);
  saved.exact = exactResult[exactKey(tabUrl)]?.title ?? '';
  saved.base = baseResult[baseKey(tabOrigin)]?.title ?? '';
  saved.prefixTitle = prefixResult[prefixKey(defaultPrefix)]?.title ?? '';

  const input = document.getElementById('nameInput');
  input.value = saved.exact;
  input.focus();
  input.select();

  document.getElementById('scopeExact').addEventListener('click', () => setScope('exact'));
  document.getElementById('scopeBase').addEventListener('click', () => setScope('base'));
  document.getElementById('scopePrefix').addEventListener('click', () => setScope('prefix'));
  document.getElementById('pathInput').addEventListener('input', onPrefixPathChange);
  document.getElementById('saveBtn').addEventListener('click', save);
  document.getElementById('clearBtn').addEventListener('click', clear);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') save();
    if (e.key === 'Escape') window.close();
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
    const display = scope === 'exact' ? tabUrl : tabOrigin;
    const urlEl = document.getElementById('tabUrl');
    urlEl.textContent = display;
    urlEl.title = display;
    document.getElementById('nameInput').value = saved[scope] ?? '';
  }
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

async function save() {
  const title = document.getElementById('nameInput').value.trim();
  if (!title) return;

  if (scope === 'exact') {
    await chrome.storage.local.set({ [exactKey(tabUrl)]: { url: tabUrl, title, matchType: 'exact' } });
    saved.exact = title;
  } else if (scope === 'base') {
    await chrome.storage.local.set({ [baseKey(tabOrigin)]: { url: tabOrigin, title, matchType: 'base' } });
    saved.base = title;
  } else {
    const prefix = document.getElementById('pathInput').value.trim();
    if (!prefix) return;
    await chrome.storage.local.set({ [prefixKey(prefix)]: { url: prefix, title, matchType: 'prefix' } });
    saved.prefixTitle = title;
  }

  await reapply(title);
  showStatus('Saved!');
  setTimeout(() => window.close(), 600);
}

async function clear() {
  if (scope === 'exact') {
    await chrome.storage.local.remove(exactKey(tabUrl));
    saved.exact = '';
  } else if (scope === 'base') {
    await chrome.storage.local.remove(baseKey(tabOrigin));
    saved.base = '';
  } else {
    const prefix = document.getElementById('pathInput').value.trim();
    if (prefix) await chrome.storage.local.remove(prefixKey(prefix));
    saved.prefixTitle = '';
  }

  document.getElementById('nameInput').value = '';
  chrome.tabs.reload(tabId);
  showStatus('Cleared');
  setTimeout(() => window.close(), 600);
}

async function reapply(title) {
  const prefix = scope === 'prefix' ? document.getElementById('pathInput').value.trim() : null;
  try {
    await chrome.tabs.sendMessage(tabId, {
      type: 'APPLY_RENAME',
      matchType: scope,
      url: scope === 'exact' ? tabUrl : scope === 'base' ? tabOrigin : prefix,
      title,
    });
  } catch {
    // Content script may not be available on restricted pages
  }
}

function showStatus(msg) {
  const el = document.getElementById('status');
  el.textContent = msg;
}

init();
