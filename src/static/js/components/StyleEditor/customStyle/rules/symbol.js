import { FieldsPanel } from "./fields.js";
import { SYMBOL_FIELDS, DEFAULT_SYMBOL, SYMBOL_SHAPES } from "../../constants.js";

/** Paramètres de taille et de forme d'un symbole ponctuel. */
export default class SymbolPanel extends FieldsPanel {
  constructor(values = {}) {
    super(
      "style_editor.section.symbol",
      [
        ...SYMBOL_FIELDS,
        { name: "shape", label: "style_editor.field.shape", options: SYMBOL_SHAPES },
      ],
      { ...DEFAULT_SYMBOL, ...values }
    );
  }
}
