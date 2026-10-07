import { FieldsPanel } from "./fields.js";
import { STROKE_FIELDS, DEFAULT_STROKE, STROKE_TYPES } from "../../constants.js";

/** Paramètres de contour d'une règle. */
export default class Stroke extends FieldsPanel {
  constructor(values = {}) {
    super(
      "Contour",
      [
        ...STROKE_FIELDS,
        { name: "lineStyle", label: "Style du trait", options: STROKE_TYPES },
      ],
      { ...DEFAULT_STROKE, ...values }
    );
  }
}
