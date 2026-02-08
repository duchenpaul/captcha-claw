// Baidu OCR API Handler for Captcha Claw
// Handles Baidu OCR API calls with OAuth client_credentials token flow

export class BaiduOCRHandler {
  constructor() {
    this.timeout = 30000;
    // Cache for Baidu access tokens: { token, expiresAt }
    this.tokenCache = {};
  }

  // Solve captcha using Baidu OCR
  async solveCaptcha(options) {
    const { imageData, baseUrl, clientId, clientSecret } = options;

    if (!imageData || !baseUrl) {
      throw new Error("Missing required parameters for Baidu OCR call");
    }

    if (!clientId || !clientSecret) {
      throw new Error("Baidu OCR: missing clientId/clientSecret");
    }

    // Get access token via OAuth client_credentials flow
    const accessToken = await this.getAccessToken(clientId, clientSecret);

    // Build endpoint with access_token
    let endpoint = baseUrl.replace(/\/$/, "");
    if (!endpoint.includes("access_token")) {
      const separator = endpoint.includes("?") ? "&" : "?";
      endpoint = `${endpoint}${separator}access_token=${accessToken}`;
    }

    // Extract raw base64 data (without data URL prefix)
    let base64Data = imageData;
    if (imageData.startsWith("data:")) {
      base64Data = imageData.split(",")[1] || imageData;
    }

    // Baidu OCR expects form-urlencoded with base64 image
    const formBody = `image=${encodeURIComponent(base64Data)}`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formBody,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error_msg || errorData.error_description || `HTTP ${response.status}`;
        throw new Error(`Baidu OCR error: ${errorMessage}`);
      }

      const data = await response.json();

      // Check for Baidu API error
      if (data.error_code) {
        throw new Error(`Baidu OCR error ${data.error_code}: ${data.error_msg}`);
      }

      // Extract text from Baidu OCR response
      if (data.words_result && data.words_result.length > 0) {
        // Concatenate all recognized words
        const text = data.words_result.map((item) => item.words).join("");
        return text.trim();
      }

      throw new Error("No text recognized by Baidu OCR");
    } catch (error) {
      if (error.name === "AbortError") {
        throw new Error("Baidu OCR request timeout");
      }
      throw error;
    }
  }

  // Fetch access token via OAuth client_credentials flow
  async getAccessToken(clientId, clientSecret) {
    // Check cache first
    const cacheKey = `${clientId}:${clientSecret}`;
    const cached = this.tokenCache[cacheKey];
    if (cached && cached.expiresAt > Date.now()) {
      return cached.token;
    }

    const tokenUrl = `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${encodeURIComponent(clientId)}&client_secret=${encodeURIComponent(clientSecret)}`;

    try {
      const response = await fetch(tokenUrl, { method: "GET" });

      if (!response.ok) {
        throw new Error(`Baidu OAuth error: HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(`Baidu OAuth error: ${data.error_description || data.error}`);
      }

      const accessToken = data.access_token;
      const expiresIn = data.expires_in || 2592000; // default 30 days

      // Cache the token (expire 5 minutes early to be safe)
      this.tokenCache[cacheKey] = {
        token: accessToken,
        expiresAt: Date.now() + (expiresIn - 300) * 1000,
      };

      return accessToken;
    } catch (error) {
      console.error("Failed to get Baidu access token:", error);
      throw new Error(`Baidu OAuth failed: ${error.message}`);
    }
  }
}
