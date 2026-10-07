import { STYLE_TYPES } from "../constants.js";

/**
 * Liste des modes de représentation disponibles.
 * @returns {void}
 */
const ListStyleTypeSelector = function (geometry = "Point") {
  this.types = STYLE_TYPES.filter((type) => type.geom.includes(geometry));
  this.value = this.types[0].value;
  this.element = document.createElement("div");
  this.element.className = "style-type-selector";
};

/**
 * Construit la liste et actualise la description du mode sélectionné.
 * @returns {HTMLElement} Élément du composant.
 */
ListStyleTypeSelector.prototype.render = function () {
  this.element.innerHTML = `
    <label class="style-type-selector__label">
      <span>Mode de représentation</span>
      <span class="style-type-selector__card">
        <span class="style-type-selector__preview" aria-hidden="true"></span>
        <span class="style-type-selector__content">
          <select class="form-control style-type-selector__select">
            ${this.types.map((type) => `<option value="${type.value}">${type.label}</option>`).join("")}
          </select>
          <span class="style-type-selector__description"></span>
        </span>
      </span>
    </label>
  `;
  const select = this.element.querySelector("select");
  const description = this.element.querySelector(".style-type-selector__description");
  select.value = this.value;
  description.textContent = this.types.find(
    (type) => type.value === this.value
  ).description;
  select.addEventListener("change", () => {
    const selectedType = STYLE_TYPES.find((type) => type.value === select.value);
    description.textContent = selectedType.description;
    this.value = select.value;
    this.element.dispatchEvent(
      new CustomEvent("style-type-change", { detail: this.value, bubbles: true })
    );
  });
  return this.element;
};

export default ListStyleTypeSelector;
