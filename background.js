const MENU_ID = 'tab-renamer-context-menu';

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: MENU_ID,
    title: 'Rename this tab',
    contexts: ['page'],
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== MENU_ID || !tab?.id) return;

  const url = new URL(chrome.runtime.getURL('rename.html'));
  url.searchParams.set('tabId', tab.id);
  url.searchParams.set('tabUrl', tab.url ?? '');
  url.searchParams.set('tabTitle', tab.title ?? '');

  chrome.windows.create({
    url: url.toString(),
    type: 'popup',
    width: 420,
    height: 160,
    focused: true,
  });
});
