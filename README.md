# ✏️ Tab Renamer

> Rename any browser tab and keep the name across reloads.

A lightweight Manifest V3 extension for Chrome and Chromium-based browsers (Edge, Brave, Arc, etc.). Set a custom name for a single page, an entire domain, or any URL path prefix — the name sticks even when the page tries to reset its own title.

---

## Features

- **Persistent renames** — names survive page reloads and navigation via `chrome.storage.local`
- **Three scoping modes** — rename one page, a whole domain, or every URL under a path prefix
- **Smart priority** — more specific rules always win (exact > path prefix > domain)
- **Longest-prefix wins** — if multiple prefix rules match, the most specific one applies
- **Fights title resets** — a `MutationObserver` re-applies your name if the page overwrites it
- **Options page** — view, edit, and delete all saved renames in one place

---

## Installation

> The extension is not yet listed on the Chrome Web Store. Install it manually:

1. Clone or download this repository
   ```
   git clone https://github.com/your-username/tab-renamer-extension.git
   ```
2. Open Chrome and go to `chrome://extensions`
3. Enable **Developer mode** (top-right toggle)
4. Click **Load unpacked** and select the repository folder
5. The ✏️ icon will appear in your toolbar

---

## Usage

### Toolbar popup
Click the **✏️** icon in the toolbar while on any tab.

1. Choose a scope using the toggle at the top
2. Type a custom name
3. Press **Enter** or click **Save**

To remove a rename, click **Clear** — the tab reloads with its original title.

### Options page
Click **Manage all renames →** at the bottom of the popup (or visit `chrome://extensions` → Tab Renamer → Extension options) to see a table of every saved rename. You can edit names inline or delete individual entries.

---

## Scoping & Priority

| Scope | Matches | Example |
|---|---|---|
| **This page** | Exact URL only | `https://example.com/dashboard?view=list` |
| **Custom path** | URL starts with the given prefix | `https://example.com/app` → matches `/app`, `/app/settings`, `/app/users/1` |
| **Entire domain** | Any URL on the origin | `https://example.com` → matches everything on that domain |

When multiple rules match a tab, the most specific one wins:

```
Exact  >  Custom path (longest prefix)  >  Entire domain
```

---

## Development

```bash
git clone https://github.com/your-username/tab-renamer-extension.git
cd tab-renamer-extension
```

Load the folder as an unpacked extension (see [Installation](#installation)). Changes to any file take effect after clicking **↺ Update** on `chrome://extensions` (background/manifest changes) or simply reloading the tab (content script changes).

### File overview

| File | Purpose |
|---|---|
| `manifest.json` | Extension manifest (Manifest V3) |
| `background.js` | Service worker — registers the right-click context menu |
| `content.js` | Injected into every page — applies and watches the custom title |
| `popup.html/js` | Toolbar popup UI |
| `rename.html/js` | Quick rename window opened from the context menu |
| `options.html/js` | Full options page listing all saved renames |
