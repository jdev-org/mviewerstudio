/**
 * This utils file is used to generate a color ramp based on a given color and number of classes.
 * Use chroma.js lib.
 */

/**
 * Create a categorical palette starting with the supplied color.
 * @param {string} color Base color accepted by chroma.js.
 * @param {number} classes Positive integer number of colors.
 * @returns {string[]} Hex colors, or an empty array for an invalid class count.
 */
export const crandomColorBClass = (color, classes) => {
    if (!Number.isInteger(classes) || classes < 1) return [];

    const colors = [globalThis.chroma(color).hex()];
    for (let index = 1; index < classes; index++) {
        colors.push(globalThis.chroma.random().hex());
    }
    return colors;
}

/**
 * Return the built-in color scales available in the style editor.
 * @returns {Array<{label: string, value: string}>} Named palette options.
 */
export const getColorRampScales = () => {
    return Object.keys(globalThis.chroma.brewer).map(name => ({ label: name, value: name }));
}

/**
 * Sample a named palette or a sequential ramp from white to a base color.
 * @param {string} color Palette name or base color accepted by chroma.js.
 * @param {number} classes Positive integer number of colors.
 * @param {boolean} [reverseColors=false] Reverse the order of sampled colors.
 * @returns {string[]} Hex colors, or an empty array for an invalid class count.
 */
export const createColorRampScales = (color, classes, reverseColors = false) => {
    if (!Number.isInteger(classes) || classes < 1) return [];
    let colors;
    if (Object.hasOwn(globalThis.chroma.brewer, color)) {
        colors = globalThis.chroma.scale(color).mode("lab").colors(classes);
    } else if (classes === 1) {
        colors = [globalThis.chroma(color).hex()];
    } else {
        colors = globalThis.chroma.scale(["#ffffff", color]).mode("lab").colors(classes);
    }
    if (reverseColors) colors.reverse();
    return colors;
}
