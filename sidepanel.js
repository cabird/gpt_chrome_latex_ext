let currentSelectedText = '';

function updateTokenCounts() {
  const contextText = document.getElementById('contextText').value;
  const selectedText = currentSelectedText;
  const instructionText = document.getElementById('userPrompt').value;
  const promptTemplate = document.getElementById('promptTemplate').value || 
    `I'm working on LaTeX text. Here is the text I've selected:\n\n{{LATEX_TEXT}}\n\nMy instruction: {{INSTRUCTIONS}}`;
  
  // Count tokens for each field
  const contextTokens = tokenizer.countTokens(contextText);
  const selectedTokens = tokenizer.countTokens(selectedText);
  const instructionTokens = tokenizer.countTokens(instructionText);
  
  // Build the full prompt to count total tokens
  const fullPrompt = promptTemplate
    .replace(/{{LATEX_TEXT}}/g, selectedText)
    .replace(/{{INSTRUCTIONS}}/g, instructionText)
    .replace(/{{CONTEXT}}/g, contextText);
  
  const totalTokens = tokenizer.countTokens(fullPrompt);
  
  // Update displays
  document.getElementById('contextTokenCount').textContent = `${contextTokens.toLocaleString()} tokens`;
  document.getElementById('selectedTokenCount').textContent = `${selectedTokens.toLocaleString()} tokens`;
  
  const totalElement = document.getElementById('totalTokenCount');
  totalElement.textContent = `Total: ${totalTokens.toLocaleString()} tokens`;
  
  // Add warning if approaching limits (128k for GPT-4)
  if (totalTokens > 120000) {
    totalElement.classList.add('warning');
  } else {
    totalElement.classList.remove('warning');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  loadSavedContexts();
  setupEventListeners();
  setupMessageListeners();
  
  // Start with settings and context collapsed
  const settingsContent = document.getElementById('settingsContent');
  const toggleBtn = document.getElementById('toggleSettings');
  settingsContent.classList.add('collapsed');
  toggleBtn.classList.add('collapsed');
  
  const contextContent = document.getElementById('contextContent');
  const contextToggleBtn = document.getElementById('toggleContext');
  contextContent.classList.add('collapsed');
  contextToggleBtn.classList.add('collapsed');
  
  // Initialize token counts
  updateTokenCounts();
});

function loadSettings() {
  chrome.storage.local.get(['apiKey', 'endpoint', 'deployment', 'promptTemplate'], (result) => {
    if (result.apiKey) document.getElementById('apiKey').value = result.apiKey;
    if (result.endpoint) document.getElementById('endpoint').value = result.endpoint;
    if (result.deployment) document.getElementById('deployment').value = result.deployment;
    if (result.promptTemplate) {
      document.getElementById('promptTemplate').value = result.promptTemplate;
    } else {
      // Set default template
      document.getElementById('promptTemplate').value = `I'm working on LaTeX text. Here is the text I've selected:

{{LATEX_TEXT}}

My instruction: {{INSTRUCTIONS}}`;
    }
  });
}

function setupEventListeners() {
  document.getElementById('saveSettings').addEventListener('click', saveSettings);
  document.getElementById('submitBtn').addEventListener('click', processText);
  document.getElementById('copyBtn').addEventListener('click', copyResponse);
  
  document.getElementById('userPrompt').addEventListener('input', () => {
    updateSubmitButton();
    updateTokenCounts();
  });
  
  // Update token counts when context changes
  document.getElementById('contextText').addEventListener('input', updateTokenCounts);
  
  // Toggle settings
  const settingsHeader = document.querySelector('.settings-header');
  settingsHeader.addEventListener('click', toggleSettings);
  
  // Toggle context
  const contextHeader = document.querySelector('.context-header');
  contextHeader.addEventListener('click', toggleContext);
  
  // Clear context button
  document.getElementById('clearContext').addEventListener('click', (e) => {
    e.stopPropagation(); // Prevent toggling when clicking clear
    document.getElementById('contextText').value = '';
    updateTokenCounts();
  });
  
  // Context management buttons
  document.getElementById('saveContext').addEventListener('click', saveContext);
  document.getElementById('deleteContext').addEventListener('click', deleteContext);
  
  // Auto-load context when selected
  document.getElementById('savedContexts').addEventListener('change', () => {
    const selectedName = document.getElementById('savedContexts').value;
    const hasSelection = selectedName !== '';
    document.getElementById('deleteContext').disabled = !hasSelection;
    
    if (hasSelection) {
      loadContext(selectedName);
    }
  });
}

