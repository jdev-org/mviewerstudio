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
import stylerLabels from "./labels/stylerLabels.js";
import { analyse, categorize } from "../../utils/styler/methods.js";
import {
  createColorRampScales,
  crandomColorBClass,
} from "../../utils/styler/rampColor.js";
import { createClusterClasses } from "../../utils/styler/cluster.js";
import { calculateCircleSizes } from "../../utils/styler/circleSizes.js";
import { getStyleGeometry } from "../../utils/styler/style.js";
import { loadSldStyle } from "../../utils/styler/readStyle.js";
import GristStyleSource from "./customStyle/gristStyleSource.js";
import { prepareGristRepresentation } from "../../utils/styler/referential.js";
import { clearGristCsv } from "../../utils/grist/csvSource.js";

/**
 * Sélecteur du mode de création d'un style de couche.
 * @param {Object} [options={}] Options de la couche : geometry, fields et layerId.
 * @returns {void}
 */
const styleEditor = function (options = {}) {
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
  const refreshPreviewStyle = () => {
    if (this.customStyle.preview) this.customStyle.preview.refreshStyle();
  };
  this.element.addEventListener("input", refreshPreviewStyle);
  this.element.addEventListener("change", refreshPreviewStyle);
  this.element.addEventListener("update", refreshPreviewStyle);
  this.element.addEventListener(STYLE_EDITOR_EVENTS.GEOMETRY_CHANGE, (event) => {
    if (this.options.type !== "csv" || this.activeMode !== STYLE_MODES.CUSTOM) return;
    this.styleLoadRequest = null;
    this.loadingCustomStyle = false;
    this.styleLoadError = null;
    this.options.geometry = event.detail.geometry;
    this.options.customStyle = null;
    this.options.geoStylerStyle = null;
    this.options.customsld = false;
    this.options.sld = null;
    this.createLabels();
    this.render();
  });
  this.element.addEventListener(STYLE_EDITOR_EVENTS.LOAD_OPTIONS, (event) => {
    this.reset(event.detail);
  });
  this.element.addEventListener(STYLE_EDITOR_EVENTS.SHOW_FIELDS, (event) => {
    // Les réponses WFS ou Grist peuvent arriver après la sélection d'une autre couche.
    if (event.detail.layerId !== this.layerId) return;

    this.setFields(event.detail.fields);
    this.setGeometry(event.detail.geometry);
    if (event.detail.feature !== undefined) {
      this.labels.preview.setFeature(event.detail.feature);
    }
    if (this.customStyle.preview) this.customStyle.preview.update();
  });
  this.element.addEventListener(STYLE_EDITOR_EVENTS.SAVE, (event) => {
    // Un SLD illisible ou un formulaire incomplet ne doit pas écraser le style enregistré.
    if (this.activeMode === STYLE_MODES.CUSTOM) {
      if (this.gristSource && !this.gristSource.ready) {
        event.preventDefault();
        return;
      }
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
styleEditor.prototype.loadCustomStyle = async function () {
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
    if (this.customStyle && this.customStyle.preview) this.customStyle.preview.destroy();
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

/**
 * Repart sur un style personnalisé vierge sans modifier la couche avant sauvegarde.
 * @returns {void} Invalide le chargement SLD et reconstruit les panneaux éditables.
 */
styleEditor.prototype.resetCustomStyle = function () {
  this.reset({
    customStyle: null,
    geoStylerStyle: null,
    sld: null,
    customsld: false,
    styleMode: STYLE_MODES.CUSTOM,
    geometry: this.customStyle.geometry,
  });
};

/** Affiche le chargement ou son erreur et protège le formulaire pendant la lecture.
 * @returns {void}
 */
styleEditor.prototype.updateLoadStatus = function () {
  const failed = this.styleLoadError !== null;
  this.customStyle.element.inert = this.loadingCustomStyle || failed;
  this.labels.element.inert = this.loadingCustomStyle || failed;
  this.customStyle.element.setAttribute("aria-busy", this.loadingCustomStyle);
  const status = this.element.querySelector("[data-style-load-status]");
  if (!status) return;
  status.textContent = "";
  status.hidden = !this.loadingCustomStyle && !failed;
  status.className = "";
  status.setAttribute("role", "status");
  if (this.loadingCustomStyle)
    status.textContent = mviewer.tr("style_editor.loading_sld");
  if (failed) {
    status.className = "alert alert-danger d-flex flex-wrap align-items-center justify-content-between gap-2";
    status.setAttribute("role", "alert");
    const message = document.createElement("span");
    message.textContent = mviewer.tr("style_editor.error.load_sld");
    const resetButton = document.createElement("button");
    resetButton.type = "button";
    resetButton.className = "btn btn-outline-danger btn-sm";
    resetButton.textContent = mviewer.tr("style_editor.reset_style");
    resetButton.addEventListener("click", () => this.resetCustomStyle());
    status.append(message, resetButton);
  }
};

/**
 * Adapte le style à la géométrie identifiée par le WFS.
 * Réinitialise uniquement le style personnalisé CSV ; conserve les styles sélectionnés des autres couches.
 * @param {string} geometry Type de géométrie GML ou GeoJSON.
 * @returns {void} Reconstruit les panneaux lorsque la géométrie change.
 */
styleEditor.prototype.setGeometry = function (geometry) {
  if (this.customStyle.supports && this.customStyle.supports.length) return;
  const styleGeometry = getStyleGeometry(geometry);
  if (!styleGeometry || styleGeometry === this.customStyle.geometry) return;

  if (this.options.type !== "csv" || this.activeMode !== STYLE_MODES.CUSTOM) {
    this.options.geometry = styleGeometry;
    return;
  }

  this.styleLoadRequest = null;
  this.loadingCustomStyle = false;
  this.styleLoadError = null;
  this.options.geometry = styleGeometry;
  this.options.customStyle = null;
  this.options.geoStylerStyle = null;
  this.options.customsld = false;
  this.options.sld = null;
  if (this.customStyle.preview) this.customStyle.preview.destroy();
  this.customStyle = new CustomStyle({ ...this.options, state: null });
  this.createLabels();
  this.render();
};

/**
 * Enregistre le style personnalisé et son formulaire sur la couche.
 * @param {Object} layer Couche modifiée par les options.
 * @param {string} name Nom du style.
 * @param {string} mapId Identifiant de la carte.
 * @returns {Promise<void>} Actualise la couche après la sauvegarde des deux fichiers.
 */
styleEditor.prototype.saveToLayer = async function (layer, name, mapId) {
  const mode = this.activeMode;
  if (mode === STYLE_MODES.CUSTOM && (this.loadingCustomStyle || this.styleLoadError)) {
    throw new Error(mviewer.tr("style_editor.error.load_sld"));
  }
  const customStyle = this.customStyle;
  if (mode === STYLE_MODES.CUSTOM) {
    let support;
    if (customStyle.supports)
      support = customStyle.supports.find(
        (item) => item.geometry === customStyle.geometry
      );
    let representationFields;
    if (support && layer.type === "csv") {
      const data = config.temp.layers[this.layerId] || {};
      representationFields = await prepareGristRepresentation(
        layer,
        data,
        support,
        this.gristSource
      );
    }
    let layerName = layer.id;
    if (support && layer.type === "wms") layerName = support.layerName;
    const saved = await customStyle.save(mapId, name, layerName);
    if (support) {
      layer.gristReferential = support.referential.layer_name;
      if (layer.type === "csv") {
        layer.geojsonField = representationFields.geometryField;
        layer.gristGeometryField = representationFields.polygonField;
        layer.gristCentroidField = representationFields.centroidField;
        for (const item of customStyle.supports) {
          item.geojsonField = representationFields.polygonField;
          if (item.geometry === "Point")
            item.geojsonField = representationFields.centroidField;
        }
        if (support.referential.srs) layer.srs = support.referential.srs;
        delete layer.xfield;
        delete layer.yfield;
      } else {
        layer.gristRepresentationLayer = support.layerName;
      }
    }
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
      this.options.geojsonField = layer.geojsonField;
      this.options.gristGeometryField = layer.gristGeometryField;
      this.options.gristCentroidField = layer.gristCentroidField;
      this.options.gristReferential = layer.gristReferential;
      this.options.gristRepresentationLayer = layer.gristRepresentationLayer;
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
styleEditor.prototype.calculate = async function (event) {
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
    if (type === "cluster") {
      // Count belongs to generated clusters, so these classes need no CSV or WFS field.
      const rules = createClusterClasses(event.detail);
      const colors = createColorRampScales(color, rules.length, reverseColors);
      rules.forEach((rule, index) => {
        rule.fill = { color: colors[index] };
      });
      setRules(rules);
      if (customStyle.preview) customStyle.preview.refreshStyle();
      return;
    }
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
    if (this.layerId === layerId && this.customStyle === customStyle) {
      setRules(rules);
      if (customStyle.preview) customStyle.preview.refreshStyle();
    }
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
styleEditor.prototype.reset = function (options = {}) {
  this.styleLoadRequest = null;
  this.loadingCustomStyle = false;
  this.styleLoadError = null;
  if (options.reloadGristSource) {
    clearGristCsv(options.url);
    this.gristSource = null;
    if (config.temp.layers[options.layerId])
      delete config.temp.layers[options.layerId].csvData;
  }
  // Un rafraîchissement WMS conserve les options ; un changement de couche efface l'ancien style.
  if (options.layerId && options.layerId !== this.layerId) {
    this.options.type = null;
    this.options.url = null;
    this.options.isGrist = false;
    this.gristSource = null;
    this.options.fields = [];
    this.options.customStyle = null;
    this.options.geoStylerStyle = null;
    this.options.styleMode = STYLE_MODES.EXISTING;
    this.options.sld = null;
    this.options.customsld = false;
  }
  this.options = { ...this.options, ...options };
  if (options.layerId && options.layerId !== this.layerId) {
    for (const field of [
      "gristReferential",
      "gristMatchingField",
      "gristGeometryField",
      "gristCentroidField",
      "id",
      "name",
      "geojsonField",
      "srs",
    ]) {
      this.options[field] = options[field];
    }
  }
  if (options.customsld && !options.styleMode)
    this.options.styleMode = STYLE_MODES.CUSTOM;
  this.layerId = this.options.layerId || null;
  if (this.customStyle.preview) this.customStyle.preview.destroy();
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
styleEditor.prototype.setActiveMode = function (mode) {
  if (mode === STYLE_MODES.CUSTOM && this.layerId) {
    const layer = config.temp.layers[this.layerId];
    if (layer && layer.fields) this.setFields(Object.keys(layer.fields));
  }
  this.activeMode = mode;
  this.customStyle.options.styleMode = mode;
  this.element.querySelectorAll("[data-style-mode]").forEach((button) => {
    const isActive = button.dataset.styleMode === mode;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", isActive);
  });
  this.updateCustomVisibility();
  this.styleSelector.element.classList.toggle("d-none", mode !== STYLE_MODES.EXISTING);
  this.tmsStyle.element.classList.toggle("d-none", mode !== STYLE_MODES.EXISTING);
  this.legendSelector.element.hidden = mode === STYLE_MODES.CUSTOM;
};

/** Affiche la saisie Grist séparément et attend ses données avant de montrer l'éditeur.
 * @returns {void}
 */
styleEditor.prototype.updateCustomVisibility = function () {
  const customMode = this.activeMode === STYLE_MODES.CUSTOM;
  let visible = customMode;
  if (this.gristSource) {
    this.gristSource.element.hidden = !customMode;
    visible = customMode && this.gristSource.ready;
  }
  this.customStyle.element.classList.toggle("d-none", !visible);
  this.labels.element.hidden = !visible;
  if (this.customStyle.preview) this.customStyle.preview.element.hidden = !visible;
  this.customStyle.legendPreview.element.hidden = !visible;
};

/**
 * Construit les boutons et leurs événements de sélection.
 * @returns {HTMLElement} Élément du composant.
 */
styleEditor.prototype.render = function () {
  this.element.innerHTML = `<div class="import-type-buttons__actions">${STYLE_CHOICES.map(
    (choice) => `
    <button type="button" class="import-type-buttons__button" data-style-mode="${choice.mode}" id="${choice.id}">
      <span class="import-type-buttons__title">${mviewer.tr(choice.label)}</span>
    </button>
  `
  ).join("")}</div><div role="status" data-style-load-status hidden></div>`;
  // Réutiliser les éléments des composants conserve leurs valeurs et leurs écouteurs.
  this.element.append(
    this.styleSelector.render(),
    this.tmsStyle.render(),
    this.customStyle.render(),
    this.legendSelector.render(),
    this.labels.render(),
    this.customStyle.preview.render(),
    this.customStyle.legendPreview.render()
  );
  this.renderGristSource();

  this.element.querySelectorAll("[data-style-mode]").forEach((button) => {
    button.addEventListener("click", () => this.setActiveMode(button.dataset.styleMode));
  });
  this.setActiveMode(this.activeMode);
  this.updateLoadStatus();
  return this.element;
};

/** Monte la saisie de clé Grist dans une div sœur du panneau personnalisé.
 * @returns {void}
 */
styleEditor.prototype.renderGristSource = function () {
  const { type, url, isGrist, layerId } = this.options;
  if (type !== "csv" || (!isGrist && !/\/api\/docs\/[^/]+\/download\/csv/.test(url))) {
    this.gristSource = null;
    return;
  }
  if (
    !this.gristSource ||
    this.gristSource.url !== url ||
    this.gristSourceLayerId !== layerId
  ) {
    this.gristSourceLayerId = layerId;
    const source = new GristStyleSource({
      url,
      onReadyChange: () => this.updateCustomVisibility(),
      onLoad: (data) => {
        // Une réponse d'un ancien panneau ne doit pas modifier la couche désormais active.
        if (this.gristSource !== source || this.layerId !== layerId) return;
        const layer = config.temp.layers[layerId] || {};
        const fields = data.meta.fields || [];
        layer.type = "csv";
        layer.csvData = data.data;
        layer.fields = Object.fromEntries(fields.map((field) => [field, {}]));
        config.temp.layers[layerId] = layer;
        let feature = null;
        if (data.data.length) {
          feature = { type: "Feature", geometry: null, properties: data.data[0] };
        }
        const geometryFields = [
          this.options.geojsonField,
          "geometry_centroid",
          this.options.gristGeometryField,
          this.options.gristCentroidField,
        ];
        this.setFields(fields.filter((field) => !geometryFields.includes(field)));
        this.labels.preview.setFeature(feature);
        if (this.customStyle.preview) this.customStyle.preview.update();
      },
    });
    this.gristSource = source;
  }
  this.element.insertBefore(this.gristSource.render(), this.customStyle.element);
};

/**
 * Monte le sélecteur dans le conteneur fourni.
 * @param {HTMLElement} target Conteneur de destination.
 * @returns {HTMLElement} Élément du composant.
 */
styleEditor.prototype.appendTo = function (target) {
  target.replaceChildren(this.render());
  return this.element;
};

/**
 * Change la couche active et reconstruit ses panneaux via le chargement des options.
 * @param {string} layerId Identifiant de la couche à éditer.
 * @returns {void}
 */
styleEditor.prototype.setLayerId = function (layerId) {
  this.reset({ layerId });
};

/**
 * Conserve les champs pour les prochains panneaux et actualise les panneaux existants.
 * @param {string[]} fields Champs disponibles pour la couche active.
 * @returns {void}
 */
styleEditor.prototype.setFields = function (fields) {
  this.options.fields = fields;
  this.customStyle.setFields(fields);
  this.labels.setFields(fields);
  let feature = null;
  if (this.layerId && typeof config !== "undefined") {
    const layer = config.temp.layers[this.layerId];
    if (
      layer &&
      layer.type === "csv" &&
      Array.isArray(layer.csvData) &&
      layer.csvData.length
    ) {
      feature = { type: "Feature", geometry: null, properties: layer.csvData[0] };
    } else if (layer && layer.features && layer.features.length) {
      feature = layer.features[0];
    }
  }
  // Refresh from the active layer rather than keeping the previous source's sample.
  this.labels.preview.setFeature(feature);
};

/** Initialise les étiquettes et les rattache au style à sauvegarder.
 * @returns {void}
 */
styleEditor.prototype.createLabels = function () {
  let scales = this.options.labelScales;
  if (!scales && typeof _conf !== "undefined") scales = _conf.labelScales;
  let state = {};
  if (this.options.customStyle) state = this.options.customStyle.labels;
  let feature = null;
  // Réutiliser les données WFS ou Grist déjà chargées évite une requête pour la preview.
  if (this.options.layerId && typeof config !== "undefined") {
    const layer = config.temp.layers[this.options.layerId];
    if (layer && layer.type === "csv") {
      if (Array.isArray(layer.csvData) && layer.csvData.length) {
        feature = { type: "Feature", geometry: null, properties: layer.csvData[0] };
      }
    } else if (layer && layer.features && layer.features.length) {
      feature = layer.features[0];
    }
  }
  this.labels = new stylerLabels({ fields: this.options.fields, state, scales, feature });
  this.labels.setClusterMode(this.customStyle.styleTypeSelector.value === "cluster");
  this.customStyle.labels = this.labels;
};

export default styleEditor;
