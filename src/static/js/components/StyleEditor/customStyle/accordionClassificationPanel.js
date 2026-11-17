import Accordion from "../../accordion/accordion.js";

/** Displays an independent classification panel inside a persistent accordion. */
export default class AccordionClassificationPanel {
  /** @param {Object} options Classification panel, title, parentId and expanded state. */
  constructor({ classification, title, parentId, expanded = false }) {
    this.classification = classification;
    this.accordion = new Accordion({
      title: mviewer.tr(title),
      expanded,
      parentId,
      classes: "style-classification accordion-classification-panel",
    });
    this.element = this.accordion.element;
  }

  /**
   * Delegates mode changes to the classification without rebuilding its accordion.
   * @param {string} type Numeric or categorical classification type.
   * @param {Object} [options] Rendering and update options.
   * @returns {void}
   */
  setClassificationMode(type, options) {
    this.classification.setClassificationMode(type, options);
  }

  /**
   * Updates fields through the classification's public API.
   * @param {string[]} fields Available field names.
   * @returns {void}
   */
  setFields(fields) {
    this.classification.setFields(fields);
  }

  /**
   * Restores classification settings while preserving the accordion state.
   * @param {Object} value Saved settings and rules.
   * @returns {void}
   */
  restore(value) {
    this.classification.restore(value);
  }

  /** @returns {Object} Classification settings and rules. */
  getValue() {
    return this.classification.getValue();
  }

  /** @returns {HTMLElement} Existing accordion containing the rendered classification. */
  render() {
    this.accordion.setContent(this.classification.render());
    return this.element;
  }
}
