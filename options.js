// Options page script for Captcha Claw
import { ConfigManager } from "./config.js";

const configManager = new ConfigManager();

// DOM elements
const configJsonTextarea = document.getElementById("configJson");
const configUrlInput = document.getElementById("configUrl");
const saveBtn = document.getElementById("saveBtn");
const validateBtn = document.getElementById("validateBtn");
const loadBtn = document.getElementById("loadBtn");
const clearBtn = document.getElementById("clearBtn");
const saveUrlBtn = document.getElementById("saveUrlBtn");
const testUrlBtn = document.getElementById("testUrlBtn");
const clearUrlBtn = document.getElementById("clearUrlBtn");
const exportBtn = document.getElementById("exportBtn");
const importFile = document.getElementById("importFile");
const message = document.getElementById("message");
const urlMessage = document.getElementById("urlMessage");

// Load current configuration on page load
window.addEventListener("DOMContentLoaded", async () => {
  await loadCurrentConfig();
  await loadConfigUrl();
});

// Load current configuration
async function loadCurrentConfig() {
  try {
    const config = await configManager.getConfig();
    if (config) {
      configJsonTextarea.value = JSON.stringify(config, null, 2);
    } else {
      configJsonTextarea.placeholder = "No configuration found. Use the example below to get started.";
    }
  } catch (error) {
    showMessage("Error loading configuration: " + error.message, "error");
  }
}

// Load configuration URL
async function loadConfigUrl() {
  try {
    const url = await configManager.getConfigUrl();
    if (url) {
      configUrlInput.value = url;
    }
  } catch (error) {
    showUrlMessage("Error loading URL: " + error.message, "error");
  }
}

// Save configuration
saveBtn.addEventListener("click", async () => {
  try {
    const configText = configJsonTextarea.value.trim();

    if (!configText) {
      showMessage("Configuration cannot be empty", "error");
      return;
    }

    // Parse JSON
    let config;
    try {
      config = JSON.parse(configText);
    } catch (e) {
      showMessage("Invalid JSON format: " + e.message, "error");
      return;
    }

    // Validate configuration
    const validation = configManager.validateConfig(config);
    if (!validation.valid) {
      showMessage("Validation failed: " + validation.error, "error");
      return;
    }

    // Save configuration
    await configManager.saveConfig(config);
    showMessage("✓ Configuration saved successfully!", "success");
  } catch (error) {
    showMessage("Error saving configuration: " + error.message, "error");
  }
});

// Validate configuration
validateBtn.addEventListener("click", () => {
  try {
    const configText = configJsonTextarea.value.trim();

    if (!configText) {
      showMessage("Configuration is empty", "error");
      return;
    }

    // Parse JSON
    let config;
    try {
      config = JSON.parse(configText);
    } catch (e) {
      showMessage("Invalid JSON format: " + e.message, "error");
      return;
    }

    // Validate configuration
    const validation = configManager.validateConfig(config);
    if (!validation.valid) {
      showMessage("✗ Validation failed: " + validation.error, "error");
      return;
    }

    // Count providers and models
    const providerCount = Object.keys(config.providers).length;
    const modelCount = Object.values(config.providers).reduce((sum, p) => sum + (p.models?.length || 0), 0);

    showMessage(`✓ Configuration is valid! Found ${providerCount} provider(s) with ${modelCount} model(s).`, "success");
  } catch (error) {
    showMessage("Validation error: " + error.message, "error");
  }
});

// Load configuration
loadBtn.addEventListener("click", async () => {
  await loadCurrentConfig();
  showMessage("Configuration reloaded from storage", "info");
});

// Clear configuration
clearBtn.addEventListener("click", async () => {
  if (confirm("Are you sure you want to clear all configuration? This cannot be undone.")) {
    try {
      await configManager.clearConfig();
      configJsonTextarea.value = "";
      configUrlInput.value = "";
      showMessage("All configuration cleared", "info");
    } catch (error) {
      showMessage("Error clearing configuration: " + error.message, "error");
    }
  }
});

// Save configuration URL
saveUrlBtn.addEventListener("click", async () => {
  try {
    const url = configUrlInput.value.trim();
    await configManager.saveConfigUrl(url);
    showUrlMessage("✓ Configuration URL saved!", "success");
  } catch (error) {
    showUrlMessage("Error saving URL: " + error.message, "error");
  }
});

// Test and fetch from URL
testUrlBtn.addEventListener("click", async () => {
  try {
    const url = configUrlInput.value.trim();

    if (!url) {
      showUrlMessage("Please enter a URL", "error");
      return;
    }

    showUrlMessage("Fetching configuration...", "info");

    const config = await configManager.fetchConfigFromUrl(url);

    if (config) {
      // Validate the fetched config
      const validation = configManager.validateConfig(config);
      if (!validation.valid) {
        showUrlMessage("✗ Fetched configuration is invalid: " + validation.error, "error");
        return;
      }

      // Show the fetched config
      const providerCount = Object.keys(config.providers || {}).length;
      showUrlMessage(`✓ Successfully fetched configuration with ${providerCount} provider(s)!`, "success");

      // Optionally merge with local config
      if (confirm("Do you want to preview the fetched configuration?")) {
        configJsonTextarea.value = JSON.stringify(config, null, 2);
      }
    }
  } catch (error) {
    showUrlMessage("Error fetching from URL: " + error.message, "error");
  }
});

// Clear URL
clearUrlBtn.addEventListener("click", async () => {
  configUrlInput.value = "";
  await configManager.saveConfigUrl("");
  showUrlMessage("Configuration URL cleared", "info");
});

// Export configuration
exportBtn.addEventListener("click", async () => {
  try {
    const config = await configManager.exportConfig();
    const dataStr = JSON.stringify(config, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });

    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "captcha-claw-config.json";
    link.click();

    URL.revokeObjectURL(url);
    showMessage("✓ Configuration exported!", "success");
  } catch (error) {
    showMessage("Error exporting configuration: " + error.message, "error");
  }
});

// Import configuration
importFile.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  try {
    const text = await file.text();
    const config = JSON.parse(text);

    // Validate if it's a full export or just config
    if (config["captcha-claw-config"]) {
      // Full export
      await configManager.importConfig(config);
      showMessage("✓ Full configuration imported!", "success");
      await loadCurrentConfig();
      await loadConfigUrl();
    } else {
      // Just the config JSON
      const validation = configManager.validateConfig(config);
      if (!validation.valid) {
        showMessage("✗ Invalid configuration: " + validation.error, "error");
        return;
      }

      configJsonTextarea.value = JSON.stringify(config, null, 2);
      showMessage("Configuration loaded into editor. Click Save to apply.", "info");
    }
  } catch (error) {
    showMessage("Error importing configuration: " + error.message, "error");
  }

  // Reset file input
  importFile.value = "";
});

// Helper function to show messages
function showMessage(text, type) {
  message.textContent = text;
  message.className = `message ${type} show`;

  setTimeout(() => {
    message.classList.remove("show");
  }, 5000);
}

// Helper function to show URL messages
function showUrlMessage(text, type) {
  urlMessage.textContent = text;
  urlMessage.className = `message ${type} show`;

  setTimeout(() => {
    urlMessage.classList.remove("show");
  }, 5000);
}

// Load example config into Reference Schema section
fetch(chrome.runtime.getURL("config.example.json"))
  .then((r) => r.text())
  .then((text) => {
    document.getElementById("exampleConfigPre").textContent = text.trim();
  })
  .catch(() => {
    document.getElementById("exampleConfigPre").textContent = "Failed to load example config.";
  });
