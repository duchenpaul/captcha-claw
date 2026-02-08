// OpenAI API Handler for Captcha Claw
// Handles API calls to OpenAI-compatible endpoints

export class OpenAIHandler {
  constructor() {
    this.timeout = 30000; // 30 seconds timeout
  }

  // Solve captcha using OpenAI-compatible API
  async solveCaptcha(options) {
    const { imageData, baseUrl, apiKey, modelId, apiType } = options;

    if (!imageData || !baseUrl || !apiKey || !modelId) {
      throw new Error("Missing required parameters for API call for OpenAI-compatible API");
    }

    try {
      // Ensure image is encoded as base64 before sending to the API
      const base64Image = await this.ensureBase64(imageData);

      const result = await this.callOpenAIAPI({
        imageData: base64Image,
        baseUrl,
        apiKey,
        modelId,
        apiType,
      });

      return result;
    } catch (error) {
      console.error("API call failed:", error);
      throw error;
    }
  }

  // Ensure image data is in base64 data URL format
  async ensureBase64(imageData) {
    // Already a base64 data URL
    if (imageData.startsWith("data:image")) {
      return imageData;
    }

    // Already raw base64 (no URL prefix) — wrap it as a data URL
    if (/^[A-Za-z0-9+/=]+$/.test(imageData) && imageData.length > 100) {
      return `data:image/png;base64,${imageData}`;
    }

    // It's a URL (http/https/blob) — fetch and convert to base64
    try {
      const response = await fetch(imageData);
      const blob = await response.blob();
      return await this.blobToBase64(blob);
    } catch (error) {
      console.error("Failed to convert image to base64:", error);
      throw new Error("Failed to encode image as base64");
    }
  }

  // Convert a Blob to a base64 data URL
  blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  // Call OpenAI-compatible API
  async callOpenAIAPI(options) {
    const { imageData, baseUrl, apiKey, modelId, apiType } = options;

    // Prepare the endpoint based on API type
    let endpoint = baseUrl;
    if (apiType === "openai-completions" || apiType === "openai") {
      // Standard OpenAI chat completions endpoint
      if (!baseUrl.endsWith("/chat/completions")) {
        endpoint = `${baseUrl.replace(/\/$/, "")}/chat/completions`;
      }
    }

    // Extract base64 data from the image data URL
    // Always send as base64 text since not all OpenAI-compatible APIs support image_url
    let base64Data = imageData;
    if (imageData.startsWith("data:")) {
      // Remove the data URL prefix (e.g., "data:image/png;base64,")
      base64Data = imageData.split(",")[1] || imageData;
    }

    // Prepare the request body
    const requestBody = {
      model: modelId,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `The following is a base64-encoded image of a CAPTCHA. Please first decode the base64 string to get the image, then analyze the CAPTCHA and provide only the text or characters shown in the image. Return only the captcha text without any explanation or additional text.\n\nBase64 image data:\n${base64Data}`,
            },
          ],
        },
      ],
      max_tokens: 100,
      temperature: 0.1, // Low temperature for more deterministic output
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error?.message || errorData.message || `HTTP ${response.status}`;

        if (response.status === 429) {
          throw new Error(`Rate limit exceeded: ${errorMessage}`);
        }

        throw new Error(`API error: ${errorMessage}`);
      }

      const data = await response.json();

      // Extract the result from the response
      const result = this.extractResult(data);

      if (!result) {
        throw new Error("No valid response from API");
      }

      return result;
    } catch (error) {
      if (error.name === "AbortError") {
        throw new Error("API request timeout");
      }
      throw error;
    }
  }

  // Extract result from API response
  extractResult(data) {
    try {
      // OpenAI format
      if (data.choices && data.choices.length > 0) {
        const choice = data.choices[0];

        if (choice.message && choice.message.content) {
          return choice.message.content.trim();
        }

        if (choice.text) {
          return choice.text.trim();
        }
      }

      // Alternative formats
      if (data.result) {
        return data.result.trim();
      }

      if (data.text) {
        return data.text.trim();
      }

      return null;
    } catch (error) {
      console.error("Error extracting result:", error);
      return null;
    }
  }

  // Test API connection
  async testConnection(baseUrl, apiKey, modelId, apiType) {
    try {
      // Create a simple test image (1x1 white pixel)
      const testImage = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";

      const result = await this.solveCaptcha({
        imageData: testImage,
        baseUrl,
        apiKey,
        modelId,
        apiType: apiType || "openai-completions",
      });

      return {
        success: true,
        message: "Connection successful",
        result,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
}
