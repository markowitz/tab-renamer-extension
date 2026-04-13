async function loadAll() {
  const all = await chrome.storage.local.get(null);
  return Object.values(all).filter((v) => v?.url && v?.title && v?.matchType);
}

async function render() {
  const entries = await loadAll();
  const tbody = document.getElementById('tbody');
  const table = document.getElementById('table');
  const empty = document.getElementById('empty');

  tbody.innerHTML = '';

  if (entries.length === 0) {
    table.hidden = true;
    empty.hidden = false;
    return;
  }

  table.hidden = false;
  empty.hidden = true;

  entries.sort((a, b) => a.url.localeCompare(b.url));

  for (const entry of entries) {
    const tr = document.createElement('tr');

    const tdUrl = document.createElement('td');
    tdUrl.className = 'td-url';
    const a = document.createElement('a');
    a.href = entry.url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = entry.url;
    a.title = entry.url;
    tdUrl.appendChild(a);

    const tdScope = document.createElement('td');
    tdScope.style.cssText = 'white-space:nowrap; font-size:11px; color:#6b7280;';
    tdScope.textContent = entry.matchType === 'base' ? '🌐 Domain' : entry.matchType === 'prefix' ? '📂 Path' : '📄 Page';

    const tdName = document.createElement('td');
    tdName.className = 'td-name';
    const input = document.createElement('input');
    input.type = 'text';
    input.value = entry.title;
    input.dataset.url = entry.url;
    tdName.appendChild(input);

    const tdActions = document.createElement('td');
    tdActions.className = 'td-actions';

    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn-save';
    saveBtn.textContent = 'Save';
    saveBtn.addEventListener('click', () => saveEntry(entry, input.value.trim()));

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn-delete';
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', () => deleteEntry(entry, tr));

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') saveEntry(entry, input.value.trim());
    });

    tdActions.appendChild(saveBtn);
    tdActions.appendChild(deleteBtn);

    tr.appendChild(tdUrl);
    tr.appendChild(tdScope);
    tr.appendChild(tdName);
    tr.appendChild(tdActions);
    tbody.appendChild(tr);
  }
}

function storageKeyForEntry(entry) {
  if (entry.matchType === 'base') return `rename:base:${entry.url}`;
  if (entry.matchType === 'prefix') return `rename:prefix:${entry.url}`;
  return `rename:exact:${entry.url}`;
}

async function saveEntry(entry, title) {
  if (!title) return;
  const updated = { ...entry, title };
  await chrome.storage.local.set({ [storageKeyForEntry(entry)]: updated });
  notifyTab(entry);
}

async function deleteEntry(entry, tr) {
  await chrome.storage.local.remove(storageKeyForEntry(entry));
  notifyTab({ ...entry, title: null });
  tr.remove();

  const tbody = document.getElementById('tbody');
  if (tbody.children.length === 0) {
    document.getElementById('table').hidden = true;
    document.getElementById('empty').hidden = false;
  }
}

async function notifyTab(entry) {
  try {
    let pattern;
    if (entry.matchType === 'base') pattern = `${entry.url}/*`;
    else if (entry.matchType === 'prefix') pattern = `${entry.url}*`;
    else pattern = entry.url;

    const tabs = await chrome.tabs.query({ url: pattern });
    for (const tab of tabs) {
      chrome.tabs.sendMessage(tab.id, {
        type: 'APPLY_RENAME',
        matchType: entry.matchType,
        url: entry.url,
        title: entry.title ?? null,
      }).catch(() => {});
    }
  } catch {
    // Ignore
  }
}

render();
