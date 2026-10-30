import { DEFAULT_LABELS, LABEL_PREVIEW } from "./constants.js";
import { restoreLabels } from "../../../utils/styler/labels.js";

/** Reusable SVG preview of label settings or a parsed SLD style. */
export default class LabelPreview {
  /**
   * @param {Object} [options={}] Label settings, sample text and a GeoJSON feature.
   */
  constructor({ style = {}, text = "", feature = null } = {}) {
    this.text = text;
    this.feature = feature;
    this.element = document.createElementNS(LABEL_PREVIEW.svgNamespace, "svg");
    this.element.setAttribute("width", "100%");
    this.element.setAttribute("role", "img");
    this.label = document.createElementNS(LABEL_PREVIEW.svgNamespace, "text");
    this.label.setAttribute("x", "50%");
    this.label.setAttribute("y", "50%");
    this.label.setAttribute("text-anchor", "middle");
    this.label.setAttribute("dominant-baseline", "central");
    this.label.setAttribute("paint-order", "stroke fill");
    this.label.setAttribute("stroke-linejoin", "round");
    this.element.appendChild(this.label);
    this.update(style);
  }

  /**
   * Refresh the existing preview without rebuilding its DOM.
   * @param {Object} style Label settings or GeoStyler style containing a text rule.
   * @returns {void}
   */
  update(style) {
    if (style.rules) {
      const rule = style.rules.find((item) =>
        item.symbolizers.some((symbolizer) => symbolizer.kind === "Text")
      );
      this.element.hidden = !rule;
      if (!rule) return;
      style = restoreLabels(rule);
    }
    this.element.hidden = false;
    this.style = style;
    const settings = { ...DEFAULT_LABELS, ...style };
    const size = Math.max(1, settings.size || DEFAULT_LABELS.size);
    const radius = Math.max(0, settings.radius || 0);
    const height = Math.max(LABEL_PREVIEW.height, size * 2 + radius * 2);
    this.element.setAttribute("height", height);
    let text = this.text || settings.field || LABEL_PREVIEW.text;
    if (this.feature && this.feature.properties) {
      const value = this.feature.properties[settings.field];
      if (
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean"
      ) {
        text = value;
      }
    }
    this.label.textContent = text;
    this.element.setAttribute("aria-label", this.label.textContent);
    this.label.setAttribute("font-family", settings.font);
    this.label.setAttribute("font-size", size);
    this.label.setAttribute("fill", settings.color);
    this.label.setAttribute("stroke", settings.strokeColor);
    this.label.setAttribute("stroke-width", radius * 2);
    this.label.setAttribute("stroke-opacity", settings.fillOpacity);
  }

  /**
   * Use a WFS or Grist sample feature for the selected field and refresh the preview.
   * @param {Object|null} feature GeoJSON feature, or null to restore sample text.
   * @returns {void}
   */
  setFeature(feature) {
    this.feature = feature;
    if (this.style) this.update(this.style);
  }

  /**
   * Parse SLD XML with the application's existing parser and refresh the preview.
   * @param {string} sld SLD XML content.
   * @returns {Promise<void>} Resolves after rendering; rejects on invalid SLD.
   */
  async setSld(sld) {
    const parser = new globalThis.GeoStylerSLDParser.SldStyleParser();
    const { output, errors } = await parser.readStyle(sld);
    if (errors && errors.length) {
      throw new Error(errors.map((error) => error.message || error).join("\n"));
    }
    if (!output) throw new Error("SLD conversion produced no output.");
    this.update(output);
  }

  /** @returns {SVGElement} Preview element, preserving subsequent updates. */
  render() {
    return this.element;
  }
}
