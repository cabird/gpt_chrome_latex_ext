# LaTeX Editor Assistant Chrome Extension

A Chrome extension that provides AI-powered LaTeX editing assistance using Azure OpenAI.

## Features

- Highlight text in any webpage (especially useful for Overleaf)
- Get AI-powered suggestions for improving LaTeX text
- Side panel interface for easy access
- Secure Azure OpenAI integration

## Setup Instructions

### 1. Generate Icons
1. Open `generate-icons.html` in a browser
2. Right-click each canvas and save as:
   - `icon-16.png`
   - `icon-48.png`
   - `icon-128.png`

### 2. Install the Extension
1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select this extension directory

### 3. Configure Azure OpenAI
1. Click the extension icon in Chrome toolbar
2. In the side panel, enter:
   - Your Azure OpenAI API key
   - Azure endpoint (e.g., `https://your-resource.openai.azure.com`)
   - Deployment name (your model deployment)
3. Click "Save Settings"

## Usage

1. Navigate to any webpage with text (e.g., Overleaf)
2. Click the extension icon to open the side panel
3. Highlight the text you want to edit
4. Type your instruction (e.g., "Can you improve this sentence?")
5. Click "Process Text"
6. The AI response will appear below
7. Click "Copy to Clipboard" to use the improved text

## Files Structure

- `manifest.json` - Extension configuration
- `sidepanel.html/css/js` - Side panel UI and logic
- `content.js` - Text selection handler
- `background.js` - Extension background service
- `icon-*.png` - Extension icons (generate these)