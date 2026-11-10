import Accordion from "../../accordion/accordion.js";
import RulePreview from "./rules/rulePreview.js";
import { createGeoStylerStyle } from "../../../utils/styler/style.js";
import { restoreSymbolizer } from "../../../utils/styler/readStyle.js";

/** Live legend using the same graphic rules as the exported SLD. */
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

  /** Redraw names and symbols, including crossed size/color classifications.
   * @returns {void}
   */
  update() {
    this.content.replaceChildren();
    try {
      const configuration = this.getConfiguration();
      // Text settings and text scale limits do not participate in a graphic legend.
      const style = createGeoStylerStyle({ ...configuration, labels: undefined });
      const entries = style.rules.map((rule) => ({
        name: rule.name,
        ...restoreSymbolizer(rule.symbolizers[0]),
      }));
      const maxSymbolSize = Math.max(1, ...entries.map((entry) => entry.symbol.maxSize));
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
      this.content.appendChild(list);
    } catch (error) {
      const message = document.createElement("p");
      message.className = "text-muted mb-0";
      message.setAttribute("role", "status");
      message.textContent = error.message;
      this.content.appendChild(message);
    }
  }

  /** @returns {HTMLElement} Collapsible legend panel, preserving its open state. */
  render() {
    return this.element;
  }
}
