# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Optical Surface Testplate Analyzer** is an Electron desktop application for analyzing optical surface measurements using testplate interferometry. It calculates actual surface radii from testplate measurements by analyzing interferometric fringe patterns.

### Core Technologies
- **Electron 28.x**: Desktop application framework
- **Vanilla JavaScript**: No framework dependencies in renderer process
- **Puppeteer**: PDF generation via headless browser
- **PDF-lib**: PDF manipulation

## Development Commands

### Running the Application
```bash
# Standard mode
npm start

# Development mode with DevTools and logging
npm run dev
```

### Building Executables
```bash
# Build for current platform (output in dist/)
npm run build

# Platform-specific builds
npm run build:win    # Windows (NSIS installer)
npm run build:mac    # macOS (.dmg)
npm run build:linux  # Linux (AppImage)
```

### Installation
```bash
npm install
```

## Architecture

### Electron Process Model

**Main Process** ([main.js](main.js)):
- Window lifecycle management
- File I/O operations (read/write JSON, Zemax files)
- IPC handlers for renderer communication
- Autosave file system operations in `%APPDATA%/optical-testplate-analyzer/tables/`

**Renderer Process** ([src/index.html](src/index.html)):
- User interface with spreadsheet-like table
- Real-time optical calculations
- Tab management system with folders
- Autosave with 1-second debounce

**Preload Script** ([preload.js](preload.js)):
- Secure IPC bridge using `contextBridge`
- Exposes safe API methods to renderer without node integration
- Security: context isolation enabled, node integration disabled

### Core Modules

**[src/scripts/calculations.js](src/scripts/calculations.js)** - Optical formulas:
- `calculateTestplateSag(radius, diameter)`: Sag calculation z = R - √(R² - (D/2)²)
- `calculateFringeSag(fringes, wavelength)`: Fringe contribution Δz = N × λ/2
- `calculateActualSag(type, testplateSag, fringeSag)`: Convex adds, Concave subtracts
- `calculateActualRadius(type, diameter, sag)`: R = (D²/4 + z²) / (2z) with sign convention

**[src/scripts/zemax-parser.js](src/scripts/zemax-parser.js)** - Import functionality:
- Parses standard Zemax .zmx files (SURF, CURV, DIAM, GLAS)
- Extracts curvature (converts to radius: R = 1/CURV)
- Handles semi-diameter (DIAM × 2 = full diameter)
- Auto-determines surface type (Convex/Concave) based on radius sign and material presence
- Skips SURF 0 (object) and last SURF (image)
- Supports UTF-8 and Latin-1 encoding fallback
- Also parses simple text formats: "Name Radius Diameter" or "Radius,Diameter"

**[src/scripts/report-generator.js](src/scripts/report-generator.js)** - PDF export:
- Uses Puppeteer to render HTML template as PDF
- Reads template from [reports/template.html](reports/template.html)
- Generates professional measurement reports

**[src/scripts/tab-manager.js](src/scripts/tab-manager.js)** - Multi-tab system:
- Manages multiple radius tables in separate tabs
- Folder organization with expand/collapse
- Context menus for rename, duplicate, delete, move
- Multi-selection (Ctrl+Click) for batch operations
- Autosave integration

### Data Persistence

**Autosave System** (1-second debounce):
- Each tab stored as individual JSON file: `tab-{timestamp}.json`
- Folder structure in `_structure.json`
- Storage location:
  - Windows: `%APPDATA%/optical-testplate-analyzer/tables/`
  - macOS: `~/Library/Application Support/optical-testplate-analyzer/tables/`
  - Linux: `~/.config/optical-testplate-analyzer/tables/`

**Tab File Format**:
```json
{
  "id": "tab-1701234567890",
  "name": "lens1",
  "wavelength": 550,
  "surfaces": [
    {
      "type": "Convex",
      "material": "N-BK7",
      "diameter": 30.0,
      "rTestplate": 33.0,
      "sagTestplate": 0.123456,
      "fringes": 5,
      "sagAdded": 0.001375,
      "rActual": 33.034,
      "sagActual": 0.124831
    }
  ],
  "created": "2025-11-30T10:30:45.123Z",
  "modified": "2025-11-30T11:15:22.456Z"
}
```

### IPC Communication

All renderer-to-main communication uses IPC handlers exposed through preload:

```javascript
// File dialogs
electronAPI.openFile()              // Select Zemax import file
electronAPI.savePDF(pdfData)        // Save PDF report

// File system (autosave)
electronAPI.saveTab(tabId, data)    // Save individual tab
electronAPI.loadTab(tabId)          // Load tab by ID
electronAPI.deleteTab(tabId)        // Delete tab file
electronAPI.listTabs()              // List all saved tabs
electronAPI.saveStructure(struct)   // Save folder organization
electronAPI.loadStructure()         // Load folder organization
electronAPI.readTemplate()          // Read PDF report template
```

## Optical Calculations

### Sign Convention
- **Positive radius**: Convex surface (center of curvature to the right)
- **Negative radius**: Concave surface (center of curvature to the left)

### Surface Type Auto-Detection (Zemax Import)
- **With material** (glass): Positive R → Convex, Negative R → Concave
- **Without material** (air gap): Positive R → Concave, Negative R → Convex

### Units
- All dimensions: millimeters (mm)
- Wavelength: nanometers (nm)
- Default wavelength: 550 nm (standard visible light)

## UI Features

