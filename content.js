(() => {
  let currentTitle = null;
  let observer = null;

  function applyTitle(title) {
    currentTitle = title;
    document.title = title;
    attachObserver();
  }

  function attachObserver() {
    if (observer) observer.disconnect();

    observer = new MutationObserver(() => {
      if (document.title !== currentTitle) {
        // Disconnect briefly to avoid triggering ourselves
        observer.disconnect();
        document.title = currentTitle;
        observer.observe(document.head, { subtree: true, childList: true, characterData: true });
      }
    });

    if (document.head) {
      observer.observe(document.head, { subtree: true, childList: true, characterData: true });
    }
  }

  function checkAndApply() {
    chrome.storage.local.get(null, (all) => {
      const href = location.href;
      const origin = location.origin;

      // Priority: exact > prefix (longest match) > base
      const exactEntry = all[`rename:exact:${href}`];
      if (exactEntry?.title) { applyTitle(exactEntry.title); return; }

      const prefixEntries = Object.values(all)
        .filter((v) => v?.matchType === 'prefix' && v.url && href.startsWith(v.url));
      if (prefixEntries.length > 0) {
        prefixEntries.sort((a, b) => b.url.length - a.url.length); // longest prefix wins
        applyTitle(prefixEntries[0].title);
        return;
      }

      const baseEntry = all[`rename:base:${origin}`];
      if (baseEntry?.title) applyTitle(baseEntry.title);
    });
  }

  // Self-apply on load
  checkAndApply();

  // Listen for immediate reapply messages from popup/rename window (save only)
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type !== 'APPLY_RENAME' || !msg.title) return;
    const matches =
      (msg.matchType === 'exact' && msg.url === location.href) ||
      (msg.matchType === 'prefix' && location.href.startsWith(msg.url)) ||
      (msg.matchType === 'base' && msg.url === location.origin);
    if (matches) applyTitle(msg.title);
  });
})();
