import { FieldsPanel } from "./fields.js";
import Tooltip from "../../../tooltip/tooltip.js";
import { RULE_SCALE_FIELDS } from "../../constants.js";

/** Optional scale denominators controlling the visibility of a graphic rule. */
export default class ScalePanel extends FieldsPanel {
  /**
   * @param {Object} [values={}] Inclusive minimum and exclusive maximum denominators.
   */
  constructor(values = {}) {
    super("style_editor.section.scale", RULE_SCALE_FIELDS, values);
  }

  /** @returns {HTMLElement} Scale fields and instructions for optional bounds. */
  render() {
    super.render();
    this.element.querySelectorAll("input").forEach((input) => {
      input.required = false;
      input.value = "";
      if (this.values[input.name] !== undefined) input.value = this.values[input.name];
      input.placeholder = mviewer.tr("style_editor.scale.unlimited");
      input.addEventListener("input", () => {
        this.element.querySelector('[name="max"]').setCustomValidity("");
      });
    });
    if (!this.helpTooltip) {
      const tooltip = new Tooltip({
        message: mviewer.tr("style_editor.scale.help"),
        classes: "ms-2 me-3",
      });
      const heading = this.element.querySelector(".accordion-header");
      heading.classList.add("d-flex", "align-items-center");
      // Keep help outside the collapse button and reuse it across field refreshes.
      this.helpTooltip = tooltip.appendTo(heading);
    }
    return this.element;
  }

  /** @returns {Object} Numeric bounds; blank fields leave their bound unrestricted. */
  getValue() {
    const values = {};
    this.element.querySelectorAll("input").forEach((input) => {
      if (input.value !== "") values[input.name] = input.valueAsNumber;
    });
    return values;
  }

  /** @returns {boolean} Whether the bounds form a nonempty visibility interval. */
  validate() {
    const values = this.getValue();
    const max = this.element.querySelector('[name="max"]');
    max.setCustomValidity("");
    if (values.max !== undefined && values.max <= (values.min || 0)) {
      max.setCustomValidity(mviewer.tr("style_editor.error.scale_range"));
      max.reportValidity();
      return false;
    }
    return true;
  }
}
