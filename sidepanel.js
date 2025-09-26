let currentSelectedText = '';

function updateTokenCounts() {
  // Check if tokenizer is loaded
  if (typeof GPTTokenizer_o200k_base === 'undefined') {
    console.warn('Tokenizer not loaded yet');
    return;
  }
  
  const contextText = document.getElementById('contextText').value;
  const selectedText = currentSelectedText;
  const instructionText = document.getElementById('userPrompt').value;
  const promptTemplate = document.getElementById('promptTemplate').value || 
    `I'm working on LaTeX text. Here is the text I've selected:\n\n{{LATEX_TEXT}}\n\nMy instruction: {{INSTRUCTIONS}}`;
  
  // Count tokens for each field using o200k_base tokenizer
  const contextTokens = contextText ? GPTTokenizer_o200k_base.encode(contextText).length : 0;
  const selectedTokens = selectedText ? GPTTokenizer_o200k_base.encode(selectedText).length : 0;
  const instructionTokens = instructionText ? GPTTokenizer_o200k_base.encode(instructionText).length : 0;
  
  // Build the full prompt to count total tokens
  const fullPrompt = promptTemplate
    .replace(/{{LATEX_TEXT}}/g, selectedText)
    .replace(/{{INSTRUCTIONS}}/g, instructionText)
    .replace(/{{CONTEXT}}/g, contextText);
  
  const totalTokens = fullPrompt ? GPTTokenizer_o200k_base.encode(fullPrompt).length : 0;
  
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
  loadModelConfigs();
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
  
  // Initialize token counts after a delay to ensure GPTTokenizer is loaded
  setTimeout(() => {
    updateTokenCounts();
  }, 100);
});

function generateConfigId() {
  return 'config_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function loadModelConfigs() {
  chrome.storage.local.get(['modelConfigs', 'activeConfigId', 'promptTemplate'], (result) => {
    const configs = result.modelConfigs || {};
    const activeId = result.activeConfigId;
    
    // Load configs into dropdown
    const select = document.getElementById('modelConfig');
    select.innerHTML = '<option value="">Select configuration...</option>';
    select.innerHTML += '<option value="__new__">+ New Configuration</option>';
    
    Object.keys(configs).forEach(id => {
      const option = document.createElement('option');
      option.value = id;
      option.textContent = configs[id].name;
      select.appendChild(option);
    });
    
    // Load active config if exists
    if (activeId && configs[activeId]) {
      select.value = activeId;
      loadConfigFields(configs[activeId]);
      document.getElementById('deleteConfig').style.display = 'inline-block';
    } else {
      clearConfigFields();
    }
    
    // Load prompt template
    if (result.promptTemplate) {
      document.getElementById('promptTemplate').value = result.promptTemplate;
    } else {
      document.getElementById('promptTemplate').value = `I'm working on LaTeX text. Here is the text I've selected:

{{LATEX_TEXT}}

My instruction: {{INSTRUCTIONS}}`;
    }
  });
}

function loadConfigFields(config) {
  document.getElementById('configName').value = config.name || '';
  document.getElementById('provider').value = config.provider || 'azure';
  document.getElementById('apiKey').value = config.apiKey || '';

  // Azure-specific fields
  document.getElementById('endpoint').value = config.endpoint || '';
  document.getElementById('deployment').value = config.deployment || '';

  // OpenAI-specific fields
  document.getElementById('model').value = config.model || 'gpt-4-turbo-preview';

  // Update UI visibility
  updateProviderFields(config.provider || 'azure');
}

function updateProviderFields(provider) {
  const azureFields = document.querySelectorAll('.azure-only');
  const openaiFields = document.querySelectorAll('.openai-only');

  if (provider === 'azure') {
    azureFields.forEach(el => el.style.display = 'block');
    openaiFields.forEach(el => el.style.display = 'none');
  } else {
    azureFields.forEach(el => el.style.display = 'none');
    openaiFields.forEach(el => el.style.display = 'block');
  }
}

