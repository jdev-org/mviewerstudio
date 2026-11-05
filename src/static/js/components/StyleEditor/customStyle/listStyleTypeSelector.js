import { STYLE_TYPES, REPRESENTATION_SUPPORT_LABELS } from "../constants.js";

/**
 * Liste des modes de représentation disponibles.
 * @returns {void}
 */
const ListStyleTypeSelector = function (geometry = "Point", supports = []) {
  this.geometry = geometry;
  this.grouped = supports.length > 1;
  let geometries = [geometry];
  if (this.grouped) geometries = supports.map((support) => support.geometry);
  this.types = geometries.flatMap((supportGeometry) =>
    STYLE_TYPES.filter((type) => type.geom.includes(supportGeometry)).map((type) => ({
      ...type,
      geometry: supportGeometry,
    }))
  );
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
    <div class="style-type-selector__label" role="group" aria-label="${mviewer.tr("style_editor.representation")}">
      <span>${mviewer.tr("style_editor.representation")}</span>
        <div class="dropdown">
          <button type="button" class="style-type-selector__card dropdown-toggle style-type-selector__select" data-bs-toggle="dropdown" data-bs-display="static" aria-expanded="false">
            <img class="style-type-selector__preview" alt="" width="40" height="40">
            <span class="style-type-selector__content style-type-selector__selection">
              <span class="style-type-selector__title"></span>
              <span class="style-type-selector__description"></span>
            </span>
          </button>
          <ul class="dropdown-menu style-type-selector__menu">
            ${this.types.map((type, index) => this.renderType(type, index)).join("")}
          </ul>
        </div>
    </div>
  `;
  this.updateSelection();
  this.element.querySelectorAll("[data-style-type]").forEach((button) => {
    button.addEventListener("click", () => {
      this.value = button.dataset.styleType;
      this.geometry = button.dataset.styleGeometry;
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
 * Construit une représentation et le titre de son groupe si nécessaire.
 * @param {Object} type Définition et géométrie de la représentation.
 * @param {number} index Position dans la liste.
 * @returns {string} HTML de l'option et de son éventuel titre de groupe.
 */
ListStyleTypeSelector.prototype.renderType = function (type, index) {
  let heading = "";
  if (this.grouped && (index === 0 || this.types[index - 1].geometry !== type.geometry)) {
    heading = `<li><h6 class="dropdown-header">${mviewer.tr(REPRESENTATION_SUPPORT_LABELS[type.geometry])}</h6></li>`;
  }
  return `
    ${heading}
    <li>
      <button type="button" class="dropdown-item" data-style-type="${type.value}" data-style-geometry="${type.geometry}">
        <img class="style-type-selector__preview" src="${type.img}" alt="" width="40" height="40">
        <span class="style-type-selector__content">
          <span class="style-type-selector__title">${mviewer.tr(type.label)}</span>
          <span class="style-type-selector__description">${mviewer.tr(type.description)}</span>
        </span>
      </button>
    </li>
  `;
};

/**
 * Actualise l'aperçu, les deux lignes du bouton et le choix actif dans le menu.
 * @returns {void}
 */
ListStyleTypeSelector.prototype.updateSelection = function () {
  const selectedType = this.types.find(
    (type) => type.value === this.value && type.geometry === this.geometry
  );
  this.element.querySelector(".style-type-selector__preview").src = selectedType.img;
  const selection = this.element.querySelector(".style-type-selector__selection");
  selection.querySelector(".style-type-selector__title").textContent = mviewer.tr(
    selectedType.label
  );
  if (this.grouped) {
    selection.querySelector(".style-type-selector__title").textContent +=
      ` — ${mviewer.tr(REPRESENTATION_SUPPORT_LABELS[this.geometry])}`;
  }
  selection.querySelector(".style-type-selector__description").textContent = mviewer.tr(
    selectedType.description
  );
  this.element.querySelectorAll("[data-style-type]").forEach((button) => {
    const isActive =
      button.dataset.styleType === this.value &&
      button.dataset.styleGeometry === this.geometry;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", isActive);
  });
};

export default ListStyleTypeSelector;
