import {
  STYLE_MODES,
  STYLE_CHOICES,
  STYLE_EDITOR_EVENTS,
  STYLE_TYPES,
  DEFAULT_SYMBOL,
  CLASSIFICATION_LIMITS,
} from "./constants.js";
import CustomStyle from "./customStyle/CustomStyle.js";
import StyleSelector from "./styleSelector/styleSelector.js";
import TmsStyle from "./tmsStyle/tmsStyle.js";
import LegendSelector from "../legendSelector/legendSelector.js";
import StylerLabels from "./labels/stylerLabels.js";
import { analyse, categorize } from "../../utils/styler/methods.js";
import {
  createColorRampScales,
  crandomColorBClass,
} from "../../utils/styler/rampColor.js";
import { calculateCircleSizes } from "../../utils/styler/circleSizes.js";
import { getStyleGeometry } from "../../utils/styler/style.js";
import { loadSldStyle } from "../../utils/styler/readStyle.js";

/**
 * Sélecteur du mode de création d'un style de couche.
 * @param {Object} [options={}] Options de la couche : geometry, fields et layerId.
 * @returns {void}
 */
const StyleEditor = function (options = {}) {
  this.options = { ...options };
  this.activeMode =
    options.styleMode || (options.customsld ? STYLE_MODES.CUSTOM : STYLE_MODES.EXISTING);
  this.loadingCustomStyle = false;
  this.styleLoadError = null;
  this.element = document.createElement("div");
  this.element.className = "style-editor";
  this.customStyle = new CustomStyle({ ...options, state: options.customStyle });
  this.customStyle.geoStylerStyle = structuredClone(options.geoStylerStyle || null);
  this.createLabels();
  this.styleSelector = new StyleSelector(options);
  this.tmsStyle = new TmsStyle();
  this.legendSelector = new LegendSelector();
  this.layerId = options.layerId || null;
  this.element.addEventListener("calculate", (event) => this.calculate(event));
  this.element.addEventListener(STYLE_EDITOR_EVENTS.LOAD_OPTIONS, (event) => {
    this.reset(event.detail);
  });
  this.element.addEventListener(STYLE_EDITOR_EVENTS.SHOW_FIELDS, (event) => {
    // Les réponses WFS peuvent arriver après la sélection d'une autre couche.
    if (event.detail.layerId !== this.layerId) return;

    this.setFields(event.detail.fields);
    this.setGeometry(event.detail.geometry);
    if (event.detail.feature) this.labels.preview.setFeature(event.detail.feature);
  });
  this.element.addEventListener(STYLE_EDITOR_EVENTS.SAVE, (event) => {
    // Un SLD illisible ou un formulaire incomplet ne doit pas écraser le style enregistré.
    if (this.activeMode === STYLE_MODES.CUSTOM) {
      if (this.loadingCustomStyle || this.styleLoadError) {
        event.preventDefault();
        return;
      }
      const inputs = [
        ...this.customStyle.element.querySelectorAll("input, select"),
        ...this.labels.element.querySelectorAll("input, select"),
      ];
      if (!inputs.every((input) => input.reportValidity())) {
        event.preventDefault();
        return;
      }
    }
    // Le déclencheur de l'événement attend cette promesse avant de poursuivre la sauvegarde.
    event.detail.promise = this.saveToLayer(
      event.detail.layer,
      event.detail.name,
      event.detail.mapId
    );
  });
  if (options.customsld && options.sld && !options.customStyle) {
    this.customStyleLoadPromise = this.loadCustomStyle();
  }
};

/**
 * Précharge le SLD Studio et ignore les réponses d'une couche quittée entre-temps.
 * @returns {Promise<void>} Restaure le formulaire ou affiche l'erreur de lecture.
 */
StyleEditor.prototype.loadCustomStyle = async function () {
  // Ce jeton permet à reset() ou à un nouveau chargement d'invalider la réponse en cours.
  const request = {};
  this.styleLoadRequest = request;
  this.loadingCustomStyle = true;
  this.styleLoadError = null;
  this.updateLoadStatus();
  try {
    const saved = await loadSldStyle(this.options.sld);
    if (this.styleLoadRequest !== request) return;
    this.options.customStyle = saved.configuration;
    this.options.geoStylerStyle = saved.geoStylerStyle;
    this.options.geometry = saved.configuration.geometry;
    this.customStyle = new CustomStyle({ ...this.options, state: saved.configuration });
    this.customStyle.geoStylerStyle = structuredClone(saved.geoStylerStyle);
    if (saved.configuration.labels) this.createLabels();
    this.customStyle.labels = this.labels;
    this.loadingCustomStyle = false;
    this.render();
  } catch (error) {
    if (this.styleLoadRequest !== request) return;
    this.loadingCustomStyle = false;
    this.styleLoadError = error;
    this.updateLoadStatus();
  }
};

