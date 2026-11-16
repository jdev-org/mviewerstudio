import { FieldsPanel } from "./fields.js";
import { FILL_FIELDS } from "../../formDefinitions.js";
import { DEFAULT_FILL } from "../../../../utils/styler/constants.js";

/** Paramètres de remplissage d'une règle. */
export default class Fill extends FieldsPanel {
  constructor(values = {}) {
    super("style_editor.section.fill", FILL_FIELDS, { ...DEFAULT_FILL, ...values });
  }
}
