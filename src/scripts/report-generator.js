/**
 * PDF Report Generator
 * Uses HTML to PDF conversion for professional reports
 */

const ReportGenerator = {
    /**
     * Generate PDF report from measurement data
     *
     * @param {object} data - Report data
     * @returns {Promise<string>} HTML content
     */
    async generate(data) {
        // Generate HTML report
        const html = await this.generateHTML(data);

        return html;
    },

    /**
     * Generate HTML report
     *
     * @param {object} data - Report data
     * @returns {Promise<string>} HTML content
     */
    async generateHTML(data) {
        const template = await window.electronAPI.readTemplate();

        // Get locale for date formatting
        const locale = data.locale || 'en';
        const localeMap = { 'en': 'en-US', 'ru': 'ru-RU' };
        const dateLocale = localeMap[locale] || 'en-US';

        // Load locale data for report
        const localeData = await window.electronAPI.loadLocale(locale);
        const t = (key) => {
            const keys = key.split('.');
            let value = localeData;
            for (const k of keys) {
                value = value[k];
                if (!value) return key;
            }
            return value;
        };

        // Format timestamp
        const date = new Date(data.timestamp);
        const formattedDate = date.toLocaleString(dateLocale, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        // Generate table rows
        const tableRows = data.surfaces.map((surface, index) => {
            return `
                <tr>
                    <td>${index + 1}</td>
                    <td>${surface.type}</td>
                    <td>${surface.material || '-'}</td>
                    <td>${surface.diameter.toFixed(3)}</td>
                    <td>${surface.rTestplate.toFixed(3)}</td>
                    <td>${surface.sagTestplate.toFixed(6)}</td>
                    <td>${surface.fringes.toFixed(1)}</td>
                    <td>${surface.sagAdded.toFixed(6)}</td>
                    <td>${surface.rActual.toFixed(3)}</td>
                    <td>${surface.sagActual.toFixed(6)}</td>
                </tr>
            `;
        }).join('');

        // Replace template variables
        let html = template
            .replace(/\{\{LOCALE\}\}/g, locale)
            .replace(/\{\{TITLE\}\}/g, t('report.title'))
            .replace(/\{\{SUBTITLE\}\}/g, t('report.subtitle'))
            .replace(/\{\{LABEL_DATE\}\}/g, t('report.labelDate'))
            .replace(/\{\{DATE\}\}/g, formattedDate)
            .replace(/\{\{LABEL_WAVELENGTH\}\}/g, t('report.labelWavelength'))
            .replace(/\{\{WAVELENGTH\}\}/g, data.wavelength.toFixed(1))
            .replace(/\{\{UNIT_NM\}\}/g, t('report.unitNm'))
            .replace(/\{\{LABEL_SURFACE_COUNT\}\}/g, t('report.labelSurfaceCount'))
            .replace(/\{\{SURFACE_COUNT\}\}/g, data.surfaces.length)
            .replace(/\{\{SECTION_RESULTS\}\}/g, t('report.sectionResults'))
            .replace(/\{\{TH_TYPE\}\}/g, t('report.thType'))
            .replace(/\{\{TH_MATERIAL\}\}/g, t('report.thMaterial'))
            .replace(/\{\{TH_DIAMETER\}\}/g, t('report.thDiameter'))
            .replace(/\{\{UNIT_MM\}\}/g, t('report.unitMm'))
            .replace(/\{\{TH_R_TESTPLATE\}\}/g, t('report.thRTestplate'))
            .replace(/\{\{TH_SAG_TESTPLATE\}\}/g, t('report.thSagTestplate'))
            .replace(/\{\{TH_FRINGES\}\}/g, t('report.thFringes'))
            .replace(/\{\{TH_SAG_ADDED\}\}/g, t('report.thSagAdded'))
            .replace(/\{\{TH_R_ACTUAL\}\}/g, t('report.thRActual'))
            .replace(/\{\{TH_SAG_ACTUAL\}\}/g, t('report.thSagActual'))
            .replace(/\{\{TABLE_ROWS\}\}/g, tableRows)
            .replace(/\{\{SECTION_FORMULAS\}\}/g, t('report.sectionFormulas'))
            .replace(/\{\{FORMULA_1_TITLE\}\}/g, t('report.formula1Title'))
            .replace(/\{\{FORMULA_2_TITLE\}\}/g, t('report.formula2Title'))
            .replace(/\{\{FORMULA_3_TITLE\}\}/g, t('report.formula3Title'))
            .replace(/\{\{FORMULA_3_CONVEX\}\}/g, t('report.formula3Convex'))
            .replace(/\{\{FORMULA_3_CONCAVE\}\}/g, t('report.formula3Concave'))
            .replace(/\{\{FORMULA_4_TITLE\}\}/g, t('report.formula4Title'))
            .replace(/\{\{SIGN_CONVENTION_TITLE\}\}/g, t('report.signConventionTitle'))
            .replace(/\{\{SIGN_POSITIVE\}\}/g, t('report.signPositive'))
            .replace(/\{\{SIGN_POSITIVE_DESC\}\}/g, t('report.signPositiveDesc'))
            .replace(/\{\{SIGN_NEGATIVE\}\}/g, t('report.signNegative'))
            .replace(/\{\{SIGN_NEGATIVE_DESC\}\}/g, t('report.signNegativeDesc'))
            .replace(/\{\{NOTES_TITLE\}\}/g, t('report.notesTitle'))
            .replace(/\{\{NOTES_CONTENT\}\}/g, t('report.notesContent'))
            .replace(/\{\{FOOTER_1\}\}/g, t('report.footer1'));

        return html;
    },


    /**
     * Format number with units
     *
     * @param {number} value - Number to format
     * @param {string} unit - Unit string
     * @param {number} decimals - Number of decimal places
     * @returns {string} Formatted string
     */
    formatValue(value, unit, decimals = 3) {
        return `${value.toFixed(decimals)} ${unit}`;
    },

    /**
     * Generate summary statistics
     *
     * @param {Array} surfaces - Surface data
     * @returns {object} Statistics
     */
    generateStats(surfaces) {
        if (surfaces.length === 0) {
            return null;
        }

        const radii = surfaces.map(s => s.rActual);

        return {
            count: surfaces.length,
            avgRadius: radii.reduce((a, b) => a + b, 0) / radii.length,
            minRadius: Math.min(...radii),
            maxRadius: Math.max(...radii)
        };
    }
};