function toggleSettings() {
  const settingsContent = document.getElementById('settingsContent');
  const toggleBtn = document.getElementById('toggleSettings');
  
  settingsContent.classList.toggle('collapsed');
  toggleBtn.classList.toggle('collapsed');
}

function toggleContext() {
  const contextContent = document.getElementById('contextContent');
  const toggleBtn = document.getElementById('toggleContext');
  
  contextContent.classList.toggle('collapsed');
  toggleBtn.classList.toggle('collapsed');
}

function setupMessageListeners() {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'UPDATE_SELECTED_TEXT') {
      updateSelectedText(request.text);
    }
  });
  
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, { type: 'GET_SELECTED_TEXT' }, (response) => {
        if (response && response.text) {
          updateSelectedText(response.text);
        }
      });
    }
  });
}

function updateSelectedText(text) {
  currentSelectedText = text;
  const container = document.getElementById('selectedText');
  if (text) {
    container.innerHTML = `<div style="white-space: pre-wrap; word-wrap: break-word;">${escapeHtml(text)}</div>`;
    updateSubmitButton();
  } else {
    container.innerHTML = '<p class="placeholder">Highlight text in the page to see it here</p>';
  }
  updateTokenCounts();
}

function updateSubmitButton() {
  const hasText = currentSelectedText.length > 0;
  const hasPrompt = document.getElementById('userPrompt').value.trim().length > 0;
  document.getElementById('submitBtn').disabled = !(hasText && hasPrompt);
}

function saveSettings() {
  const apiKey = document.getElementById('apiKey').value;
  const endpoint = document.getElementById('endpoint').value;
  const deployment = document.getElementById('deployment').value;
  const promptTemplate = document.getElementById('promptTemplate').value;
  
  chrome.storage.local.set({
    apiKey: apiKey,
    endpoint: endpoint,
    deployment: deployment,
    promptTemplate: promptTemplate
  }, () => {
    showStatus('Settings saved successfully!', 'success');
  });
}

async function processText() {
  const apiKey = document.getElementById('apiKey').value;
  const endpoint = document.getElementById('endpoint').value;
  const deployment = document.getElementById('deployment').value;
  const userPrompt = document.getElementById('userPrompt').value;
  let promptTemplate = document.getElementById('promptTemplate').value;
  
  if (!apiKey || !endpoint || !deployment) {
    showStatus('Please configure your Azure OpenAI settings first', 'error');
    return;
  }
  
  // Use default template if none is set
  if (!promptTemplate) {
    promptTemplate = `I'm working on LaTeX text. Here is the text I've selected:

{{LATEX_TEXT}}

My instruction: {{INSTRUCTIONS}}`;
  }
  
  document.getElementById('submitBtn').disabled = true;
  showStatus('Processing...', 'info');
  
  const systemPrompt = "You are a helpful assistant specialized in LaTeX editing and academic writing. The user will provide LaTeX text and instructions for how to modify or improve it.";
  
  // Get context text
  const contextText = document.getElementById('contextText').value;
  
  // Replace template variables
  const fullPrompt = promptTemplate
    .replace(/{{LATEX_TEXT}}/g, currentSelectedText)
    .replace(/{{INSTRUCTIONS}}/g, userPrompt)
    .replace(/{{CONTEXT}}/g, contextText);
  
  try {
    const apiUrl = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=2024-02-01`;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey
      },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: fullPrompt }
        ]
      })
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API Error: ${response.status} - ${error}`);
    }
    
    const data = await response.json();
    const responseText = data.choices[0].message.content;
    
    displayResponse(responseText);
    showStatus('Processing complete!', 'success');
  } catch (error) {
    console.error('Error:', error);
    showStatus(`Error: ${error.message}`, 'error');
  } finally {
    document.getElementById('submitBtn').disabled = false;
    updateSubmitButton();
  }
}

