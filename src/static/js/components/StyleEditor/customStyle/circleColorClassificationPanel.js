import AccordionClassificationPanel from "./accordionClassificationPanel.js";
import { createField } from "./rules/fields.js";
import { STYLE_TYPES } from "../constants.js";

/** Selects color classification based on the field, with a manual override. */
export default class CircleColorClassificationPanel extends AccordionClassificationPanel {
  /** @param {Object} options Panel settings and a field mode suggestion callback. */
  constructor({ getFieldType, ...options }) {
    super(options);
    this.element.addEventListener("change", (event) => {
      if (event.target.name !== "field") return;
      this.setClassificationMode(getFieldType(event.target.value));
    });
  }

  /**
   * Restores the saved color mode before applying its settings and rules.
   * @param {Object} value Saved color classification; older styles default to numeric.
   * @returns {void}
   */
  restore(value) {
    this.setClassificationMode(value.type || "analyse", { render: false });
    super.restore(value);
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
      this.type
    );
    field.querySelector("select").addEventListener("change", (event) => {
      this.setClassificationMode(event.target.value);
    });
    this.element.querySelector(".accordion-body").prepend(field);
    return this.element;
  }

  /** @returns {Object} Settings and rules including the color mode to restore. */
  getValue() {
    return { ...super.getValue(), type: this.type };
  }
}
