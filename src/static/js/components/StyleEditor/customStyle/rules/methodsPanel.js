import {
  CLASSIFICATION_METHODS,
  CLASSIFICATION_TOOLTIPS,
  CLASSIFICATION_LIMITS,
  DEFAULT_COLOR_SCALE,
  DEFAULT_FILL,
  DEFAULT_CLUSTER_DISTANCE,
  DEFAULT_SYMBOL,
  STYLE_TYPES,
} from "../../constants.js";
import { createField } from "./fields.js";
import PaletteSelector from "./paletteSelector.js";
import Tooltip from "../../../tooltip/tooltip.js";
import Select from "../../../select/select.js";
import ListCard from "../../../listCard/listCard.js";

/** Champs de classification ; émet les paramètres pour le calcul des règles. */
export default class MethodsPanel {
  constructor({
    fields = [],
    type = "simple",
    methods = CLASSIFICATION_METHODS,
    styleProp = STYLE_TYPES.find((definition) => definition.value === type).styleProp,
    state = {},
  } = {}) {
    this.fields = fields;

    this.type = type;

    this.methods = methods;
    this.styleProp = styleProp;

    this.state = {
      field: "",
      legend: "",
      method: methods[0].value,
      classes: CLASSIFICATION_LIMITS.classes.recommended,
      maxSize: DEFAULT_SYMBOL.maxSize,
      color: styleProp.includes("ramps") ? DEFAULT_COLOR_SCALE : DEFAULT_FILL.color,
      distance: DEFAULT_CLUSTER_DISTANCE,
      reverseColors: false,
      ...state,
    };

    this.element = document.createElement("div");

    this.element.className = "style-methods";
    this.card = new ListCard({ classes: "style-methods__card" });
    this.fieldSelect = new Select({
      label: mviewer.tr("style_editor.classification.field"),
      placeholder: mviewer.tr("style_editor.classification.placeholder"),
      value: this.state.field,
    });
  }

  /** @returns {HTMLElement} Champs de la méthode choisie. */
  render() {
    this.element.replaceChildren();

    if (this.styleProp.length === 0) return this.element;

    const fields = document.createElement("div");
    fields.className = "style-fields";
    this.element.appendChild(fields);
    this.paletteSelector = null;

    for (const property of this.styleProp) {
      if (property === "field") {
        fields.appendChild(this.fieldSelect.render());
        const select = this.fieldSelect.getSelect();
        select.name = "field";
        select.required = true;
        this.setFields(this.fields);
        if (this.styleProp.includes("randomColor")) {
          const title = this.fieldSelect.element.querySelector("label");
          title.textContent =
            mviewer.tr("style_editor.classification.category_field") + " ";
          new Tooltip({
            message: this.getClassificationTooltip("categories"),
          }).appendTo(title);
        }
      }
      if (property === "methods") {
        fields.appendChild(
          createField(
            {
              name: "method",
              label: "style_editor.classification.method",
              options: this.methods,
            },
            this.state.method
          )
        );
      }
      if (property === "classes") {
        const field = createField(
          {
            name: "classes",
            label: "style_editor.classification.classes",
            type: "number",
            min: 1,
            max: STYLE_TYPES.find((definition) => definition.value === this.type)
              .maxClasses,
          },
          this.state.classes
        );
        const tooltip = new Tooltip({
          message: this.getClassificationTooltip("classes"),
          classes: "ms-1",
        });
        field.insertBefore(tooltip.render(), field.querySelector("input"));
        fields.appendChild(field);
      }
      if (property === "maxSize") {
        fields.appendChild(
          createField(
            {
              name: "maxSize",
              label: "style_editor.field.maxSize",
              type: "number",
              min: 1,
              step: "any",
            },
            this.state.maxSize
          )
        );
      }
      if (property === "distance") {
        fields.appendChild(
          createField(
            {
              name: "distance",
              label: "style_editor.field.distance",
              type: "number",
              min: 0,
            },
            this.state.distance
          )
        );
      }
      if (property === "color") {
        fields.appendChild(
          createField(
            {
              name: "color",
              label: "style_editor.field.color",
              type: "color",
            },
            this.state.color
          )
        );
      }
      if (property === "ramps") {
        fields.appendChild(this.renderPalette());
      }
    }

    fields.insertAdjacentHTML(
      "beforeend",
      `
      <div class="style-methods__actions">
        <button type="button" class="btn btn-primary">${mviewer.tr("style_editor.classification.calculate")}</button>
      </div>
      <p class="text-danger d-none" role="alert" data-classification-error></p>
    `
    );

    const calculate = this.element.querySelector(".style-methods__actions button");

    calculate.addEventListener("click", () => {
      const inputs = [...this.element.querySelectorAll("input, select")];

      if (!inputs.every((input) => input.reportValidity())) return;

      this.readState();

      this.element.dispatchEvent(
        new CustomEvent("calculate", { detail: { ...this.state }, bubbles: true })
      );
    });

    this.element.onchange = (event) => {
      this.readState();
      if (event.target.name === "classes" && this.paletteSelector) {
        if (event.target.checkValidity()) {
          this.paletteSelector.updatePreviews(this.state.classes);
        }
      }
      if (event.target.name === "reverseColors") {
        this.paletteSelector.updatePreviews(
          this.paletteSelector.classes,
          this.state.reverseColors
        );
      }

      this.element.dispatchEvent(
        new CustomEvent("update", { detail: { ...this.state }, bubbles: true })
      );
    };

    this.element.replaceChildren(this.card.setItems([fields]));

    return this.element;
  }

