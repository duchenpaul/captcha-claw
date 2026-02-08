// Content script for Captcha Claw
// Handles image extraction and result display

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "extractImage") {
    extractImageData(request.imageUrl)
      .then((imageData) => {
        sendResponse({ imageData });
      })
      .catch((error) => {
        console.error("Error extracting image:", error);
        sendResponse({ error: error.message });
      });
    return true; // Keep the message channel open for async response
  } else if (request.action === "showResult") {
    showResultPopup(request.result, request.error);
    sendResponse({ success: true });
    return true;
  }
});

// Extract image data from the page without downloading again
async function extractImageData(imageUrl) {
  try {
    // Try to find the image element in the page
    const images = document.querySelectorAll("img");
    let targetImage = null;

    for (const img of images) {
      if (img.src === imageUrl || img.currentSrc === imageUrl) {
        targetImage = img;
        break;
      }
    }

    if (!targetImage) {
      throw new Error("Image element not found on page");
    }

    // Create a canvas to extract the image data
    const canvas = document.createElement("canvas");
    canvas.width = targetImage.naturalWidth || targetImage.width;
    canvas.height = targetImage.naturalHeight || targetImage.height;

    const ctx = canvas.getContext("2d");

    // Handle CORS issues by checking if we can read the image
    try {
      ctx.drawImage(targetImage, 0, 0);
      const imageData = canvas.toDataURL("image/png");
      return imageData;
    } catch (e) {
      // If CORS prevents reading, we need to fetch the image
      console.log("CORS prevented direct access, fetching image...");
      const response = await fetch(imageUrl);
      const blob = await response.blob();

      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    }
  } catch (error) {
    console.error("Error in extractImageData:", error);
    throw error;
  }
}

// Show result popup in bottom-right corner
function showResultPopup(result, error) {
  // Remove any existing popup
  const existingPopup = document.getElementById("captcha-claw-popup");
  if (existingPopup) {
    existingPopup.remove();
  }

  // Create popup container
  const popup = document.createElement("div");
  popup.id = "captcha-claw-popup";
  popup.className = "captcha-claw-popup";

  // Create popup content
  const content = document.createElement("div");
  content.className = "captcha-claw-content";

  if (error) {
    content.innerHTML = `
      <div class="captcha-claw-header error">
        <span class="captcha-claw-title">❌ Captcha Claw</span>
        <button class="captcha-claw-close" id="captcha-claw-close">×</button>
      </div>
      <div class="captcha-claw-body">
        <p class="captcha-claw-error">${escapeHtml(error)}</p>
        ${error.includes("configuration") ? '<button class="captcha-claw-config-btn" id="captcha-claw-config">Open Settings</button>' : ""}
      </div>
    `;
  } else {
    content.innerHTML = `
      <div class="captcha-claw-header success">
        <span class="captcha-claw-title">✓ Captcha Claw</span>
        <button class="captcha-claw-close" id="captcha-claw-close">×</button>
      </div>
      <div class="captcha-claw-body">
        <p class="captcha-claw-label">Captcha Solution:</p>
        <div class="captcha-claw-result" id="captcha-claw-result">${escapeHtml(result.text)}</div>
        <button class="captcha-claw-copy-btn" id="captcha-claw-copy">Click to Copy</button>
        ${result.provider ? `<p class="captcha-claw-meta">Provider: ${escapeHtml(result.provider)} / ${escapeHtml(result.model)}</p>` : ""}
      </div>
    `;
  }

  popup.appendChild(content);
  document.body.appendChild(popup);

  // Add event listeners
  const closeBtn = document.getElementById("captcha-claw-close");
  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      popup.classList.add("closing");
      setTimeout(() => popup.remove(), 300);
    });
  }

  const copyBtn = document.getElementById("captcha-claw-copy");
  if (copyBtn) {
    copyBtn.addEventListener("click", () => {
      const resultText = result.text;
      navigator.clipboard
        .writeText(resultText)
        .then(() => {
          copyBtn.textContent = "✓ Copied!";
          copyBtn.classList.add("copied");
          setTimeout(() => {
            copyBtn.textContent = "Click to Copy";
            copyBtn.classList.remove("copied");
          }, 2000);
        })
        .catch((err) => {
          console.error("Failed to copy:", err);
          copyBtn.textContent = "✗ Failed";
        });
    });
  }

  const configBtn = document.getElementById("captcha-claw-config");
  if (configBtn) {
    configBtn.addEventListener("click", () => {
      chrome.runtime.sendMessage({ action: "openOptions" });
    });
  }

  // Auto-close after 30 seconds
  setTimeout(() => {
    if (popup.parentNode) {
      popup.classList.add("closing");
      setTimeout(() => popup.remove(), 300);
    }
  }, 30000);

  // Animate in
  setTimeout(() => {
    popup.classList.add("visible");
  }, 10);
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