/** Affiche le chargement ou son erreur et protège le formulaire pendant la lecture.
 * @returns {void}
 */
StyleEditor.prototype.updateLoadStatus = function () {
  const failed = this.styleLoadError !== null;
  this.customStyle.element.inert = this.loadingCustomStyle || failed;
  this.labels.element.inert = this.loadingCustomStyle || failed;
  this.customStyle.element.setAttribute("aria-busy", this.loadingCustomStyle);
  const status = this.element.querySelector("[data-style-load-status]");
  if (!status) return;
  status.textContent = "";
  if (this.loadingCustomStyle)
    status.textContent = mviewer.tr("style_editor.loading_sld");
  if (this.styleLoadError) status.textContent = mviewer.tr("style_editor.error.load_sld");
  status.classList.toggle("text-danger", failed);
};

/**
 * Adapte le style à la géométrie identifiée par le WFS.
 * Un type incompatible est remplacé par une représentation uniforme.
 * @param {string} geometry Type de géométrie GML ou GeoJSON.
 * @returns {void} Reconstruit les panneaux lorsque la géométrie change.
 */
StyleEditor.prototype.setGeometry = function (geometry) {
  const styleGeometry = getStyleGeometry(geometry);
  if (!styleGeometry || styleGeometry === this.customStyle.geometry) return;

  const state = this.customStyle.getValue();
  const definition = STYLE_TYPES.find((type) => type.value === state.type);
  state.geometry = styleGeometry;
  if (!definition.geom.includes(styleGeometry)) {
    state.type = "simple";
    state.rules = state.rules.slice(0, 1);
    delete state.colorClassification;
  }
  this.options.geometry = styleGeometry;
  this.options.customStyle = state;
  this.customStyle = new CustomStyle({ ...this.options, state });
  this.customStyle.labels = this.labels;
  this.render();
};

/**
 * Enregistre le style personnalisé et son formulaire sur la couche.
 * @param {Object} layer Couche modifiée par les options.
 * @param {string} name Nom du style.
 * @param {string} mapId Identifiant de la carte.
 * @returns {Promise<void>} Actualise la couche après la sauvegarde des deux fichiers.
 */
StyleEditor.prototype.saveToLayer = async function (layer, name, mapId) {
  const mode = this.activeMode;
  if (mode === STYLE_MODES.CUSTOM && (this.loadingCustomStyle || this.styleLoadError)) {
    throw new Error(mviewer.tr("style_editor.error.load_sld"));
  }
  const customStyle = this.customStyle;
  if (mode === STYLE_MODES.CUSTOM) {
    const saved = await customStyle.save(mapId, name, layer.id);
    layer.customStyle = saved.configuration;
    layer.geoStylerStyle = saved.geoStylerStyle;
    layer.styleId = saved.styleId;
    layer.sld = saved.sld.filepath;
    layer.customsld = true;
    layer.jsonStyle = saved.json.filepath;
    // La couche d'origine est sauvegardée, mais le formulaire a pu changer pendant l'appel.
    if (this.customStyle === customStyle) {
      this.options.customStyle = structuredClone(layer.customStyle);
      this.options.geoStylerStyle = structuredClone(layer.geoStylerStyle);
      this.options.sld = layer.sld;
      this.options.customsld = true;
    }
  } else {
    layer.customsld = false;
    this.options.customsld = false;
  }
  layer.styleMode = mode;
  if (this.customStyle === customStyle) this.options.styleMode = mode;
};

/**
 * Classifie le champ choisi à partir des données CSV authentifiées ou des entités WFS.
 * @param {CustomEvent} event Paramètres de classification et fonction de mise à jour des règles.
 * @returns {Promise<void>} Actualise les règles ou affiche l'erreur dans le panneau.
 */
