// Configuration Manager for Captcha Claw
// Handles local and remote configuration storage

export class ConfigManager {
  constructor() {
    this.storageKey = "captcha-claw-config";
    this.urlKey = "captcha-claw-config-url";
  }

  // Get the configuration (merges local and remote if needed)
  async getConfig() {
    try {
      const stored = await chrome.storage.sync.get([this.storageKey, this.urlKey]);
      let localConfig = stored[this.storageKey] || null;
      const configUrl = stored[this.urlKey];

      // If URL is provided, fetch and merge with local config
      if (configUrl) {
        try {
          const remoteConfig = await this.fetchConfigFromUrl(configUrl);
          if (remoteConfig) {
            localConfig = this.mergeConfigs(localConfig, remoteConfig);
          }
        } catch (error) {
          console.error("Failed to fetch remote config:", error);
          // Continue with local config
        }
      }

      return localConfig;
    } catch (error) {
      console.error("Error getting config:", error);
      return null;
    }
  }

  // Save configuration locally
  async saveConfig(config) {
    try {
      await chrome.storage.sync.set({
        [this.storageKey]: config,
      });
      return true;
    } catch (error) {
      console.error("Error saving config:", error);
      throw error;
    }
  }

  // Save configuration URL
  async saveConfigUrl(url) {
    try {
      await chrome.storage.sync.set({
        [this.urlKey]: url,
      });
      return true;
    } catch (error) {
      console.error("Error saving config URL:", error);
      throw error;
    }
  }

  // Get configuration URL
  async getConfigUrl() {
    try {
      const stored = await chrome.storage.sync.get([this.urlKey]);
      return stored[this.urlKey] || "";
    } catch (error) {
      console.error("Error getting config URL:", error);
      return "";
    }
  }

  // Fetch configuration from URL
  async fetchConfigFromUrl(url) {
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const config = await response.json();
      return config;
    } catch (error) {
      console.error("Error fetching config from URL:", error);
      throw error;
    }
  }

  // Merge local and remote configurations
  mergeConfigs(localConfig, remoteConfig) {
    if (!localConfig) return remoteConfig;
    if (!remoteConfig) return localConfig;

    const mode = remoteConfig.mode || "merge";

    if (mode === "replace") {
      // Replace local with remote
      return remoteConfig;
    } else if (mode === "merge") {
      // Merge configurations
      return {
        ...localConfig,
        ...remoteConfig,
        providers: {
          ...localConfig.providers,
          ...remoteConfig.providers,
        },
      };
    }

    return localConfig;
  }

  // Validate configuration structure
  validateConfig(config) {
    if (!config) {
      return { valid: false, error: "Config is empty" };
    }

    if (!config.providers || typeof config.providers !== "object") {
      return { valid: false, error: "Config must have a providers object" };
    }

    const providers = Object.entries(config.providers);
    if (providers.length === 0) {
      return { valid: false, error: "At least one provider must be configured" };
    }

    // Validate each provider
    for (const [name, provider] of providers) {
      if (!provider.baseUrl) {
        return { valid: false, error: `Provider "${name}" missing baseUrl` };
      }

      const apiType = provider.api || "openai-completions";

      // Baidu OCR uses clientId/clientSecret (OAuth)
      if (apiType === "baidu-ocr") {
        if (!provider.clientId || !provider.clientSecret) {
          return { valid: false, error: `Provider "${name}" (Baidu OCR) requires clientId and clientSecret` };
        }
        // Baidu OCR doesn't require models array — skip model validation
        continue;
      }

      // Ollama doesn't require an API key
      if (apiType !== "ollama" && !provider.apiKey) {
        return { valid: false, error: `Provider "${name}" missing apiKey` };
      }

      if (!provider.models || !Array.isArray(provider.models) || provider.models.length === 0) {
        return { valid: false, error: `Provider "${name}" must have at least one model` };
      }

      // Validate models
      for (const model of provider.models) {
        if (!model.id) {
          return { valid: false, error: `Model in provider "${name}" missing id` };
        }
      }
    }

    return { valid: true };
  }

  // Export configuration
  async exportConfig() {
    const config = await chrome.storage.sync.get([this.storageKey, this.urlKey]);
    return config;
  }

  // Import configuration
  async importConfig(config) {
    await chrome.storage.sync.set(config);
  }

  // Clear all configuration
  async clearConfig() {
    await chrome.storage.sync.remove([this.storageKey, this.urlKey]);
  }
}
