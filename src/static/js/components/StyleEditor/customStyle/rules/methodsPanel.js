import { CLASSIFICATION_METHODS } from "../../constants.js";

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

    this.element.className = "style-methods style-fields";
  }

  /** @returns {HTMLElement} Champs de la méthode choisie. */
  render() {
    this.element.replaceChildren();

    if (this.type === "simple") return this.element;

    this.element.innerHTML = `
      <label data-field-label>
        Champ à représenter
        <select class="form-control" name="field" required>
          <option value="">Choisir un champ</option>
        </select>
      </label>
    `;

    if (this.type === "categorized") {
      const label = this.element.querySelector("[data-field-label]");

      label.firstChild.textContent = "Champ à catégoriser ⓘ";

      label.title =
        "Il est recommandé d’utiliser 7 catégories. Jusqu’à 10 catégories restent possibles, mais la lisibilité peut diminuer.";
    }

    const select = this.element.querySelector('[name="field"]');

    this.fields.forEach((field) => select.add(new Option(field, field)));

    select.value = this.state.field;

    if (this.type !== "categorized") {
      this.element.insertAdjacentHTML(
        "beforeend",
        `<label>Titre de la légende<input class="form-control" name="legend"></label><label>Méthode de classification<select class="form-control" name="method"></select></label><label title="Il est recommandé d’utiliser 5 classes. Jusqu’à 7 classes restent possibles, mais la lisibilité peut diminuer.">Nombre de classes ⓘ<input class="form-control" name="classes" type="number" min="1" max="7" required></label>`
      );

      const method = this.element.querySelector('[name="method"]');

      this.methods.forEach((item) => method.add(new Option(item.label, item.value)));

      for (const name of ["legend", "method", "classes"])
        this.element.querySelector(`[name="${name}"]`).value = this.state[name];
    }

    this.element.insertAdjacentHTML(
      "beforeend",
      `
      <div class="style-methods__actions">
        <button type="button" class="btn btn-primary">Calculer</button>
      </div>
    `
    );

    const calculate = this.element.querySelector("button");

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

    return this.element;
  }

  /** Synchronise les paramètres avec les valeurs actuelles des champs. */
  readState() {
    this.element.querySelectorAll("input, select").forEach((input) => {
      this.state[input.name] = input.value;

      if (input.type === "number") this.state[input.name] = input.valueAsNumber;
    });
  }
}
