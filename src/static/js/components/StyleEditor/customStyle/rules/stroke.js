import { FieldsPanel } from "./fields.js";
import { STROKE_FIELDS, STROKE_TYPES } from "../../formDefinitions.js";
import { DEFAULT_STROKE } from "../../../../utils/styler/constants.js";

/** Paramètres de contour d'une règle. */
export default class Stroke extends FieldsPanel {
  constructor(values = {}) {
    super(
      "style_editor.section.stroke",
      [
        ...STROKE_FIELDS,
        {
          name: "lineStyle",
          label: "style_editor.field.lineStyle",
          options: STROKE_TYPES,
        },
      ],
      { ...DEFAULT_STROKE, ...values }
    );
  }
}
