import { CLASSIFICATION_METHODS, CLASSIFICATION_TOOLTIPS } from "../../constants.js";
import Tooltip from "../../../tooltip/tooltip.js";
import Select from "../../../select/select.js";
import ListCard from "../../../listCard/listCard.js";

/** Champs de classification ; émet update sans calculer de classes. */
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
      ...state,
    };

    this.element = document.createElement("div");

    this.element.className = "style-methods";
    this.card = new ListCard({ title: "Paramètres de classification" });
    this.fieldSelect = new Select({
      label: "Champ à représenter",
      placeholder: "Choisir un champ",
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

      title.textContent = "Champ à catégoriser ";
      new Tooltip({ message: CLASSIFICATION_TOOLTIPS.categories }).appendTo(title);
    }

    if (this.type !== "categorized") {
      fields.insertAdjacentHTML(
        "beforeend",
        `
        <label>Titre de la légende<input class="form-control" name="legend" /></label>
        <label>
          Méthode de classification
          <select class="form-control" name="method"></select>
        </label>
        <label>
          <span data-classes-title>Nombre de classes </span>
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

      new Tooltip({ message: CLASSIFICATION_TOOLTIPS.classes }).appendTo(
        this.element.querySelector("[data-classes-title]")
      );

      const method = this.element.querySelector('[name="method"]');

      this.methods.forEach((item) => method.add(new Option(item.label, item.value)));

      for (const name of ["legend", "method", "classes"])
        this.element.querySelector(`[name="${name}"]`).value = this.state[name];
    }

    fields.insertAdjacentHTML(
      "beforeend",
      `
      <div class="style-methods__actions">
        <button type="button" class="btn btn-primary">Calculer</button>
      </div>
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

    this.element.onchange = () => {
      this.readState();

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
