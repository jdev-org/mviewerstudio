import { FieldsPanel } from "./fields.js";
import {
  SYMBOL_FIELDS,
  DEFAULT_SYMBOL,
  DEFAULT_CLUSTER_SYMBOL,
  SYMBOL_SHAPES,
} from "../../constants.js";

/** Paramètres de taille et de forme d'un symbole ponctuel. */
export default class SymbolPanel extends FieldsPanel {
  constructor(values = {}, type = "simple") {
    let fields = SYMBOL_FIELDS;
    let shapes = SYMBOL_SHAPES;
    if (type === "cluster") {
      fields = fields
        .filter((field) => field.name !== "externalGraphic")
        .map((field) => ({
          ...field,
          label:
            field.name === "minSize"
              ? "style_editor.field.minRadius"
              : "style_editor.field.maxRadius",
        }));
      shapes = shapes.filter((shape) => shape.value === DEFAULT_SYMBOL.shape);
      values = {
        ...DEFAULT_CLUSTER_SYMBOL,
        ...values,
        shape: DEFAULT_SYMBOL.shape,
        externalGraphic: "",
      };
      values.minSize /= 2;
      values.maxSize /= 2;
    }
    super(
      "style_editor.section.symbol",
      [...fields, { name: "shape", label: "style_editor.field.shape", options: shapes }],
      { ...DEFAULT_SYMBOL, ...values }
    );
    this.type = type;
  }

  /** Convertit les rayons affichés des clusters en diamètres pour le style.
   * @returns {Object} Paramètres du symbole avec tailles en pixels.
   */
  getValue() {
    const values = super.getValue();
    if (this.type === "cluster") {
      values.minSize *= 2;
      values.maxSize *= 2;
    }
    return values;
  }
}
