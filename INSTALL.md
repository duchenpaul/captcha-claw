# Quick Installation Guide

Follow these steps to install and use Captcha Claw:

## 1. Prepare the Extension

Make sure you have all the necessary files in the `captcha-claw` directory.

## 2. Create Icons (Optional but Recommended)

The extension needs icons in the `icons/` directory:
- icon16.png (16x16 pixels)
- icon48.png (48x48 pixels)
- icon128.png (128x128 pixels)

**Quick Solution:** You can temporarily comment out the "icons" section in `manifest.json` if you don't have icons ready. Chrome will use default icons.

## 3. Load in Chrome

1. Open Chrome and go to: `chrome://extensions/`
2. Enable **"Developer mode"** (toggle in top-right corner)
3. Click **"Load unpacked"**
4. Select the `captcha-claw` folder
5. The extension should now be installed!

## 4. Configure API Settings

1. Click the extension icon in Chrome toolbar, or
2. Go to `chrome://extensions/`, find "Captcha Claw", and click "Options"
3. Copy the example configuration from `config.example.json`
4. Replace the placeholder API keys with your actual keys
5. Paste into the configuration textarea
6. Click **"Validate"** to check for errors
7. Click **"Save Configuration"**

### Minimum Configuration

You need at least one provider configured:

```json
{
  "mode": "merge",
  "providers": {
    "openai": {
      "baseUrl": "https://api.openai.com/v1",
      "apiKey": "sk-your-actual-api-key",
      "api": "openai-completions",
      "models": [
        {
          "id": "gpt-4o",
          "name": "GPT-4o",
          "input": ["text", "image"],
          "contextWindow": 128000,
          "maxTokens": 4096
        }
      ]
    }
  }
}
```

## 5. Test It Out

1. Navigate to any website with a CAPTCHA image
2. **Right-click** on the CAPTCHA image
3. Select **"Solve captcha with captcha-claw"**
4. Wait a few seconds for the result
5. A popup will appear in the bottom-right corner
6. **Click the result** to copy it to clipboard
7. Paste into the CAPTCHA input field

## Troubleshooting

### Extension doesn't load
- Check that all required files are present
- Try reloading the extension from `chrome://extensions/`
- Check console for errors (click "Errors" button in extension card)

### "No API configuration found" error
- Open extension options
- Add valid configuration with at least one provider
- Click "Validate" then "Save Configuration"

### Context menu doesn't appear
- Make sure you're right-clicking on an actual image element
- Try reloading the webpage
- Check if extension is enabled in `chrome://extensions/`

### API errors
- Verify your API key is correct and active
- Check that the API endpoint URL is correct
- Ensure your API account has sufficient credits
- Check browser console for detailed error messages

## Getting API Keys

### OpenAI
1. Go to: https://platform.openai.com/
2. Sign up or log in
3. Navigate to API Keys section
4. Create a new API key
5. Copy and use in configuration

### Other Providers
Check the provider's documentation for API key generation instructions.

## Advanced Features

### Multiple Providers
Add multiple providers for automatic failover when rate limited:
- Extension tries each provider in order
- Automatically switches on rate limit or failure
- Shows which provider solved the CAPTCHA

### Remote Configuration
1. Host your config JSON on a server
2. Enter the URL in "Remote Configuration URL" field
3. Click "Test & Fetch"
4. Click "Save URL"
5. Extension will fetch and merge with local config

### Import/Export
- **Export**: Save your configuration to a JSON file
- **Import**: Load configuration from a JSON file
- Useful for backup and sharing between machines

## Security Notes

- API keys are stored securely in Chrome sync storage
- Keys are only sent to the configured API endpoints
- No data is collected or sent to third parties
- All processing happens locally or through your chosen API

## Need Help?

Check the main README.md for detailed documentation and troubleshooting.
