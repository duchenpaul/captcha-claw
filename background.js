// Background service worker for Captcha Claw
import { ConfigManager } from "./config.js";
import { OpenAIHandler } from "./api.js";
import { OllamaHandler } from "./api-ollama.js";
import { BaiduOCRHandler } from "./api-baidu.js";

const configManager = new ConfigManager();
const openaiHandler = new OpenAIHandler();
const ollamaHandler = new OllamaHandler();
const baiduHandler = new BaiduOCRHandler();

// Create context menu on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "solveCaptcha",
    title: "Solve captcha with captcha-claw",
    contexts: ["image"],
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "solveCaptcha") {
    try {
      // Get the image URL from the context menu
      const imageUrl = info.srcUrl;

      // Send message to content script to get the image data
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: "extractImage",
        imageUrl: imageUrl,
      });

      if (response.error) {
        throw new Error(response.error);
      }

      // Get configuration
      const config = await configManager.getConfig();

      if (!config || !config.providers || Object.keys(config.providers).length === 0) {
        chrome.tabs.sendMessage(tab.id, {
          action: "showResult",
          error: "No API configuration found. Please configure in extension options.",
        });
        return;
      }

      // Try to solve captcha with available providers
      const result = await solveCaptcha(response.imageData, config);

      // Send result back to content script
      chrome.tabs.sendMessage(tab.id, {
        action: "showResult",
        result: result,
      });
    } catch (error) {
      console.error("Error solving captcha:", error);
      chrome.tabs.sendMessage(tab.id, {
        action: "showResult",
        error: error.message || "Failed to solve captcha",
      });
    }
  }
});

// Function to solve captcha with retry logic for multiple providers
async function solveCaptcha(imageData, config) {
  const providers = Object.entries(config.providers);
  let lastError = null;

  // Ensure image is base64 before passing to any handler
  const base64Image = await openaiHandler.ensureBase64(imageData);

  // Try each provider
  for (const [providerName, providerConfig] of providers) {
    const apiType = providerConfig.api || "openai-completions";

    // Baidu OCR — call directly, no models loop
    if (apiType === "baidu-ocr") {
      try {
        console.log(`Trying provider: ${providerName} (Baidu OCR)`);
        const result = await baiduHandler.solveCaptcha({
          imageData: base64Image,
          baseUrl: providerConfig.baseUrl,
          clientId: providerConfig.clientId,
          clientSecret: providerConfig.clientSecret,
        });
        if (result) {
          return { text: result, provider: providerName, model: "Baidu OCR" };
        }
      } catch (error) {
        console.error(`Failed with provider ${providerName}:`, error);
        lastError = error;
        continue;
      }
    } else {
      // OpenAI-compatible and Ollama — try each model
      const handler = apiType === "ollama" ? ollamaHandler : openaiHandler;
      for (const model of providerConfig.models || []) {
        try {
          console.log(`Trying provider: ${providerName}, model: ${model.id}`);
          const result = await handler.solveCaptcha({
            imageData: base64Image,
            baseUrl: providerConfig.baseUrl,
            apiKey: providerConfig.apiKey,
            modelId: model.id,
            apiType,
          });
          if (result) {
            return { text: result, provider: providerName, model: model.id };
          }
        } catch (error) {
          console.error(`Failed with provider ${providerName}, model ${model.id}:`, error);
          lastError = error;
          continue;
        }
      }
    }
  }

  // All providers failed
  throw new Error(lastError?.message || "All API providers failed");
}

// Handle messages from content script or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "openOptions") {
    chrome.runtime.openOptionsPage();
    sendResponse({ success: true });
  }
  return true;
});

// Listen for extension icon click
chrome.action.onClicked.addListener(() => {
  chrome.runtime.openOptionsPage();
});
