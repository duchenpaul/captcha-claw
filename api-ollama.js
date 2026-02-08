// Ollama API Handler for Captcha Claw
// Handles API calls to local Ollama instances

export class OllamaHandler {
  constructor() {
    this.timeout = 30000;
  }

  // Solve captcha using Ollama vision model
  async solveCaptcha(options) {
    const { imageData, baseUrl, modelId } = options;

    if (!imageData || !baseUrl || !modelId) {
      throw new Error("Missing required parameters for Ollama API call");
    }

    // Ollama uses /api/chat endpoint
    let endpoint = baseUrl.replace(/\/$/, "");
    if (!endpoint.endsWith("/api/chat")) {
      endpoint = `${endpoint}/api/chat`;
    }

    // Extract raw base64 data (without data URL prefix)
    let base64Data = imageData;
    if (imageData.startsWith("data:")) {
      base64Data = imageData.split(",")[1] || imageData;
    }

    const requestBody = {
      model: modelId,
      messages: [
        {
          role: "user",
          content: `The following is a base64-encoded image of a CAPTCHA. Please first decode the base64 string to get the image, then analyze the CAPTCHA and provide only the text or characters shown in the image. Return only the captcha text without any explanation or additional text.\n\nBase64 image data:\n${base64Data}`,
          images: [base64Data],
        },
      ],
      stream: false,
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || `HTTP ${response.status}`;
        throw new Error(`Ollama API error: ${errorMessage}`);
      }

      const data = await response.json();

      // Ollama chat response format
      if (data.message && data.message.content) {
        return data.message.content.trim();
      }

      // Ollama generate response format
      if (data.response) {
        return data.response.trim();
      }

      throw new Error("No valid response from Ollama API");
    } catch (error) {
      if (error.name === "AbortError") {
        throw new Error("Ollama API request timeout");
      }
      throw error;
    }
  }
}
