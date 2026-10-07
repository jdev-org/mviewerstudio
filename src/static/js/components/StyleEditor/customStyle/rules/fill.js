import { FieldsPanel } from "./fields.js";
import { FILL_FIELDS, DEFAULT_FILL } from "../../constants.js";

/** Paramètres de remplissage d'une règle. */
export default class Fill extends FieldsPanel {
  constructor(values = {}) {
    super("Remplissage", FILL_FIELDS, { ...DEFAULT_FILL, ...values });
  }
}
