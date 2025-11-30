# Application Icons

Place your application icons in this directory:

- `icon.png` - For Linux builds (512x512 recommended)
- `icon.ico` - For Windows builds (256x256 recommended)
- `icon.icns` - For macOS builds

## Creating Icons

You can create icons from a single PNG image using online tools or:

### Using electron-icon-builder

```bash
npm install -g electron-icon-builder
electron-icon-builder --input=./icon-source.png --output=./src/assets
```

### Manual Creation

1. Create a 1024x1024 PNG image
2. Use online converters:
   - For .ico: https://convertico.com/
   - For .icns: https://cloudconvert.com/png-to-icns

## Default Behavior

If no icons are provided, Electron will use its default icon.
