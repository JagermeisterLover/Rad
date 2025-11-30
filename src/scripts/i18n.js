/**
 * Internationalization (i18n) Module
 * Handles language switching and text translation
 */

const I18n = {
    currentLocale: 'en',
    translations: {},
    observers: [],

    /**
     * Initialize i18n system
     */
    async init() {
        // Load saved locale from localStorage or default to English
        const savedLocale = localStorage.getItem('locale') || 'en';
        await this.loadLocale(savedLocale);
    },

    /**
     * Load locale translations
     * @param {string} locale - Locale code (en, ru)
     */
    async loadLocale(locale) {
        try {
            const translations = await window.electronAPI.loadLocale(locale);
            this.translations = translations;
            this.currentLocale = locale;
            localStorage.setItem('locale', locale);
            this.notifyObservers();
            return true;
        } catch (error) {
            console.error(`Failed to load locale ${locale}:`, error);
            return false;
        }
    },

    /**
     * Get translated text by key path
     * @param {string} keyPath - Dot-separated key path (e.g., "app.title")
     * @param {Object} params - Optional parameters for interpolation
     * @returns {string} Translated text
     */
    t(keyPath, params = {}) {
        const keys = keyPath.split('.');
        let value = this.translations;

        for (const key of keys) {
            if (value && typeof value === 'object') {
                value = value[key];
            } else {
                console.warn(`Translation key not found: ${keyPath}`);
                return keyPath;
            }
        }

        if (typeof value !== 'string') {
            console.warn(`Translation value is not a string: ${keyPath}`);
            return keyPath;
        }

        // Interpolate parameters
        return this.interpolate(value, params);
    },

    /**
     * Interpolate parameters into translation string
     * @param {string} text - Text with placeholders like {key}
     * @param {Object} params - Parameters to interpolate
     * @returns {string} Interpolated text
     */
    interpolate(text, params) {
        return text.replace(/\{(\w+)\}/g, (match, key) => {
            return params.hasOwnProperty(key) ? params[key] : match;
        });
    },

    /**
     * Get current locale code
     * @returns {string} Current locale code
     */
    getLocale() {
        return this.currentLocale;
    },

    /**
     * Switch to a different locale
     * @param {string} locale - New locale code
     */
    async switchLocale(locale) {
        if (locale !== this.currentLocale) {
            await this.loadLocale(locale);
        }
    },

    /**
     * Subscribe to locale changes
     * @param {Function} callback - Function to call when locale changes
     */
    onChange(callback) {
        this.observers.push(callback);
    },

    /**
     * Notify all observers of locale change
     */
    notifyObservers() {
        this.observers.forEach(callback => callback(this.currentLocale));
    },

    /**
     * Update all data-i18n elements in the DOM
     */
    updateDOM() {
        // Update elements with data-i18n attribute
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            element.textContent = this.t(key);
        });

        // Update elements with data-i18n-placeholder attribute
        document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
            const key = element.getAttribute('data-i18n-placeholder');
            element.placeholder = this.t(key);
        });

        // Update elements with data-i18n-title attribute
        document.querySelectorAll('[data-i18n-title]').forEach(element => {
            const key = element.getAttribute('data-i18n-title');
            element.title = this.t(key);
        });

        // Update document title
        document.title = this.t('app.title');

        // Update html lang attribute
        document.documentElement.lang = this.currentLocale;
    },

    /**
     * Get plural form for Russian language
     * Russian has complex plural rules: 1, 21, 31... use form 1; 2-4, 22-24... use form 2; others use form 3
     * @param {number} count - Number to determine plural form
     * @returns {string} Plural suffix for Russian
     */
    getRussianPlural(count) {
        const mod10 = count % 10;
        const mod100 = count % 100;

        if (mod10 === 1 && mod100 !== 11) {
            return 'ь'; // 1 поверхность
        } else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
            return 'и'; // 2-4 поверхности
        } else {
            return 'ей'; // 5+ поверхностей
        }
    },

    /**
     * Get plural form based on current locale
     * @param {number} count - Number to determine plural form
     * @returns {string} Plural indicator
     */
    getPlural(count) {
        if (this.currentLocale === 'ru') {
            return this.getRussianPlural(count);
        } else {
            // English: simple s/no s rule
            return count !== 1 ? 's' : '';
        }
    }
};

// Expose I18n globally
if (typeof window !== 'undefined') {
    window.I18n = I18n;
}

// Auto-initialize when DOM is ready
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        I18n.init().then(() => {
            I18n.updateDOM();
        });
    });
}
