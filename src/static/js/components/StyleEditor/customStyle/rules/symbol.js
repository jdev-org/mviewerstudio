import { FieldsPanel } from "./fields.js";
import { SYMBOL_FIELDS, DEFAULT_SYMBOL, SYMBOL_SHAPES } from "../../constants.js";

/** Paramètres de taille et de forme d'un symbole ponctuel. */
export default class SymbolPanel extends FieldsPanel {
  constructor(values = {}) {
    super(
      "Symbole",
      [...SYMBOL_FIELDS, { name: "shape", label: "Forme", options: SYMBOL_SHAPES }],
      { ...DEFAULT_SYMBOL, ...values }
    );
  }
}