### Spreadsheet Interface
- **Enter key navigation**: Moves to next row in same column, auto-creates new row if at end
- **Tab navigation**: Moves between editable fields (skips calculated fields)
- **Bulk fringe setting**: "Apply to All" button sets same fringe count across all surfaces

### Visual Indicators
- **Calculated columns**: Light blue background (#e8f4fd) with chart icon (📊)
- **Convex rows**: Yellow background (#fff3cd) with orange left border (#ffc107)
- **Concave rows**: Light cyan background (#d1ecf1) with cyan left border (#17a2b8)
- **Number inputs**: Spinners disabled for cleaner appearance

### Tab System
- Left sidebar (250px width) shows all tabs and folders
- Context menus (right-click) for rename, duplicate, move, delete
- Multi-selection with Ctrl+Click for batch operations
- Tab states: Normal (white), Selected (light blue), Active (dark blue)

## Common Development Tasks

### Adding New Calculation
1. Add formula function to [src/scripts/calculations.js](src/scripts/calculations.js)
2. Update UI in [src/index.html](src/index.html) if new column needed
3. Call calculation in renderer's update logic
4. Update report template if needed: [reports/template.html](reports/template.html)

### Modifying Zemax Parser
1. Edit parsing logic in [src/scripts/zemax-parser.js](src/scripts/zemax-parser.js)
2. Test with sample files: [example.zmx](example.zmx), [sample-zemax.txt](sample-zemax.txt)
3. Verify surface type auto-detection logic
4. Check encoding fallback (UTF-8 → Latin-1)

### Adding IPC Handler
1. Add handler in [main.js](main.js): `ipcMain.handle('namespace:action', async (event, args) => {...})`
2. Expose in [preload.js](preload.js): Add to `electronAPI` object
3. Call from renderer: `await window.electronAPI.namespace.action(args)`
4. Maintain security: never expose full `ipcRenderer` or Node APIs

### Modifying Autosave Behavior
1. Autosave debounce timing: Look for 1000ms timeout in renderer
2. File operations: IPC handlers in [main.js](main.js) (fs:saveTab, fs:loadTab, etc.)
3. Tab data structure: Ensure consistency with JSON format above
4. Folder structure: Modify `_structure.json` format if needed

## Localization

The application supports multiple languages (English and Russian) through a comprehensive i18n system:

**Core Files:**
- **[src/scripts/i18n.js](src/scripts/i18n.js)** - Localization module with translation functions
- **[src/locales/en.json](src/locales/en.json)** - English translations
- **[src/locales/ru.json](src/locales/ru.json)** - Russian translations

**Usage:**
- UI elements use `data-i18n` attributes for automatic translation
- Dynamic content uses `I18n.t('key.path')` function
- Language switcher in header allows real-time language switching
- Locale preference saved in localStorage
- PDF reports generated in current language

**Key Functions:**
- `I18n.t(keyPath, params)` - Get translated text with optional parameters
- `I18n.getPlural(count)` - Get plural form based on count and locale
- `I18n.switchLocale(locale)` - Switch to different language
- `I18n.updateDOM()` - Update all data-i18n elements

**IPC Handlers:**
- `i18n:loadLocale` - Load locale JSON from file system
- `i18n:getAvailableLocales` - Get list of available language codes

See [LOCALIZATION.md](LOCALIZATION.md) for complete localization guide including how to add new languages.

## Important Notes

### Security Model
- Context isolation is **enabled**
- Node integration in renderer is **disabled**
- All Node.js operations must go through IPC handlers in main process
- Never expose `require` or Node APIs to renderer

### File Handling
- **Zemax files**: Try UTF-8 first, fallback to Latin-1 for ANSI files
- **Autosave**: Individual JSON files per tab, not one large project file
- **PDF generation**: Uses Puppeteer in main process (requires `sandbox: false` in webPreferences)

### Calculation Validation
- Returns 0 if diameter exceeds valid aperture (r² < d²)
- Wavelength converted from nm to mm: `λ_mm = λ_nm / 1,000,000`
- Testplate radius is always absolute value in sag calculation

### UI Constraints
- Cannot delete the last remaining tab
- Cannot tab into calculated (read-only) fields
- Material field is optional and informational only (not used in calculations)

## Reference Documentation

Key documentation files in the repository:
- [README.md](README.md) - Full feature documentation
- [QUICK_START.md](QUICK_START.md) - User quick reference
- [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) - File organization
- [ZEMAX_IMPORT_GUIDE.md](ZEMAX_IMPORT_GUIDE.md) - Zemax parsing specifications
- [TAB_SYSTEM_GUIDE.md](TAB_SYSTEM_GUIDE.md) - Tab and folder management
- [AUTOSAVE_SYSTEM_GUIDE.md](AUTOSAVE_SYSTEM_GUIDE.md) - Autosave implementation details
- [UI_IMPROVEMENTS.md](UI_IMPROVEMENTS.md) - UI feature summary
- [LOCALIZATION.md](LOCALIZATION.md) - Localization system guide

## Platform-Specific Notes

### Windows
- Uses NSIS installer
- Icon: [src/assets/icon.ico](src/assets/icon.ico)
- App data: `%APPDATA%/optical-testplate-analyzer/`

### macOS
- Uses DMG installer
- Icon: [src/assets/icon.icns](src/assets/icon.icns)
- App data: `~/Library/Application Support/optical-testplate-analyzer/`

### Linux
- Uses AppImage
- Icon: [src/assets/icon.png](src/assets/icon.png)
- App data: `~/.config/optical-testplate-analyzer/`
- Puppeteer may require additional dependencies (chromium libraries)
