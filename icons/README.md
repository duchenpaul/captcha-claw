# Icons Directory

This directory should contain the extension icons:

- **icon16.png** - 16x16 pixels (for toolbar)
- **icon48.png** - 48x48 pixels (for extension management)
- **icon128.png** - 128x128 pixels (for Chrome Web Store)

## Creating Icons

You can create icons using:
1. Any image editor (Photoshop, GIMP, Figma, etc.)
2. Online icon generators
3. Export from vector graphics

### Design Suggestions

- Use a claw or eagle grabbing/solving a puzzle
- Keep it simple and recognizable at small sizes
- Use colors that match the extension theme (purple/blue gradients)
- Ensure good contrast against both light and dark backgrounds

### Quick Placeholder

For testing, you can create simple placeholder icons:

1. Create a 128x128 PNG with a solid color background
2. Add text "CC" (Captcha Claw) in the center
3. Resize to create 48x48 and 16x16 versions

### Tools

- **Online**: https://www.favicon-generator.org/
- **Vector**: Use Figma, Inkscape, or Adobe Illustrator
- **AI-Generated**: Use DALL-E, Midjourney, or similar

## Temporary Workaround

If you don't have icons ready, you can:
1. Comment out the "icons" section in manifest.json
2. Chrome will use a default icon
3. Add proper icons later

Note: The extension will work without custom icons, but they make it look more professional.