StyleEditor.prototype.calculate = async function (event) {
  const {
    field,
    method,
    classes,
    color,
    reverseColors,
    maxSize = DEFAULT_SYMBOL.maxSize,
    type,
    geometry,
    ruleMode,
    setRules,
  } = event.detail;
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
    let data;
    if (layer && layer.type === "csv") {
      if (!Array.isArray(layer.csvData)) {
        throw new Error(mviewer.tr("style_editor.error.csv_not_loaded"));
      }
      data = layer.csvData;
      // Les catégories conservent leur texte ; les analyses numériques acceptent la virgule décimale.
      if (!styleProp.includes("randomColor")) {
        data = data.map((record) => {
          let value = record[field];
          if (typeof value === "string") {
            value = value.trim();
            if (value === "") value = null;
            else value = +value.replace(",", ".");
          }
          return { [field]: value };
        });
      }
    } else {
      if (!layer || !layer.wfs_url) {
        throw new Error(mviewer.tr("style_editor.error.no_wfs"));
      }
      // La classification utilise toutes les valeurs du champ, au-delà de l'entité de preview.
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
      data = collection.features.map((feature) => feature.properties);
    }
    let rules;

    if (styleProp.includes("randomColor")) {
      const values = categorize(data, field);
      if (values.length > CLASSIFICATION_LIMITS.categories.max) {
        throw new Error(
          mviewer
            .tr("style_editor.error.too_many_categories")
            .replace("{max}", CLASSIFICATION_LIMITS.categories.max)
        );
      }
      rules = values.map((value) => ({ name: `${value}`, value }));
    } else {
      const boundaries = analyse(data, field, method, classes);
      // Une série constante produit une seule borne : la dupliquer crée une classe min = max.
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
        rule.symbol = {
          ...DEFAULT_SYMBOL,
          shape: "circle",
          minSize: sizes[index],
          maxSize: sizes[index],
        };
      }
      // Dans le style combiné, les règles de taille laissent la couleur à l'autre classification.
      if (ruleMode === "size") return;
      if (geometry === "LineString") {
        rule.stroke = { color: colors[index] };
      } else {
        rule.fill = { color: colors[index] };
      }
    });
    // Un résultat tardif ne doit pas remplacer les règles d'un panneau reconstruit entre-temps.
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
 * @returns {void} Recharge le contenu et restaure le mode enregistré sur la couche.
 */
StyleEditor.prototype.reset = function (options = {}) {
  this.styleLoadRequest = null;
  this.loadingCustomStyle = false;
  this.styleLoadError = null;
  // Un rafraîchissement WMS conserve les options ; un changement de couche efface l'ancien style.
  if (options.layerId && options.layerId !== this.layerId) {
    this.options.fields = [];
    this.options.customStyle = null;
    this.options.geoStylerStyle = null;
    this.options.styleMode = STYLE_MODES.EXISTING;
    this.options.sld = null;
    this.options.customsld = false;
  }
  this.options = { ...this.options, ...options };
  if (options.customsld && !options.styleMode)
    this.options.styleMode = STYLE_MODES.CUSTOM;
  this.layerId = this.options.layerId || null;
  this.customStyle = new CustomStyle({
    ...this.options,
    state: this.options.customStyle,
  });
  this.customStyle.geoStylerStyle = structuredClone(this.options.geoStylerStyle || null);
  this.createLabels();
  this.activeMode =
    this.options.styleMode ||
    (this.options.customsld ? STYLE_MODES.CUSTOM : STYLE_MODES.EXISTING);
  this.styleSelector = new StyleSelector(this.options);
  this.tmsStyle = new TmsStyle();
  this.render();
  if (this.options.customsld && this.options.sld && !this.options.customStyle) {
    this.customStyleLoadPromise = this.loadCustomStyle();
  }
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
  this.legendSelector.element.hidden = mode === STYLE_MODES.CUSTOM;
  this.labels.element.hidden = mode !== STYLE_MODES.CUSTOM;
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
  ).join("")}</div><p role="status" data-style-load-status></p>`;
  // Réutiliser les éléments des composants conserve leurs valeurs et leurs écouteurs.
  this.element.append(
    this.styleSelector.render(),
    this.tmsStyle.render(),
    this.customStyle.render(),
    this.legendSelector.render(),
    this.labels.render()
  );

  this.element.querySelectorAll("[data-style-mode]").forEach((button) => {
    button.addEventListener("click", () => this.setActiveMode(button.dataset.styleMode));
  });
  this.setActiveMode(this.activeMode);
  this.updateLoadStatus();
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

/**
 * Change la couche active et reconstruit ses panneaux via le chargement des options.
 * @param {string} layerId Identifiant de la couche à éditer.
 * @returns {void}
 */
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
  this.labels.setFields(fields);
};

/** Initialise les étiquettes et les rattache au style à sauvegarder.
 * @returns {void}
 */
StyleEditor.prototype.createLabels = function () {
  let scales = this.options.labelScales;
  if (!scales && typeof _conf !== "undefined") scales = _conf.labelScales;
  let state = {};
  if (this.options.customStyle) state = this.options.customStyle.labels;
  let feature = null;
  // Réutiliser l'entité WFS déjà chargée évite une nouvelle requête pour la preview.
  if (this.options.layerId && typeof config !== "undefined") {
    const layer = config.temp.layers[this.options.layerId];
    if (layer && layer.features && layer.features.length) feature = layer.features[0];
  }
  this.labels = new StylerLabels({ fields: this.options.fields, state, scales, feature });
  this.customStyle.labels = this.labels;
};

export default StyleEditor;
