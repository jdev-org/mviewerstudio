import { analyse, categorize } from "../methods.js";
import { CLASSIFICATION_LIMITS } from "../constants.js";
import { STYLE_TYPES } from "../../../components/StyleEditor/formDefinitions.js";

/**
 * Builds category rules or numeric intervals from field values.
 * @param {Object[]} data Records containing the selected field.
 * @param {Object} parameters Field, representation type, method and class count.
 * @returns {Object[]} Classification rules before visual properties are applied.
 * @throws {Error} If no classes are produced or the category limit is exceeded.
 */
export function classify(data, { field, type, method, classes }) {
  const { styleProp } = STYLE_TYPES.find((definition) => definition.value === type);
  let rules;

  if (styleProp.includes("randomColor")) {
    const values = categorize(data, field);
    if (values.length > CLASSIFICATION_LIMITS.categories.max) {
      throw new Error(
        mviewer
          .tr("style_editor.error.too_many_categories")
          .replace("{max}", CLASSIFICATION_LIMITS.categories.max)
      );
    }
    rules = values.map((value) => ({ name: `${value}`, value }));
  } else {
    const boundaries = analyse(data, field, method, classes);
    // Duplicate a single boundary to create a class for constant values.
    if (boundaries.length === 1) boundaries.push(boundaries[0]);
    rules = boundaries.slice(1).map((max, index) => ({
      name: `${boundaries[index]} – ${max}`,
      min: boundaries[index],
      max,
    }));
  }

  if (rules.length === 0) {
    throw new Error(mviewer.tr("style_editor.error.no_classes"));
  }
  return rules;
}
