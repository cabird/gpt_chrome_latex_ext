let selectedText = '';

// Helper function to safely send messages
function safeSendMessage(message) {
  try {
    if (chrome.runtime?.id) {
      chrome.runtime.sendMessage(message, () => {
        // Check for errors but don't throw
        if (chrome.runtime.lastError) {
          // Extension was reloaded/removed, silently ignore
          console.log('Extension context invalidated - please refresh the page');
        }
      });
    }
  } catch (error) {
    // Extension context is invalid, silently ignore
    console.log('Extension context invalidated - please refresh the page');
  }
}

document.addEventListener('mouseup', () => {
  const selection = window.getSelection();
  const text = selection.toString().trim();

  if (text.length > 0) {
    selectedText = text;
    safeSendMessage({
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
    safeSendMessage({
      type: 'TEXT_SELECTED',
      text: selectedText
    });
  }
});

// Check if extension context is still valid before adding listener
if (chrome.runtime?.id) {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'GET_SELECTED_TEXT') {
      const selection = window.getSelection();
      const text = selection.toString().trim();
      sendResponse({ text: text || selectedText });
    }
    return true;
  });
}