function displayResponse(text) {
  const container = document.getElementById('responseText');
  container.innerHTML = `<div style="white-space: pre-wrap; word-wrap: break-word;">${escapeHtml(text)}</div>`;
  document.getElementById('copyBtn').style.display = 'block';
}

function copyResponse() {
  const responseText = document.getElementById('responseText').textContent;
  navigator.clipboard.writeText(responseText).then(() => {
    showStatus('Copied to clipboard!', 'success');
  }).catch(err => {
    showStatus('Failed to copy', 'error');
  });
}

function showStatus(message, type) {
  const statusEl = document.getElementById('statusMessage');
  statusEl.textContent = message;
  statusEl.className = `status ${type}`;
  
  if (type !== 'info') {
    setTimeout(() => {
      statusEl.className = 'status';
    }, 3000);
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function loadSavedContexts() {
  chrome.storage.local.get(['savedContexts'], (result) => {
    const savedContexts = result.savedContexts || {};
    const select = document.getElementById('savedContexts');
    
    // Clear existing options except the first one
    select.innerHTML = '<option value="">Select saved context...</option>';
    
    // Add saved contexts to dropdown
    Object.keys(savedContexts).forEach(name => {
      const option = document.createElement('option');
      option.value = name;
      option.textContent = name;
      select.appendChild(option);
    });
    
    // Disable delete button initially
    document.getElementById('deleteContext').disabled = true;
  });
}

function saveContext() {
  const contextName = document.getElementById('contextName').value.trim();
  const contextText = document.getElementById('contextText').value.trim();
  
  if (!contextName) {
    showStatus('Please enter a name for the context', 'error');
    return;
  }
  
  if (!contextText) {
    showStatus('Please enter some context text to save', 'error');
    return;
  }
  
  chrome.storage.local.get(['savedContexts'], (result) => {
    const savedContexts = result.savedContexts || {};
    
    savedContexts[contextName] = {
      text: contextText,
      timestamp: new Date().toISOString()
    };
    
    chrome.storage.local.set({ savedContexts }, () => {
      showStatus(`Context "${contextName}" saved successfully`, 'success');
      document.getElementById('contextName').value = '';
      loadSavedContexts(); // Refresh the dropdown
    });
  });
}

function loadContext(selectedName) {
  if (!selectedName) return;
  
  chrome.storage.local.get(['savedContexts'], (result) => {
    const savedContexts = result.savedContexts || {};
    
    if (savedContexts[selectedName]) {
      document.getElementById('contextText').value = savedContexts[selectedName].text;
      showStatus(`Context "${selectedName}" loaded`, 'success');
      updateTokenCounts();
    }
  });
}

function deleteContext() {
  const selectedName = document.getElementById('savedContexts').value;
  
  if (!selectedName) return;
  
  if (!confirm(`Are you sure you want to delete the context "${selectedName}"?`)) {
    return;
  }
  
  chrome.storage.local.get(['savedContexts'], (result) => {
    const savedContexts = result.savedContexts || {};
    
    delete savedContexts[selectedName];
    
    chrome.storage.local.set({ savedContexts }, () => {
      showStatus(`Context "${selectedName}" deleted`, 'success');
      document.getElementById('savedContexts').value = '';
      loadSavedContexts(); // Refresh the dropdown
    });
  });
}