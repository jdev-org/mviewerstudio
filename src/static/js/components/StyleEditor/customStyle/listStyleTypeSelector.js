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
 * Construit la liste avec les descriptions et actualise l'image du mode sélectionné.
 * @returns {HTMLElement} Élément du composant.
 */
ListStyleTypeSelector.prototype.render = function () {
  this.element.innerHTML = `
    <div class="style-type-selector__label" role="group" aria-label="Mode de représentation">
      <span>Mode de représentation</span>
        <div class="dropdown">
          <button type="button" class="style-type-selector__card dropdown-toggle style-type-selector__select" data-bs-toggle="dropdown" data-bs-display="static" aria-expanded="false">
            <img class="style-type-selector__preview" alt="" width="40" height="40">
            <span class="style-type-selector__content style-type-selector__selection">
              <span class="style-type-selector__title"></span>
              <span class="style-type-selector__description"></span>
            </span>
          </button>
          <ul class="dropdown-menu style-type-selector__menu">
            ${this.types
              .map(
                (type) => `
              <li>
                <button type="button" class="dropdown-item" data-style-type="${type.value}">
                  <img class="style-type-selector__preview" src="${type.img}" alt="" width="40" height="40">
                  <span class="style-type-selector__content">
                    <span class="style-type-selector__title">${type.label}</span>
                    <span class="style-type-selector__description">${type.description}</span>
                  </span>
                </button>
              </li>`
              )
              .join("")}
          </ul>
        </div>
    </div>
  `;
  this.updateSelection();
  this.element.querySelectorAll("[data-style-type]").forEach((button) => {
    button.addEventListener("click", () => {
      this.value = button.dataset.styleType;
      this.updateSelection();
      this.element.dispatchEvent(
        new CustomEvent("style-type-change", { detail: this.value, bubbles: true })
      );
      this.element.querySelector(".style-type-selector__select").focus();
    });
  });
  return this.element;
};

/**
 * Actualise l'aperçu, les deux lignes du bouton et le choix actif dans le menu.
 * @returns {void}
 */
ListStyleTypeSelector.prototype.updateSelection = function () {
  const selectedType = this.types.find((type) => type.value === this.value);
  this.element.querySelector(".style-type-selector__preview").src = selectedType.img;
  const selection = this.element.querySelector(".style-type-selector__selection");
  selection.querySelector(".style-type-selector__title").textContent = selectedType.label;
  selection.querySelector(".style-type-selector__description").textContent =
    selectedType.description;
  this.element.querySelectorAll("[data-style-type]").forEach((button) => {
    const isActive = button.dataset.styleType === this.value;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", isActive);
  });
};

export default ListStyleTypeSelector;
