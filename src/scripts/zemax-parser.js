/**
 * Zemax file parser for importing surface data
 */

const ZemaxParser = {
    /**
     * Parse Zemax file content and extract surface data
     *
     * @param {string} content - File content
     * @returns {Array} Array of surface objects
     */
    parse(content) {
        const surfaces = [];

        // Try different parsing strategies
        const zmxSurfaces = this.parseZmxFormat(content);
        if (zmxSurfaces.length > 0) {
            return zmxSurfaces;
        }

        const txtSurfaces = this.parseTextFormat(content);
        if (txtSurfaces.length > 0) {
            return txtSurfaces;
        }

        return surfaces;
    },

    /**
     * Parse standard Zemax .zmx format
     * Looks for SURF entries with CURV and DIAM
     * Extracts material from GLAS entries
     * Ignores SURF 0 and last SURF
     *
     * @param {string} content - File content
     * @returns {Array} Array of surface objects
     */
    parseZmxFormat(content) {
        const surfaces = [];
        const lines = content.split('\n');

        let currentSurface = null;
        let surfaceNumber = -1;
        let totalSurfaces = 0;

        // First pass: count total surfaces
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].trim().startsWith('SURF ')) {
                totalSurfaces++;
            }
        }

        // Second pass: parse surfaces
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            // Start of a new surface
            if (line.startsWith('SURF ')) {
                // Save previous surface if valid
                if (currentSurface && this.isValidSurface(currentSurface)) {
                    // Ignore SURF 0 and last SURF
                    if (currentSurface.number > 0 && currentSurface.number < totalSurfaces - 1) {
                        surfaces.push(this.formatSurface(currentSurface));
                    }
                }

                surfaceNumber++;
                currentSurface = {
                    number: surfaceNumber,
                    radius: 0,
                    curvature: 0,
                    diameter: 0,
                    material: null
                };
            }

            // Extract curvature (CURV is curvature = 1/R)
            if (currentSurface && line.startsWith('CURV ')) {
                const curvature = this.extractNumber(line);
                if (curvature !== null) {
                    currentSurface.curvature = curvature;
                    if (curvature !== 0) {
                        currentSurface.radius = 1 / curvature;
                    }
                }
            }

            // Extract diameter (DIAM value is semi-diameter, multiply by 2)
            if (currentSurface && line.startsWith('DIAM ')) {
                const semiDiameter = this.extractNumber(line);
                if (semiDiameter !== null && semiDiameter > 0) {
                    currentSurface.diameter = semiDiameter * 2;
                }
            }

            // Extract material from GLAS
            if (currentSurface && line.startsWith('GLAS ')) {
                const material = this.extractMaterial(line);
                if (material) {
                    currentSurface.material = material;
                }
            }
        }

        // Add last surface if valid (but check it's not the last SURF)
        if (currentSurface && this.isValidSurface(currentSurface)) {
            if (currentSurface.number > 0 && currentSurface.number < totalSurfaces - 1) {
                surfaces.push(this.formatSurface(currentSurface));
            }
        }

        return surfaces;
    },

    /**
     * Extract material from GLAS line
     * Format: GLAS N-BK7 ... or GLAS ___BLANK 1 0 1.5168 ...
     *
     * @param {string} line - GLAS line
     * @returns {string|null} Material name or index
     */
    extractMaterial(line) {
        const parts = line.split(/\s+/);
        if (parts.length < 2) {
            return null;
        }

        const materialName = parts[1];

        // Check if it's a named glass (not ___BLANK or blank)
        if (materialName && materialName !== '___BLANK' && !materialName.match(/^_+$/)) {
            return materialName;
        }

        // If it's ___BLANK, try to extract refractive index (5th parameter)
        if (materialName === '___BLANK' && parts.length >= 5) {
            const index = parseFloat(parts[4]);
            if (!isNaN(index) && index > 1.0) {
                return `n=${index.toFixed(4)}`;
            }
        }

        return null;
    },

    /**
     * Parse simple text format
     * Expected format: Surface# Radius Diameter
     *
     * @param {string} content - File content
     * @returns {Array} Array of surface objects
     */
    parseTextFormat(content) {
        const surfaces = [];
        const lines = content.split('\n');

        for (const line of lines) {
            const trimmed = line.trim();

            // Skip empty lines and comments
            if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//')) {
                continue;
            }

            // Try to parse as "Surface# Radius Diameter"
            const parts = trimmed.split(/\s+/);
            if (parts.length >= 3) {
                const radius = parseFloat(parts[1]);
                const diameter = parseFloat(parts[2]);

                if (!isNaN(radius) && !isNaN(diameter) && radius !== 0 && diameter > 0) {
                    surfaces.push({
                        type: this.determineSurfaceType(radius, null),
                        diameter: diameter,
                        rTestplate: Math.abs(radius),
                        material: null,
                        fringes: ''
                    });
                }
            }
        }

        return surfaces;
    },

    /**
     * Extract numerical value from a line
     *
     * @param {string} line - Line to parse
     * @returns {number|null} Extracted number or null
     */
    extractNumber(line) {
        // Match various number formats including scientific notation
        const match = line.match(/[-+]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?/);
        if (match) {
            const num = parseFloat(match[0]);
            return isNaN(num) ? null : num;
        }
        return null;
    },

    /**
     * Check if surface has valid data
     *
     * @param {object} surface - Surface object
     * @returns {boolean} True if valid
     */
    isValidSurface(surface) {
        return surface.radius !== 0 && surface.diameter > 0;
    },

    /**
     * Determine surface type based on radius and material
     * Logic:
     * - If surface has material:
     *   - Positive radius → Convex
     *   - Negative radius → Concave
     * - If surface has NO material:
     *   - Positive radius → Concave
     *   - Negative radius → Convex
     *
     * @param {number} radius - Surface radius
     * @param {string|null} material - Material name or null
     * @returns {string} 'Convex' or 'Concave'
     */
    determineSurfaceType(radius, material) {
        if (material) {
            // Has material: positive = convex, negative = concave
            return radius > 0 ? 'Convex' : 'Concave';
        } else {
            // No material: positive = concave, negative = convex
            return radius > 0 ? 'Concave' : 'Convex';
        }
    },

    /**
     * Format surface data for table
     *
     * @param {object} surface - Raw surface data
     * @returns {object} Formatted surface data
     */
    formatSurface(surface) {
        const type = this.determineSurfaceType(surface.radius, surface.material);

        return {
            type: type,
            diameter: Math.abs(surface.diameter),
            rTestplate: Math.abs(surface.radius),
            material: surface.material || '',
            fringes: ''
        };
    },

    /**
     * Parse CSV format
     *
     * @param {string} content - CSV content
     * @returns {Array} Array of surface objects
     */
    parseCSV(content) {
        const surfaces = [];
        const lines = content.split('\n');

        // Skip header line
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const parts = line.split(',');
            if (parts.length >= 2) {
                const radius = parseFloat(parts[0]);
                const diameter = parseFloat(parts[1]);

                if (!isNaN(radius) && !isNaN(diameter) && radius !== 0 && diameter > 0) {
                    surfaces.push(this.formatSurface({
                        radius: radius,
                        diameter: diameter,
                        material: null
                    }));
                }
            }
        }

        return surfaces;
    },

    /**
     * Detect file format
     *
     * @param {string} content - File content
     * @returns {string} Format type
     */
    detectFormat(content) {
        if (content.includes('SURF') && (content.includes('CURV') || content.includes('RADIUS'))) {
            return 'zmx';
        }

        if (content.includes(',')) {
            return 'csv';
        }

        return 'text';
    }
};