function clearConfigFields() {
  document.getElementById('configName').value = '';
  document.getElementById('provider').value = 'azure';
  document.getElementById('apiKey').value = '';
  document.getElementById('endpoint').value = '';
  document.getElementById('deployment').value = '';
  document.getElementById('model').value = 'gpt-4-turbo-preview';
  document.getElementById('deleteConfig').style.display = 'none';
  updateProviderFields('azure');
}

function setupEventListeners() {
  document.getElementById('saveConfig').addEventListener('click', saveConfig);
  document.getElementById('deleteConfig').addEventListener('click', deleteConfig);
  
  // Model config dropdown
  document.getElementById('modelConfig').addEventListener('change', (e) => {
    const selectedValue = e.target.value;
    
    if (selectedValue === '__new__') {
      // New configuration
      clearConfigFields();
      document.getElementById('configName').focus();
    } else if (selectedValue) {
      // Load existing configuration
      chrome.storage.local.get(['modelConfigs'], (result) => {
        const configs = result.modelConfigs || {};
        if (configs[selectedValue]) {
          loadConfigFields(configs[selectedValue]);
          document.getElementById('deleteConfig').style.display = 'inline-block';
          
          // Set as active config
          chrome.storage.local.set({ activeConfigId: selectedValue });
        }
      });
    } else {
      // No selection
      document.getElementById('deleteConfig').style.display = 'none';
    }
  });
  document.getElementById('submitBtn').addEventListener('click', processText);
  document.getElementById('copyBtn').addEventListener('click', copyResponse);

  // Provider dropdown
  document.getElementById('provider').addEventListener('change', (e) => {
    updateProviderFields(e.target.value);
  });
  
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
        // Check for runtime errors (content script not injected)
        if (chrome.runtime.lastError) {
          console.log('Content script not available on this tab:', chrome.runtime.lastError.message);
          // This is normal for chrome:// pages or tabs opened before extension was installed
          return;
        }
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

function saveConfig() {
  const configName = document.getElementById('configName').value.trim();
  const provider = document.getElementById('provider').value;
  const apiKey = document.getElementById('apiKey').value.trim();
  const promptTemplate = document.getElementById('promptTemplate').value;

  if (!configName) {
    showStatus('Please enter a configuration name', 'error');
    return;
  }

  if (!apiKey) {
    showStatus('Please enter an API key', 'error');
    return;
  }

  // Provider-specific validation
  let endpoint = '';
  let deployment = '';
  let model = '';

  if (provider === 'azure') {
    endpoint = document.getElementById('endpoint').value.trim();
    deployment = document.getElementById('deployment').value.trim();

    if (!endpoint || !deployment) {
      showStatus('Please fill in all Azure OpenAI fields', 'error');
      return;
    }
  } else {
    model = document.getElementById('model').value;

    if (!model) {
      showStatus('Please select a model', 'error');
      return;
    }
  }
  
  chrome.storage.local.get(['modelConfigs'], (result) => {
    const configs = result.modelConfigs || {};
    const select = document.getElementById('modelConfig');

    // Check if updating existing or creating new
    let configId = select.value;
    const isNewConfig = !configId || configId === '__new__';

    // If name changed on existing config, treat as new config
    if (!isNewConfig && configs[configId] && configs[configId].name !== configName) {
      configId = generateConfigId();
    } else if (isNewConfig) {
      configId = generateConfigId();
    }

    configs[configId] = {
      name: configName,
      provider: provider,
      apiKey: apiKey,
      endpoint: endpoint,
      deployment: deployment,
      model: model
    };

    chrome.storage.local.set({
      modelConfigs: configs,
      activeConfigId: configId,
      promptTemplate: promptTemplate
    }, () => {
      showStatus('Configuration saved successfully!', 'success');
      loadModelConfigs();
      document.getElementById('modelConfig').value = configId;
    });
  });
}

function deleteConfig() {
  const select = document.getElementById('modelConfig');
  const configId = select.value;
  
  if (!configId || configId === '__new__') return;
  
  const configName = document.getElementById('configName').value;
  if (!confirm(`Delete configuration "${configName}"?`)) return;
  
  chrome.storage.local.get(['modelConfigs', 'activeConfigId'], (result) => {
    const configs = result.modelConfigs || {};
    delete configs[configId];
    
    // Clear active if it was the deleted one
    const newActiveId = result.activeConfigId === configId ? null : result.activeConfigId;
    
    chrome.storage.local.set({
      modelConfigs: configs,
      activeConfigId: newActiveId
    }, () => {
      showStatus('Configuration deleted', 'success');
      loadModelConfigs();
    });
  });
}

async function processText() {
  // Get current configuration
  const configId = document.getElementById('modelConfig').value;
  if (!configId || configId === '__new__') {
    showStatus('Please select a model configuration', 'error');
    return;
  }

  // Get config details
  chrome.storage.local.get(['modelConfigs'], async (result) => {
    const configs = result.modelConfigs || {};
    const config = configs[configId];

    if (!config) {
      showStatus('Configuration not found', 'error');
      return;
    }

    const provider = config.provider || 'azure';
    const apiKey = config.apiKey;
    const userPrompt = document.getElementById('userPrompt').value;
    let promptTemplate = document.getElementById('promptTemplate').value;

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
      let apiUrl, headers, body;

      if (provider === 'azure') {
        // Azure OpenAI API
        apiUrl = `${config.endpoint}/openai/deployments/${config.deployment}/chat/completions?api-version=2024-02-01`;
        headers = {
          'Content-Type': 'application/json',
          'api-key': apiKey
        };
        body = JSON.stringify({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: fullPrompt }
          ]
        });
      } else {
        // Standard OpenAI API
        apiUrl = 'https://api.openai.com/v1/chat/completions';
        headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        };
        body = JSON.stringify({
          model: config.model || 'gpt-4-turbo-preview',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: fullPrompt }
          ]
        });
      }

      // Calculate token counts for debug output
      const systemTokens = GPTTokenizer_o200k_base ? GPTTokenizer_o200k_base.encode(systemPrompt).length : 0;
      const promptTokens = GPTTokenizer_o200k_base ? GPTTokenizer_o200k_base.encode(fullPrompt).length : 0;
      const totalTokens = systemTokens + promptTokens;

      // Debug logging
      console.log('=== API Call Debug Info ===');
      console.log('Provider:', provider);
      console.log('Full URL:', apiUrl);
      console.log('Model:', provider === 'openai' ? (config.model || 'gpt-4-turbo-preview') : config.deployment);
      console.log('Token Counts:', {
        system: systemTokens,
        prompt: promptTokens,
        total: totalTokens
      });

      // Show truncated request body for debug
      const parsedBody = JSON.parse(body);
      const truncatedBody = {
        ...parsedBody,
        messages: parsedBody.messages.map(msg => ({
          role: msg.role,
          content: msg.content.length > 100 ? msg.content.substring(0, 100) + '...[truncated]' : msg.content
        }))
      };
      console.log('Request Body (truncated):', truncatedBody);
      console.log('===========================');

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: headers,
        body: body
      });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API Error: ${response.status} - ${error}`);
    }
    
    const data = await response.json();
    
    // Log the full response to console for inspection
    console.log('OpenAI API Response:', data);
    
    const responseText = data.choices[0].message.content;
    
    displayResponse(responseText);
    
    // Display token usage if available
    if (data.usage) {
      displayTokenUsage(data.usage);
    }
    
    showStatus('Processing complete!', 'success');
  } catch (error) {
    console.error('Error:', error);
    showStatus(`Error: ${error.message}`, 'error');
  } finally {
    document.getElementById('submitBtn').disabled = false;
    updateSubmitButton();
  }
  });
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

function displayTokenUsage(usage) {
  const promptTokens = usage.prompt_tokens || 0;
  const completionTokens = usage.completion_tokens || 0;
  const cachedTokens = usage.prompt_tokens_details?.cached_tokens || 0;
  const newTokens = promptTokens - cachedTokens;
  
  document.getElementById('promptTokens').textContent = promptTokens.toLocaleString();
  document.getElementById('newTokens').textContent = newTokens.toLocaleString();
  document.getElementById('cachedTokens').textContent = cachedTokens.toLocaleString();
  document.getElementById('completionTokens').textContent = completionTokens.toLocaleString();
  
  document.getElementById('tokenUsage').style.display = 'block';
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