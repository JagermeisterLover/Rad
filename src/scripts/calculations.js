/**
 * Optical calculations for testplate analysis
 */

const Calculations = {
    /**
     * Calculate testplate sag
     * z = R - √(R² - (D/2)²)
     *
     * @param {number} radius - Testplate radius in mm
     * @param {number} diameter - Surface diameter in mm
     * @returns {number} Sag in mm
     */
    calculateTestplateSag(radius, diameter) {
        if (radius === 0 || diameter === 0) {
            return 0;
        }

        const r2 = radius * radius;
        const d2 = (diameter / 2) * (diameter / 2);

        if (r2 < d2) {
            return 0; // Invalid: diameter exceeds valid aperture
        }

        return Math.abs(radius) - Math.sqrt(r2 - d2);
    },

    /**
     * Calculate fringe contribution to sag
     * Δz = N × λ/2
     *
     * @param {number} fringes - Number of fringes
     * @param {number} wavelength - Wavelength in nm
     * @returns {number} Sag contribution in mm
     */
    calculateFringeSag(fringes, wavelength) {
        // Convert wavelength from nm to mm
        const lambdaMm = wavelength / 1000000;
        return fringes * lambdaMm / 2;
    },

    /**
     * Calculate actual surface sag
     * Convex: z_actual = z_testplate + Δz
     * Concave: z_actual = z_testplate - Δz
     *
     * @param {string} type - Surface type ('Convex' or 'Concave')
     * @param {number} testplateSag - Testplate sag in mm
     * @param {number} fringeSag - Fringe contribution in mm
     * @returns {number} Actual sag in mm
     */
    calculateActualSag(type, testplateSag, fringeSag) {
        if (type === 'Convex') {
            return testplateSag + fringeSag;
        } else {
            return testplateSag - fringeSag;
        }
    },

    /**
     * Calculate actual radius from sag
     * R = (D²/4 + z²) / (2z)
     *
     * @param {string} type - Surface type ('Convex' or 'Concave')
     * @param {number} diameter - Surface diameter in mm
     * @param {number} sag - Surface sag in mm
     * @returns {number} Radius in mm (with sign convention)
     */
    calculateActualRadius(type, diameter, sag) {
        if (sag === 0 || diameter === 0) {
            return 0;
        }

        const d2 = diameter * diameter / 4;
        const z2 = sag * sag;
        const radius = (d2 + z2) / (2 * sag);

        // Apply sign convention
        // Positive radius: Convex (center of curvature to the right)
        // Negative radius: Concave (center of curvature to the left)
        if (type === 'Concave') {
            return -Math.abs(radius);
        } else {
            return Math.abs(radius);
        }
    },

    /**
     * Main calculation function
     * Calculates all surface parameters
     *
     * @param {string} type - Surface type
     * @param {number} diameter - Diameter in mm
     * @param {number} rTestplate - Testplate radius in mm
     * @param {number} fringes - Number of fringes
     * @param {number} wavelength - Wavelength in nm
     * @returns {object} Calculated parameters
     */
    calculateSurface(type, diameter, rTestplate, fringes, wavelength) {
        const sagTestplate = this.calculateTestplateSag(rTestplate, diameter);
        const sagAdded = this.calculateFringeSag(fringes, wavelength);
        const sagActual = this.calculateActualSag(type, sagTestplate, sagAdded);
        const rActual = this.calculateActualRadius(type, diameter, sagActual);

        return {
            sagTestplate,
            sagAdded,
            sagActual,
            rActual
        };
    },

    /**
     * Calculate curvature from radius
     *
     * @param {number} radius - Radius in mm
     * @returns {number} Curvature in 1/mm
     */
    radiusToCurvature(radius) {
        if (radius === 0) {
            return 0;
        }
        return 1 / radius;
    },

    /**
     * Calculate radius from curvature
     *
     * @param {number} curvature - Curvature in 1/mm
     * @returns {number} Radius in mm
     */
    curvatureToRadius(curvature) {
        if (curvature === 0) {
            return 0;
        }
        return 1 / curvature;
    },

    /**
     * Validate input parameters
     *
     * @param {number} diameter - Diameter in mm
     * @param {number} radius - Radius in mm
     * @returns {object} Validation result
     */
    validateInputs(diameter, radius) {
        const errors = [];

        if (diameter <= 0) {
            errors.push('Diameter must be positive');
        }

        if (Math.abs(radius) < diameter / 2) {
            errors.push('Radius is too small for the given diameter');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }
};
