export const categorize = (data, field) => {
    let category = [];
    data.forEach(i => {
        if(!category.includes(i[field])) category.push(i[field]);
    });
    return category;
}

/**
 * Return Jenks natural break boundaries, including the minimum and maximum.
 * @param {Object[]} data Records containing numeric field values.
 * @param {string} field Numeric field to classify.
 * @param {number} classes Positive integer number of classes.
 * @returns {number[]} Sorted boundaries, or an empty array for invalid input.
 */
export const jenks = (data, field, classes) => {
    if (!Number.isInteger(classes) || classes < 1) return [];

    const values = data.map(item => item[field]).filter(Number.isFinite);

    if (values.length === 0 || classes > values.length) return [];

    return globalThis.ss.jenks(values, classes);
}

/**
 * Return equal interval class boundaries, including the minimum and maximum.
 * @param {Object[]} data Records containing numeric field values.
 * @param {string} field Numeric field to classify.
 * @param {number} classes Positive integer number of classes.
 * @returns {number[]} Sorted boundaries, or an empty array for invalid input.
 */

export const equalInterval = (data, field, classes) => {
    if (!Number.isInteger(classes) || classes < 1) return [];

    const values = data.map(item => item[field]).filter(Number.isFinite);

    if (values.length === 0) return [];

    return globalThis.ss.equalIntervalBreaks(values, classes);
}

/**
 * Return quantile class boundaries, including the minimum and maximum.
 * @param {Object[]} data Records containing numeric field values.
 * @param {string} field Numeric field to classify.
 * @param {number} classes Positive integer number of classes.
 * @returns {number[]} Sorted boundaries, or an empty array for invalid input.
 */
export const quantiles = (data, field, classes) => {
    if (!Number.isInteger(classes) || classes < 1) return [];

    const values = data
        .map(item => item[field])
        .filter(Number.isFinite)
        .sort((a, b) => a - b);

    if (values.length === 0) return [];

    const boundaries = [values[0]];
    for (let index = 1; index < classes; index++) {
        boundaries.push(globalThis.ss.quantileSorted(values, index / classes));
    }

    boundaries.push(values[values.length - 1]);
    return boundaries;
}

/**
 * Calculate class boundaries using the selected classification method.
 * @param {Object[]} data Records containing numeric field values.
 * @param {string} field Numeric field to classify.
 * @param {string} method Classification method: jenk, equalInterval or quantiles.
 * @param {number} classes Positive integer number of classes.
 * @returns {number[]} Class boundaries, or an empty array for an unknown method.
 */
export const analyse = (data, field, method, classes) => {
    switch (method) {
        case "jenk":
            return jenks(data, field, classes);
        case "equalInterval":
            return equalInterval(data, field, classes);
        case "quantiles":
            return quantiles(data, field, classes);
        default:
            return [];
    }
};
