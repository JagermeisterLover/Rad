# Optical Surface Testplate Analyzer

Desktop application for analyzing optical surface measurements using testplate interferometry.

## Overview

This Electron-based application calculates actual surface radii from testplate measurements by analyzing interferometric fringe patterns. It's designed for optical engineers working with spherical and aspheric surfaces.

## Features

- **Interactive Spreadsheet Interface**: Real-time calculation of surface parameters
- **Zemax Integration**: Import surface prescriptions directly from Zemax files
- **Automated Calculations**: 
  - Testplate sag calculation
  - Fringe-induced sag contribution
  - Actual surface radius and sag
- **PDF Report Generation**: Professional HTML/PDF reports of measurement results
- **Modern UI**: Clean, compact interface optimized for workflow efficiency

## Installation

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Setup

```bash
# Clone or extract the project
cd optical-testplate-analyzer

# Install dependencies
npm install

# Run the application
npm start

# Development mode (with DevTools)
npm run dev
```

### Building Executables

```bash
# Build for current platform
npm run build

# Executables will be in the 'dist' folder
```

## Usage

### Basic Workflow

1. **Set Wavelength**: Enter test wavelength in nm (default: 632.8 nm for HeNe)

2. **Enter Surface Data**:
   - Select surface type (Convex/Concave)
   - Enter diameter (clear aperture)
   - Enter testplate radius
   - Enter number of observed fringes

3. **View Results**: Calculated values update automatically:
   - Testplate sag
   - Fringe contribution (N×λ/2)
   - Actual radius
   - Actual sag

4. **Import from Zemax**: Click "Import from Zemax" to load surface data from prescription files

5. **Generate Report**: Click "Generate PDF Report" to create professional documentation

### Calculations

**Testplate Sag:**
```
z = R - √(R² - (D/2)²)
```

**Fringe Contribution:**
```
Δz = N × λ/2
```

**Actual Sag:**
- Convex: `z_actual = z_testplate + Δz`
- Concave: `z_actual = z_testplate - Δz`

**Actual Radius:**
```
R = (D²/4 + z²) / (2z)
```

### Sign Convention

- **Positive radius**: Convex surface (center of curvature to the right)
- **Negative radius**: Concave surface (center of curvature to the left)

## File Formats

### Zemax Import

Supports standard Zemax prescription files (.zmx, .txt) with surface definitions including:
- CURV (curvature)
- RADIUS
- DIAM / SDIA (diameter/semi-diameter)

### Project Files

Save/load project data as JSON files containing all measurement data and settings.

## Keyboard Shortcuts

- `Tab`: Navigate between cells
- `Enter`: Move to next row
- `Ctrl+S`: Save project (when implemented)
- `Ctrl+O`: Open project (when implemented)

## Technical Details

### Technologies
- Electron 28.x
- Vanilla JavaScript (no framework dependencies for renderer)
- Puppeteer (for PDF generation)
- PDF-lib (for PDF manipulation)

### Architecture
- **Main Process** (`main.js`): Window management, file I/O, IPC handlers
- **Renderer Process** (`src/`): UI and calculations
- **Preload Script** (`preload.js`): Secure IPC bridge

### Security
- Context isolation enabled
- Node integration disabled in renderer
- IPC communication through contextBridge

## Development

### Project Structure
```
optical-testplate-analyzer/
├── main.js                    # Electron main process
├── preload.js                 # IPC bridge
├── package.json               # Dependencies
├── src/
│   ├── index.html            # Main UI
│   ├── scripts/
│   │   ├── calculations.js   # Optical formulas
│   │   ├── zemax-parser.js   # File parsing
│   │   └── report-generator.js # PDF generation
│   └── assets/               # Icons and resources
└── reports/
    └── template.html         # Report template
```

### Adding Features

1. **New Calculation**: Add to `src/scripts/calculations.js`
2. **UI Changes**: Modify `src/index.html`
3. **File Handling**: Update `main.js` IPC handlers
4. **Report Format**: Edit `src/scripts/report-generator.js`

## Troubleshooting

### Common Issues

**App won't start**
- Ensure Node.js is installed
- Run `npm install` to install dependencies
- Check console for error messages

**Calculations incorrect**
- Verify input units (mm for dimensions, nm for wavelength)
- Check that diameter doesn't exceed valid aperture
- Ensure testplate radius is appropriate for surface

**Import fails**
- Verify Zemax file format
- Check that file contains surface definitions
- Try simple text format: `Surface# Radius Diameter`

## License

MIT License - see LICENSE file for details

## Author

Developed for optical metrology and quality control applications.

## Version History

### v1.0.0
- Initial release
- Basic testplate analysis functionality
- Zemax import
- PDF report generation
- Real-time calculations

## Future Enhancements

- [ ] Aspheric surface support
- [ ] Multiple wavelength analysis
- [ ] Statistical analysis of measurements
- [ ] Tolerance checking
- [ ] Database of standard testplates
- [ ] Measurement uncertainty calculations
- [ ] Export to Zemax format
