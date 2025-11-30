# Localization Guide

This application supports multiple languages through a comprehensive localization system.

## Supported Languages

- **English (en)** - Default language
- **Russian (ru)** - Full translation

## User Guide

### Switching Languages

1. Open the application
2. In the top header, locate the **Language** dropdown selector
3. Select your preferred language:
   - `English` for English interface
   - `Русский` for Russian interface
4. The interface will immediately update to show all text in the selected language
5. Your language preference is saved and will be remembered for future sessions

### What Gets Localized

- **Application Interface**: All menus, buttons, labels, and tooltips
- **Data Table**: Column headers and row controls
- **Sidebar**: Tab names and controls
- **Context Menus**: Right-click menu options
- **Status Messages**: All feedback and error messages
- **PDF Reports**: Generated reports reflect the current language setting
- **Modal Dialogs**: Rename and confirmation dialogs

## Developer Guide

### Architecture

The localization system consists of:

1. **i18n.js** - Core localization module ([src/scripts/i18n.js](src/scripts/i18n.js))
2. **Locale Files** - JSON files containing translations ([src/locales/](src/locales/))
   - `en.json` - English translations
   - `ru.json` - Russian translations
3. **IPC Handlers** - Electron main process handlers ([main.js](main.js))
4. **Preload API** - Secure bridge to renderer ([preload.js](preload.js))

### File Structure

```
src/
├── locales/
│   ├── en.json          # English translations
│   └── ru.json          # Russian translations
├── scripts/
│   └── i18n.js          # Localization module
main.js                  # IPC handlers for loading locales
preload.js               # Exposed API for localization
```

### Adding a New Language

1. **Create Locale File**
   ```bash
   # Create new locale file (e.g., for German)
   cp src/locales/en.json src/locales/de.json
   ```

2. **Translate Strings**
   Edit `src/locales/de.json` and translate all values to German:
   ```json
   {
     "app": {
       "title": "Optischer Oberflächentestplatten-Analysator",
       ...
     }
   }
   ```

3. **Add to Language Selector**
   Update [src/index.html](src/index.html):
   ```html
   <select id="languageSelect">
       <option value="en">English</option>
       <option value="ru">Русский</option>
       <option value="de">Deutsch</option>  <!-- Add this -->
   </select>
   ```

4. **Update Locale Map** (if needed for date formatting)
   In [src/scripts/report-generator.js](src/scripts/report-generator.js):
   ```javascript
   const localeMap = {
       'en': 'en-US',
       'ru': 'ru-RU',
       'de': 'de-DE'  // Add this
   };
   ```

### Using Translations in Code

#### Static HTML Elements

Use `data-i18n` attributes:
```html
<h1 data-i18n="app.title">Optical Surface Testplate Analyzer</h1>
<button data-i18n="header.import">Import from Zemax</button>
```

For placeholders and titles:
```html
<input data-i18n-placeholder="bulkActions.placeholder" placeholder="e.g., 5">
<button data-i18n-title="sidebar.newTable" title="New Table">+</button>
```

#### Dynamic JavaScript Content

Use the `I18n.t()` function:
```javascript
// Simple translation
const title = I18n.t('app.title');

// Translation with parameters
const status = I18n.t('status.imported', {
    count: surfaces.length,
    name: fileName
});

// Using plural forms
const plural = I18n.getPlural(count);
const text = I18n.t('status.surfacesLoaded', {
    count: count,
    plural: plural
});
```

#### Updating DOM After Locale Change

When locale changes, call:
```javascript
I18n.updateDOM();  // Updates all data-i18n elements
```

For dynamic content, listen to locale changes:
```javascript
I18n.onChange((locale) => {
    // Update dynamic content
    updateMyDynamicContent();
});
```

### Translation Key Format

Translations use dot-separated keys:
```
section.subsection.key
```

Examples:
- `app.title` → Application title
- `table.type` → Table column header for "Type"
- `status.imported` → Status message for import completion
- `report.formula1Title` → Report formula title

### Interpolation

Translations support parameter interpolation using `{key}` syntax:

**Locale file:**
```json
{
  "status": {
    "imported": "Imported {count} surfaces from {name}"
  }
}
```

**Usage:**
```javascript
I18n.t('status.imported', { count: 5, name: 'lens1.zmx' });
// Result: "Imported 5 surfaces from lens1.zmx"
```

### Plural Forms

#### English
Simple s/no s rule:
```javascript
I18n.getPlural(1);  // Returns: ""
I18n.getPlural(5);  // Returns: "s"
```

#### Russian
Complex plural rules based on last digit:
```javascript
I18n.getPlural(1);   // Returns: "ь"  (поверхность)
I18n.getPlural(2);   // Returns: "и"  (поверхности)
I18n.getPlural(5);   // Returns: "ей" (поверхностей)
```

### PDF Report Localization

Reports are localized based on the current language when generated:

1. **Report data includes locale:**
   ```javascript
   const reportData = {
       wavelength: 550,
       surfaces: [...],
       locale: I18n.getLocale()  // Current locale
   };
   ```

2. **Report generator loads locale:**
   ```javascript
   const localeData = await window.electronAPI.loadLocale(locale);
   ```

3. **Template uses placeholders:**
   ```html
   <h1>{{TITLE}}</h1>
   <span>{{LABEL_DATE}}: {{DATE}}</span>
   ```

### Testing

Test localization by:

1. **Switch language in UI** and verify all visible text updates
2. **Create/rename tabs** to verify dynamic content uses correct locale
3. **Generate PDF report** in each language to verify report localization
4. **Import Zemax files** and verify status messages are localized
5. **Trigger error conditions** to verify error messages are localized

### Best Practices

1. **Always provide fallback text** in HTML for better UX before i18n loads
2. **Keep translation keys organized** by feature/section
3. **Use descriptive key names** (e.g., `table.diameter` not `td`)
4. **Test with both LTR and RTL** if adding RTL languages
5. **Keep translations consistent** across similar contexts
6. **Don't hardcode text** - always use translation keys
7. **Use parameters** for dynamic content instead of string concatenation

### Locale File Schema

Each locale file follows this structure:

```json
{
  "app": {
    "title": "Application name",
    "version": "Version string"
  },
  "header": {
    "wavelength": "Wavelength label",
    "import": "Import button",
    "export": "Export button"
  },
  "table": {
    "type": "Column headers...",
    ...
  },
  "status": {
    "messages": "Status messages with {params}",
    ...
  },
  "report": {
    "title": "PDF report strings",
    ...
  }
}
```

## Troubleshooting

### Language not switching
- Clear localStorage and reload: `localStorage.removeItem('locale')`
- Check browser console for i18n errors
- Verify locale file exists in `src/locales/`

### Missing translations
- Check if key exists in locale file
- Verify key path is correct (dot-separated)
- Look for typos in key names

### Dynamic content not updating
- Ensure `I18n.onChange()` callback is registered
- Call `I18n.updateDOM()` after locale change
- For dynamic rows, call `updateRowLocale(row)` function

## Future Enhancements

Potential improvements:
- Add more languages (French, German, Spanish, Chinese, Japanese)
- Implement RTL support for Arabic/Hebrew
- Add locale-specific number formatting
- Support pluralization for more complex languages
- Add translation validation tool
- Implement missing translation warnings in dev mode
