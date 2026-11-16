import ClassificationPanel from "./ClassificationPanel.js";
import Accordion from "../../accordion/accordion.js";

/** Collapsible classification sharing the calculations and rules of the standard panel. */
export default class AccordionClassificationPanel extends ClassificationPanel {
  /** @param {Object} options Classification settings, parentId and expanded state. */
  constructor({ parentId, expanded = false, ...options }) {
    super(options);
    this.parentId = parentId;
    this.expanded = expanded;
  }

  /** @returns {HTMLElement} Bootstrap panel with unique identifiers for each instance. */
  render() {
    const panel = new Accordion({
      title: mviewer.tr(this.title),
      expanded: this.expanded,
      parentId: this.parentId,
      classes: "style-classification accordion-classification-panel",
    });
    panel.element.id = this.element.id;
    this.element = panel.element;
    const collapse = panel.collapse;
    collapse.addEventListener("show.bs.collapse", (event) => {
      if (event.target === collapse) this.expanded = true;
    });
    collapse.addEventListener("hide.bs.collapse", (event) => {
      if (event.target === collapse) this.expanded = false;
    });
    panel.content.append(this.methods.render(), this.rules.render());
    return this.element;
  }
}
