import { STYLE_MODES, STYLE_CHOICES, STYLE_EDITOR_EVENTS } from "./constants.js";
import CustomStyle from "./customStyle/CustomStyle.js";
import StyleSelector from "./styleSelector/styleSelector.js";
import TmsStyle from "./tmsStyle/tmsStyle.js";
import LegendSelector from "../legendSelector/legendSelector.js";

/**
 * Sélecteur du mode de création d'un style de couche.
 * @param {Object} [options={}] Options de la couche : geometry, fields et layerId.
 * @returns {void}
 */
const StyleEditor = function (options = {}) {
  this.options = { ...options };
  this.activeMode = STYLE_MODES.EXISTING;
  this.element = document.createElement("div");
  this.element.className = "style-editor";
  this.customStyle = new CustomStyle(options);
  this.styleSelector = new StyleSelector(options);
  this.tmsStyle = new TmsStyle();
  this.legendSelector = new LegendSelector();
  this.layerId = options.layerId || null;
  this.element.addEventListener(STYLE_EDITOR_EVENTS.LOAD_OPTIONS, (event) => {
    this.reset(event.detail);
  });
  this.element.addEventListener(STYLE_EDITOR_EVENTS.SHOW_FIELDS, (event) => {
    if (event.detail.layerId !== this.layerId) return;

    this.setFields(event.detail.fields);
  });
};

/**
 * Charge les options et reconstruit les composants de style.
 * Conserve le formulaire de légende et ses valeurs pendant le chargement WMS.
 * Les options absentes conservent leur valeur précédente.
 * @param {Object} [options={}] Options à charger.
 * @param {string} [options.geometry] Type de géométrie.
 * @param {string[]} [options.fields] Champs disponibles.
 * @param {string|null} [options.layerId] Identifiant de la couche.
 * @returns {void} Recharge le contenu et ses événements sans changer le mode actif.
 */
StyleEditor.prototype.reset = function (options = {}) {
  if (options.layerId && options.layerId !== this.layerId) {
    this.options.fields = [];
  }
  this.options = { ...this.options, ...options };
  this.layerId = this.options.layerId || null;
  this.customStyle = new CustomStyle(this.options);
  this.styleSelector = new StyleSelector(this.options);
  this.tmsStyle = new TmsStyle();
  this.render();
};

/**
 * Met à jour le choix actif et l'état accessible des boutons.
 * @param {string} mode Mode sélectionné.
 * @returns {void}
 */
StyleEditor.prototype.setActiveMode = function (mode) {
  if (mode === STYLE_MODES.CUSTOM && this.layerId) {
    const layer = config.temp.layers[this.layerId];
    if (layer && layer.fields) this.setFields(Object.keys(layer.fields));
  }
  this.activeMode = mode;
  this.element.querySelectorAll("[data-style-mode]").forEach((button) => {
    const isActive = button.dataset.styleMode === mode;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", isActive);
  });
  this.customStyle.element.classList.toggle("d-none", mode !== STYLE_MODES.CUSTOM);
  this.styleSelector.element.classList.toggle("d-none", mode !== STYLE_MODES.EXISTING);
  this.tmsStyle.element.classList.toggle("d-none", mode !== STYLE_MODES.EXISTING);
};

/**
 * Construit les boutons et leurs événements de sélection.
 * @returns {HTMLElement} Élément du composant.
 */
StyleEditor.prototype.render = function () {
  this.element.innerHTML = `<div class="import-type-buttons__actions">${STYLE_CHOICES.map(
    (choice) => `
    <button type="button" class="import-type-buttons__button" data-style-mode="${choice.mode}" id="${choice.id}">
      <span class="import-type-buttons__title">${choice.label}</span>
    </button>
  `
  ).join("")}</div>`;
  this.element.append(
    this.styleSelector.render(),
    this.tmsStyle.render(),
    this.customStyle.render(),
    this.legendSelector.render()
  );

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

StyleEditor.prototype.setLayerId = function (layerId) {
  this.reset({ layerId });
};

/**
 * Conserve les champs pour les prochains panneaux et actualise les panneaux existants.
 * @param {string[]} fields Champs disponibles pour la couche active.
 * @returns {void}
 */
StyleEditor.prototype.setFields = function (fields) {
  this.options.fields = fields;
  this.customStyle.setFields(fields);
};

export default StyleEditor;
