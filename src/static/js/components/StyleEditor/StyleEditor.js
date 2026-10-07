import { STYLE_MODES, STYLE_CHOICES } from "./constants.js";
import CustomStyle from "./customStyle/CustomStyle.js";

/**
 * Sélecteur du mode de création d'un style de couche.
 * @returns {void}
 */
const StyleEditor = function (options = {}) {
  this.activeMode = STYLE_MODES.EXISTING;
  this.element = document.createElement("div");
  this.element.className = "style-editor";
  this.customStyle = new CustomStyle(options);
};

/**
 * Met à jour le choix actif et l'état accessible des boutons.
 * @param {string} mode Mode sélectionné.
 * @returns {void}
 */
StyleEditor.prototype.setActiveMode = function (mode) {
  this.activeMode = mode;
  this.element.querySelectorAll("[data-style-mode]").forEach((button) => {
    const isActive = button.dataset.styleMode === mode;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", isActive);
  });
  this.customStyle.element.classList.toggle("d-none", mode !== STYLE_MODES.CUSTOM);
};

/**
 * Construit les boutons et leurs événements de sélection.
 * @returns {HTMLElement} Élément du composant.
 */
StyleEditor.prototype.render = function () {
  this.element.innerHTML = `<div class="import-type-buttons__actions">${STYLE_CHOICES.map(
    (choice) => `
    <button type="button" class="import-type-buttons__button" data-style-mode="${choice.mode}">
      <span class="import-type-buttons__title">${choice.label}</span>
    </button>
  `
  ).join("")}</div>`;
  this.element.appendChild(this.customStyle.render());

  this.element.querySelectorAll("[data-style-mode]").forEach((button) => {
    button.addEventListener("click", () => this.setActiveMode(button.dataset.styleMode));
  });
  this.setActiveMode(this.activeMode);
  return this.element;
};

/**
 * Monte le sélecteur dans le conteneur fourni.
 * @param {HTMLElement} target Conteneur de destination.
 * @returns {HTMLElement} Élément du composant.
 */
StyleEditor.prototype.appendTo = function (target) {
  target.replaceChildren(this.render());
  return this.element;
};

export default StyleEditor;
