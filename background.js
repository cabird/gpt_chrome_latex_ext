chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ windowId: tab.windowId });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'TEXT_SELECTED') {
    chrome.runtime.sendMessage({
      type: 'UPDATE_SELECTED_TEXT',
      text: request.text
    }).catch(() => {
      
    });
  }
  return true;
});