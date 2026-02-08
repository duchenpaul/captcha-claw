I would like to create chome extension that help user to solve captcha. The extension will use openai api/ollama API as engine to solve the captcha.

Principle:
1. Use will right click on the captcha image and select "Solve captcha with captcha-claw" from the context menu, which will pass the image element to the extension.
2. The extension will locate the captcha image from the resource, don't download the image again, as this will may cause the captcha to be invalid.
3. Not all OpenAI API supports multimodal, The extension will convert the image to a base64-encoded string if it is not already in that format.
4. The extension will send the image (base64 encoded) to openai api and get the result, then show the result to user as a popup window from right bottom corner, and user can click the result to copy it to clipboard.

Requirements:
- The openapi config should be configurable in the extension options page.
- The extension should also support multiple openapi keys, so user can switch between different keys when one key is rate limited.
- The config should also be able to fetch from url, so user can host the config on their own server and update the config without need to update the extension.