  /** Formate une infobulle avec les limites définies dans les constantes.
   * @param {string} kind Type de limites : classes ou categories.
   * @returns {string} Texte traduit avec les nombres recommandés et maximums.
   */
  getClassificationTooltip(kind) {
    const limits = CLASSIFICATION_LIMITS[kind];

    return mviewer
      .tr(CLASSIFICATION_TOOLTIPS[kind])
      .replace("{recommended}", limits.recommended)
      .replace("{max}", limits.max);
  }

  /** @returns {HTMLElement} Liste de palettes et option d'inversion. */
  renderPalette() {
    this.paletteSelector = new PaletteSelector({
      value: this.state.color,
      classes: this.state.classes,
      reverseColors: this.state.reverseColors,
    });
    const field = document.createElement("div");
    field.appendChild(this.paletteSelector.render());
    field.insertAdjacentHTML(
      "beforeend",
      `
      <div class="custom-control custom-checkbox style-methods__reverse">
        <input type="checkbox" class="custom-control-input" name="reverseColors" id="${this.paletteSelector.id}-reverse">
        <label class="custom-control-label" for="${this.paletteSelector.id}-reverse">
          ${mviewer.tr("style_editor.classification.reverse_colors")}
        </label>
      </div>
    `
    );
    field.querySelector('[name="reverseColors"]').checked = this.state.reverseColors;
    return field;
  }

  /** Synchronise les paramètres avec les valeurs actuelles des champs. */
  readState() {
    this.element.querySelectorAll("input, select").forEach((input) => {
      this.state[input.name] = input.value;

      if (input.type === "number") this.state[input.name] = input.valueAsNumber;
      if (input.type === "checkbox") this.state[input.name] = input.checked;
    });
  }

  /**
   * Actualise les options et conserve la sélection si le champ existe encore.
   * @param {string[]} fields Champs disponibles.
   * @returns {void}
   */
  setFields = (fields) => {
    this.fields = fields;

    if (!fields.includes(this.state.field)) this.state.field = "";

    this.fieldSelect.setValue(this.state.field);
    this.fieldSelect.setOptions(fields.map((field) => ({ label: field, value: field })));
  };
}
