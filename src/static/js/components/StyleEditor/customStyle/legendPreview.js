import Accordion from "../../accordion/accordion.js";
import RulePreview from "./rules/rulePreview.js";
import { createGeoStylerStyle } from "../../../utils/styler/style.js";
import { restoreSymbolizer } from "../../../utils/styler/readStyle.js";

/** Legend for the visual variables of a custom style. */
export default class LegendPreview {
  /** @param {Function} getConfiguration Returns the current custom style configuration. */
  constructor(getConfiguration) {
    this.getConfiguration = getConfiguration;
    this.panel = new Accordion({
      title: mviewer.tr("style_editor.legend.preview"),
      expanded: true,
      classes: "style-legend-preview",
    });
    this.element = this.panel.element;
    this.content = this.panel.content;
    this.content.classList.add("small");
  }

  /** Redraws the legend with separate size and color variables.
   * @returns {void}
   */
  update() {
    this.content.replaceChildren();
    try {
      const configuration = this.getConfiguration();
      if (
        configuration.type === "proportionalColoredCircles" &&
        configuration.colorClassification
      ) {
        this.appendClassification(
          {
            ...configuration,
            type: "proportionalCircles",
            colorClassification: undefined,
          },
          "style_editor.classification.circle_sizes"
        );
        this.appendClassification(
          {
            type: "analyse",
            ...configuration.colorClassification,
            geometry: configuration.geometry,
          },
          "style_editor.classification.circle_colors"
        );
      } else {
        this.appendClassification(configuration);
      }
    } catch (error) {
      const message = document.createElement("p");
      message.className = "text-muted mb-0";
      message.setAttribute("role", "status");
      message.textContent = error.message;
      this.content.appendChild(message);
    }
  }

  /**
   * Displays a classification using the symbols from the exported style.
   * @param {Object} configuration Settings and rules for a visual variable.
   * @param {string} [title] Translation key for the group heading.
   * @returns {void}
   */
  appendClassification(configuration, title) {
    const style = createGeoStylerStyle({ ...configuration, labels: undefined });
    const entries = style.rules.map((rule) => ({
      name: rule.name,
      ...restoreSymbolizer(rule.symbolizers[0]),
    }));
    const maxSymbolSize = Math.max(1, ...entries.map((entry) => entry.symbol.maxSize));
    const group = document.createElement("div");
    if (title) {
      group.className = "mb-3";
      const heading = document.createElement("h6");
      heading.textContent = mviewer.tr(title);
      group.appendChild(heading);
    }
    const list = document.createElement("ul");
    list.className = "list-unstyled mb-0";
    entries.forEach((entry) => {
      const item = document.createElement("li");
      item.className = "d-flex align-items-center gap-2";
      const symbol = new RulePreview({
        rule: entry,
        geometry: entry.geometry,
        symbolSize: entry.symbol.maxSize,
        maxSymbolSize,
      });
      const name = document.createElement("span");
      name.textContent = entry.name;
      const preview = symbol.render();
      preview.setAttribute("width", "40");
      preview.setAttribute("height", "24");
      preview.classList.add("flex-shrink-0");
      item.append(preview, name);
      list.appendChild(item);
    });
    group.appendChild(list);
    this.content.appendChild(group);
  }

  /** @returns {HTMLElement} Collapsible legend panel, preserving its open state. */
  render() {
    return this.element;
  }
}
