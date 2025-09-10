let selectedText = '';

document.addEventListener('mouseup', () => {
  const selection = window.getSelection();
  const text = selection.toString().trim();
  
  if (text.length > 0) {
    selectedText = text;
    chrome.runtime.sendMessage({
      type: 'TEXT_SELECTED',
      text: selectedText
    });
  }
});

document.addEventListener('selectionchange', () => {
  const selection = window.getSelection();
  const text = selection.toString().trim();
  
  if (text.length > 0) {
    selectedText = text;
    chrome.runtime.sendMessage({
      type: 'TEXT_SELECTED',
      text: selectedText
    });
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'GET_SELECTED_TEXT') {
    const selection = window.getSelection();
    const text = selection.toString().trim();
    sendResponse({ text: text || selectedText });
  }
  return true;
});