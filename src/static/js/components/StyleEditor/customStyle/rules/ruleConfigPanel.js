import Fill from "./fill.js";
import Stroke from "./stroke.js";
import SymbolPanel from "./symbol.js";
import { FieldsPanel } from "./fields.js";
import { SYMBOL_FIELDS, DEFAULT_SYMBOL } from "../../constants.js";

/** Cartes de configuration adaptées à la géométrie. */
export default class RuleConfigPanel {
  constructor({ geometry = "Point", rule = {}, ruleMode = "all" } = {}) {
    this.element = document.createElement("div");

    this.panels = {};
    if (ruleMode === "size") {
      this.panels.symbol = new FieldsPanel(
        "style_editor.section.symbol",
        SYMBOL_FIELDS.filter(
          (field) => field.name === "minSize" || field.name === "maxSize"
        ),
        { ...DEFAULT_SYMBOL, ...rule.symbol }
      );
      return;
    }
    this.panels.stroke = new Stroke(rule.stroke);

    if (geometry !== "LineString") this.panels.fill = new Fill(rule.fill);

    if (geometry === "Point" && ruleMode !== "color")
      this.panels.symbol = new SymbolPanel(rule.symbol);
  }

  /** @returns {HTMLElement} Cartes de paramètres. */
  render() {
    this.element.replaceChildren();

    for (const name of ["fill", "stroke", "symbol"]) {
      if (this.panels[name]) this.element.appendChild(this.panels[name].render());
    }

    return this.element;
  }

  /** @returns {Object} Paramètres des cartes affichées. */
  getValue() {
    const result = {};

    Object.entries(this.panels).forEach(([name, panel]) => {
      result[name] = panel.getValue();
    });

    return result;
  }
}
