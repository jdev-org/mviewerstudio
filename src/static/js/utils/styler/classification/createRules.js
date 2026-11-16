import { classify } from "./classify.js";
import { createClusterClasses } from "../cluster.js";
import { createColorRampScales, crandomColorBClass } from "../rampColor.js";
import { calculateCircleSizes } from "../circleSizes.js";
import { DEFAULT_SYMBOL } from "../constants.js";
import { STYLE_TYPES } from "../../../components/StyleEditor/formDefinitions.js";

/**
 * Builds styled rules for numeric, categorical or cluster representations.
 * @param {Object[]} data Classification records; unused for cluster counts.
 * @param {Object} parameters Current classification and visual settings.
 * @returns {Object[]} Editable rules using the existing saved style format.
 * @throws {Error} If classification or cluster settings are invalid.
 */
export function createClassificationRules(data, parameters) {
  const {
    type,
    geometry,
    ruleMode,
    color,
    reverseColors,
    maxSize = DEFAULT_SYMBOL.maxSize,
  } = parameters;
  const { styleProp } = STYLE_TYPES.find((definition) => definition.value === type);
  if (type === "cluster") {
    const rules = createClusterClasses(parameters);
    const colors = createColorRampScales(color, rules.length, reverseColors);
    rules.forEach((rule, index) => {
      rule.fill = { color: colors[index] };
    });
    return rules;
  }
  const rules = classify(data, parameters);
  let colors;
  if (styleProp.includes("randomColor")) {
    colors = crandomColorBClass(globalThis.chroma.random().hex(), rules.length);
  } else if (styleProp.includes("ramps")) {
    colors = createColorRampScales(color, rules.length, reverseColors);
  } else {
    colors = Array(rules.length).fill(color);
  }
  const proportional = type === "proportionalCircles" || ruleMode === "size";
  let sizes;
  if (proportional) sizes = calculateCircleSizes(rules, maxSize);
  rules.forEach((rule, index) => {
    if (proportional) {
      rule.symbol = {
        ...DEFAULT_SYMBOL,
        shape: "circle",
        minSize: sizes[index],
        maxSize: sizes[index],
      };
    }
    // Size rules leave color to the other classification in a combined style.
    if (ruleMode === "size") return;
    if (geometry === "LineString") {
      rule.stroke = { color: colors[index] };
    } else {
      rule.fill = { color: colors[index] };
    }
  });
  return rules;
}
