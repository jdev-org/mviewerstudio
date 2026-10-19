import { CLASSIFICATION_METHODS, CLASSIFICATION_TOOLTIPS, DEFAULT_COLOR_SCALE } from "../../constants.js";
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
    state = {},
  } = {}) {
    this.fields = fields;

    this.type = type;

    this.methods = methods;

    this.state = {
      field: "",
      legend: "",
      method: methods[0].value,
      classes: 5,
      color: DEFAULT_COLOR_SCALE,
      reverseColors: false,
      ...state,
    };

    this.element = document.createElement("div");

    this.element.className = "style-methods";
    this.card = new ListCard({ title: mviewer.tr("style_editor.classification.title") });
    this.fieldSelect = new Select({
      label: mviewer.tr("style_editor.classification.field"),
      placeholder: mviewer.tr("style_editor.classification.placeholder"),
      value: this.state.field,
    });
  }

  /** @returns {HTMLElement} Champs de la méthode choisie. */
  render() {
    this.element.replaceChildren();

    if (this.type === "simple") return this.element;

    const fields = document.createElement("div");
    fields.className = "style-fields";
    fields.appendChild(this.fieldSelect.render());
    this.element.appendChild(fields);

    const select = this.fieldSelect.getSelect();
    select.name = "field";
    select.required = true;
    this.setFields(this.fields);

    if (this.type === "categorized") {
      const title = this.fieldSelect.element.querySelector("label");

      title.textContent = mviewer.tr("style_editor.classification.category_field") + " ";
      new Tooltip({ message: mviewer.tr(CLASSIFICATION_TOOLTIPS.categories) }).appendTo(
        title
      );
    }

    if (this.type !== "categorized") {
      fields.insertAdjacentHTML(
        "beforeend",
        `
        <label>${mviewer.tr("style_editor.classification.legend")}<input class="form-control" name="legend" /></label>
        <label>
          ${mviewer.tr("style_editor.classification.method")}
          <select class="form-control" name="method"></select>
        </label>
        <label>
          <span data-classes-title>${mviewer.tr("style_editor.classification.classes")} </span>
          <input
              class="form-control"
              name="classes"
              type="number"
              min="1"
              max="7"
              required />
        </label>
        `
      );

      new Tooltip({ message: mviewer.tr(CLASSIFICATION_TOOLTIPS.classes) }).appendTo(
        this.element.querySelector("[data-classes-title]")
      );

      const method = this.element.querySelector('[name="method"]');

      this.methods.forEach((item) =>
        method.add(new Option(mviewer.tr(item.label), item.value))
      );

      for (const name of ["legend", "method", "classes"])
        this.element.querySelector(`[name="${name}"]`).value = this.state[name];
    }

    this.paletteSelector = new PaletteSelector({
      value: this.state.color,
      classes: this.state.classes,
      reverseColors: this.state.reverseColors,
    });
    const colorsField = document.createElement("div");
    colorsField.appendChild(this.paletteSelector.render());
    colorsField.insertAdjacentHTML(
      "beforeend",
      `<div class="custom-control custom-checkbox style-methods__reverse">
        <input type="checkbox" class="custom-control-input" name="reverseColors" id="${this.paletteSelector.id}-reverse">
        <label class="custom-control-label" for="${this.paletteSelector.id}-reverse">
          ${mviewer.tr("style_editor.classification.reverse_colors")}
        </label>
      </div>`
    );
    fields.appendChild(colorsField);

    fields.insertAdjacentHTML(
      "beforeend",
      `
      <div class="style-methods__actions">
        <button type="button" class="btn btn-primary">${mviewer.tr("style_editor.classification.calculate")}</button>
      </div>
      <p class="text-danger d-none" role="alert" data-classification-error></p>
    `
    );

    this.element.querySelector('[name="reverseColors"]').checked = this.state.reverseColors;

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
      if (event.target.name === "classes") {
        if (event.target.checkValidity()) {
          this.paletteSelector.updatePreviews(this.state.classes);
        }
      }
      if (event.target.name === "reverseColors") {
        this.paletteSelector.updatePreviews(this.paletteSelector.classes, this.state.reverseColors);
      }

      this.element.dispatchEvent(
        new CustomEvent("update", { detail: { ...this.state }, bubbles: true })
      );
    };

    this.element.replaceChildren(this.card.setItems([fields]));

    return this.element;
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
