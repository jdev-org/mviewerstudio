import AccordionClassificationPanel from "./accordionClassificationPanel.js";
import { createField } from "./rules/fields.js";
import { CLASSIFICATION_METHODS, STYLE_TYPES } from "../constants.js";

/** Selects color classification based on the field, with a manual override. */
export default class CircleColorClassificationPanel extends AccordionClassificationPanel {
  /** @param {Object} options Panel settings and layer data. */
  constructor({ layerOptions, ...options }) {
    super(options);
    this.layerOptions = layerOptions;
    this.methods.element.addEventListener("change", (event) => {
      if (event.target.name !== "field") return;
      this.methods.readState();
      this.setType(this.getFieldType(event.target.value));
      this.render();
    });
  }

  /**
   * Determines the mode from the first nonempty field value.
   * @param {string} field Selected field name.
   * @returns {string} Numeric or categorical mode.
   */
  getFieldType(field) {
    let layer = this.layerOptions;
    if (layer.layerId && typeof config !== "undefined") {
      layer = { ...layer, ...config.temp.layers[layer.layerId] };
    }
    const records =
      layer.csvData || (layer.features || []).map((feature) => feature.properties);
    for (const record of records) {
      const value = record[field];
      if (value === null || value === undefined || value === "") continue;
      if (typeof value === "number") return "analyse";
      return "categorized";
    }
    return "analyse";
  }

  /**
   * Updates settings and clears incompatible rules when the mode changes.
   * @param {string} type Selected color mode.
   * @returns {void}
   */
  setType(type) {
    if (this.methods.type === type) return;
    const definition = STYLE_TYPES.find((item) => item.value === type);
    this.methods.type = type;
    this.methods.styleProp = definition.styleProp;
    this.methods.methods = CLASSIFICATION_METHODS.filter(
      (method) => !definition.methods || definition.methods.includes(method.value)
    );
    this.methods.state.method = this.methods.methods[0].value;
    this.rules.type = type;
    this.rules.rules = [];
    this.rules.selected.clear();
  }

  /** @returns {HTMLElement} Accordion containing the mode selector and its settings. */
  render() {
    super.render();
    const field = createField(
      {
        name: "colorClassificationType",
        label: "style_editor.classification.method",
        options: STYLE_TYPES.filter((type) =>
          ["analyse", "categorized"].includes(type.value)
        ),
      },
      this.methods.type
    );
    field.querySelector("select").addEventListener("change", (event) => {
      this.setType(event.target.value);
      this.render();
      this.element.dispatchEvent(new CustomEvent("update", { bubbles: true }));
    });
    this.methods.element.before(field);
    return this.element;
  }

  /** @returns {Object} Settings and rules including the color mode to restore. */
  getValue() {
    return { ...super.getValue(), type: this.methods.type };
  }
}
