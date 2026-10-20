import { STYLE_MODES, STYLE_CHOICES, STYLE_EDITOR_EVENTS, STYLE_TYPES, DEFAULT_SYMBOL } from "./constants.js";
import CustomStyle from "./customStyle/CustomStyle.js";
import StyleSelector from "./styleSelector/styleSelector.js";
import TmsStyle from "./tmsStyle/tmsStyle.js";
import LegendSelector from "../legendSelector/legendSelector.js";
import { analyse, categorize } from "../../utils/styler/methods.js";
import { createColorRampScales, crandomColorBClass } from "../../utils/styler/rampColor.js";
import { calculateCircleSizes } from "../../utils/styler/circleSizes.js";

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
  this.element.addEventListener("calculate", (event) => this.calculate(event));
  this.element.addEventListener(STYLE_EDITOR_EVENTS.LOAD_OPTIONS, (event) => {
    this.reset(event.detail);
  });
  this.element.addEventListener(STYLE_EDITOR_EVENTS.SHOW_FIELDS, (event) => {
    if (event.detail.layerId !== this.layerId) return;

    this.setFields(event.detail.fields);
  });
};

/**
 * Charge les valeurs WFS du champ choisi et remplit les règles de classification.
 * @param {CustomEvent} event Paramètres du calcul et fonction de mise à jour des règles.
 * @returns {Promise<void>} Actualise les règles ou affiche l'erreur dans le panneau.
 */
StyleEditor.prototype.calculate = async function (event) {
  const { field, method, classes, color, reverseColors, maxSize = DEFAULT_SYMBOL.maxSize, type, geometry, ruleMode, setRules } = event.detail;
  const { styleProp } = STYLE_TYPES.find((definition) => definition.value === type);
  const button = event.target.querySelector(".style-methods__actions button");
  const message = event.target.querySelector("[data-classification-error]");
  const layerId = this.layerId;
  const customStyle = this.customStyle;

  button.disabled = true;
  message.textContent = "";
  message.classList.add("d-none");

  try {
    const layer = config.temp.layers[layerId];
    if (!layer || !layer.wfs_url) {
      throw new Error(mviewer.tr("style_editor.error.no_wfs"));
    }

    const url = ogc.urlToObject(layer.wfs_url, {
      SERVICE: "WFS",
      VERSION: "1.0.0",
      REQUEST: "GETFEATURE",
      OUTPUTFORMAT: "application/json",
      TYPENAME: layerId,
      PROPERTYNAME: field,
    });
    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(mviewer.tr("style_editor.error.load_values"));
    }
    const collection = await response.json();
    if (!Array.isArray(collection.features)) {
      throw new Error(mviewer.tr("style_editor.error.invalid_data"));
    }
    const data = collection.features.map((feature) => feature.properties);
    let rules;

    if (styleProp.includes("randomColor")) {
      const values = categorize(data, field);
      if (values.length > 10) {
        throw new Error(mviewer.tr("style_editor.error.too_many_categories"));
      }
      rules = values.map((value) => ({ name: `${value}`, value }));
    } else {
      const boundaries = analyse(data, field, method, classes);
      if (boundaries.length === 1) boundaries.push(boundaries[0]);
      rules = boundaries.slice(1).map((max, index) => ({
        name: `${boundaries[index]} – ${max}`,
        min: boundaries[index],
        max,
      }));
    }

    if (rules.length === 0) {
      throw new Error(mviewer.tr("style_editor.error.no_classes"));
    }
    let colors;
    if (styleProp.includes("randomColor")) {
      colors = crandomColorBClass(globalThis.chroma.random().hex(), rules.length);
    } else if (styleProp.includes("ramps")) {
      colors = createColorRampScales(color, rules.length, reverseColors);
    } else {
      colors = Array(rules.length).fill(color);
    }
    const proportional = type === "proportionalCircles" || ruleMode === "size";
    let sizes;
    if (proportional) sizes = calculateCircleSizes(rules, maxSize);
    rules.forEach((rule, index) => {
      if (proportional) {
        rule.symbol = { ...DEFAULT_SYMBOL, shape: "circle", minSize: sizes[index], maxSize: sizes[index] };
      }
      if (ruleMode === "size") return;
      if (geometry === "LineString") {
        rule.stroke = { color: colors[index] };
      } else {
        rule.fill = { color: colors[index] };
      }
    });
    if (this.layerId === layerId && this.customStyle === customStyle) setRules(rules);
  } catch (error) {
    message.textContent = error.message;
    message.classList.remove("d-none");
  } finally {
    button.disabled = false;
  }
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
      <span class="import-type-buttons__title">${mviewer.tr(choice.label)}</span>
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
