import { getRepresentationSupports } from "../../../utils/styler/referential.js";
import ListStyleTypeSelector from "./listStyleTypeSelector.js";
import ListCard from "../../listCard/listCard.js";
import ClassificationPanel from "./ClassificationPanel.js";
import AccordionClassificationPanel from "./accordionClassificationPanel.js";
import CircleColorClassificationPanel from "./circleColorClassificationPanel.js";
import { suggestClassificationMode } from "../../../utils/styler/classification/fieldValues.js";
import DataPreview from "./dataPreview.js";
import LegendPreview from "./legendPreview.js";
import { STYLE_TYPES, STYLE_EDITOR_EVENTS, STYLE_MODES } from "../constants.js";
import { createGeoStylerStyle, geoStylerToSld } from "../../../utils/styler/style.js";
import { sendSldFile, sendJsonStyleStyle } from "../../../utils/styler/requests.js";

let customStyleId = 0;

/**
 * Custom style editor container.
 * @returns {void}
 */
const CustomStyle = function (options = {}) {
  const { geometry = "Point", fields = [], state = null } = options;
  this.options = options;
  this.supports = getRepresentationSupports(options);
  this.geometry = geometry;
  if (this.supports.length && !state) {
    const currentLayerName =
      options.gristRepresentationLayer ||
      options.layer_name ||
      options.layername ||
      options.id;
    let currentSupport = this.supports.find(
      (support) => support.layerName === currentLayerName
    );
    if (options.geojsonField) {
      const fieldSupport = this.supports.find(
        (support) => support.geojsonField === options.geojsonField
      );
      if (fieldSupport) currentSupport = fieldSupport;
    }
    this.geometry = this.supports[0].geometry;
    if (currentSupport) this.geometry = currentSupport.geometry;
  }
  if (state) this.geometry = state.geometry;
  if (
    this.supports.length &&
    !this.supports.some((support) => support.geometry === this.geometry)
  )
    this.geometry = this.supports[0].geometry;
  this.fields = fields;
  this.state = state;
  this.geoStylerStyle = null;
  this.panels = {};
  this.card = new ListCard({
    title: mviewer.tr("style_editor.title"),
    classes: "custom-style",
  });
  this.element = this.card.element;
  this.legendPreview = new LegendPreview(() => this.getValue());
  for (const eventName of ["input", "change", "update"]) {
    this.element.addEventListener(eventName, () => this.legendPreview.update());
  }
  this.styleTypeSelector = new ListStyleTypeSelector(this.geometry, this.supports);
  if (
    state &&
    this.styleTypeSelector.types.some(
      (type) => type.value === state.type && type.geometry === this.geometry
    )
  ) {
    this.styleTypeSelector.value = state.type;
  }
  this.content = document.createElement("div");
  customStyleId += 1;
  this.content.id = `style-classifications-${customStyleId}`;
  this.styleTypeSelector.element.addEventListener("style-type-change", (event) =>
    this.showType(event.detail)
  );
};

/** Displays panels for the selected mode while preserving their input.
 * @param {string} type Representation mode.
 * @returns {void}
 */
CustomStyle.prototype.showType = function (type) {
  let representation = this.styleTypeSelector.types.find(
    (item) => item.value === type && item.geometry === this.styleTypeSelector.geometry
  );
  if (!representation) {
    representation = this.styleTypeSelector.types.find((item) => item.value === type);
  }
  if (!representation) throw new Error(mviewer.tr("style_editor.error.representation"));
  // Point-only styles select the explicitly configured centroid support.
  this.styleTypeSelector.geometry = representation.geometry;
  this.styleTypeSelector.value = representation.value;
  const geometryChanged = this.geometry !== this.styleTypeSelector.geometry;
  const resetStyle =
    geometryChanged &&
    this.options.type === "csv" &&
    this.options.styleMode !== STYLE_MODES.EXISTING;
  if (resetStyle) {
    // Only the custom CSV style is reset; WMS panels remain available.
    this.panels = {};
    this.state = null;
    this.geoStylerStyle = null;
  }
  this.geometry = this.styleTypeSelector.geometry;
  const panelKey = `${this.geometry}:${type}`;
  if (!this.panels[panelKey]) {
    const options = { type, fields: this.fields, geometry: this.geometry };
    if (type === "proportionalColoredCircles") {
      const definition = STYLE_TYPES.find((item) => item.value === "proportionalCircles");
      this.panels[panelKey] = new AccordionClassificationPanel({
        ...options,
        parentId: this.content.id,
        expanded: true,
        type: "proportionalCircles",
        styleProp: definition.styleProp.filter(
          (property) => property !== "color" && property !== "ramps"
        ),
        ruleMode: "size",
        title: "style_editor.classification.circle_sizes",
      });

      this.panels[panelKey].colorClassification = new CircleColorClassificationPanel({
        ...options,
        getFieldType: (field) => this.getClassificationMode(field),
        parentId: this.content.id,
        type: "analyse",
        ruleMode: "color",
        title: "style_editor.classification.circle_colors",
      });
    } else {
      this.panels[panelKey] = new ClassificationPanel(options);
    }
    if (this.state && this.state.type === type && this.state.geometry === this.geometry) {
      this.panels[panelKey].restore(this.state);
      if (this.state.colorClassification) {
        this.panels[panelKey].colorClassification.restore(this.state.colorClassification);
      }
    }
  }
  if (this.labels) this.labels.setClusterMode(type === "cluster");
  const panels = this.panels[panelKey];
  this.content.classList.toggle("accordion", panels.colorClassification !== undefined);
  this.content.replaceChildren(panels.render());
  if (panels.colorClassification) {
    this.content.appendChild(panels.colorClassification.render());
  }
  if (resetStyle) {
    this.element.dispatchEvent(
      new CustomEvent(STYLE_EDITOR_EVENTS.GEOMETRY_CHANGE, {
        detail: { geometry: this.geometry },
        bubbles: true,
      })
    );
  }
  this.legendPreview.update();
  if (this.preview) {
    if (geometryChanged) this.preview.update();
    else this.preview.refreshStyle();
  }
};

/**
 * Suggests a classification mode using the latest data for the active layer.
 * @param {string} field Selected field name.
 * @returns {string} Numeric or categorical classification type.
 */
CustomStyle.prototype.getClassificationMode = function (field) {
  let layer = this.options;
  if (layer.layerId && typeof config !== "undefined") {
    layer = { ...layer, ...config.temp.layers[layer.layerId] };
  }
  return suggestClassificationMode(layer, field);
};

/**
 * Converts and saves the SLD/JSON pair using a shared unique identifier.
 * Updates the saved object only after both uploads succeed.
 * @param {string} mapId Identifier of the map saved on the server.
 * @param {string} name Style name.
 * @param {string} layerName Technical WMS layer name.
 * @param {string} [styleId] Identifier to reuse when replacing the layer style.
 * @returns {Promise<Object>} Identifier, configuration, GeoStyler style and files.
 */
CustomStyle.prototype.save = async function (
  mapId,
  name,
  layerName,
  styleId = crypto.randomUUID()
) {
  const configuration = this.getValue();
  const geoStylerStyle = createGeoStylerStyle(configuration, name);
  const sldContent = await geoStylerToSld(geoStylerStyle, { layerName });
  const sld = await sendSldFile(mapId, styleId, sldContent);
  const json = await sendJsonStyleStyle(mapId, styleId, geoStylerStyle);
  this.geoStylerStyle = structuredClone(geoStylerStyle);
  return { styleId, configuration, geoStylerStyle, sld, json };
};

/** Returns the current configuration before SLD conversion.
 * @returns {Object} Mode, geometry, settings and rules.
 */
CustomStyle.prototype.getValue = function () {
  const type = this.styleTypeSelector.value;
  const panels = this.panels[`${this.geometry}:${type}`];
  const value = {
    type,
    geometry: this.geometry,
    ...panels.getValue(),
  };
  if (panels.colorClassification) {
    value.colorClassification = panels.colorClassification.getValue();
  }
  const support = this.supports.find((item) => item.geometry === this.geometry);
  if (support) value.referentialLayer = support.layerName;
  if (this.labels) value.labels = this.labels.getValue();
  return value;
};

/**
 * Displays the editor title and the list of representation modes.
 * @returns {HTMLElement} Component element.
 */
CustomStyle.prototype.render = function () {
  if (!this.preview) {
    // Panels must exist before the map requests the style configuration.
    this.showType(this.styleTypeSelector.value);
    // Read the form on each refresh to include updated labels and rules.
    this.preview = new DataPreview({
      ...this.options,
      getStyle: () => this.getValue(),
      getSupport: () =>
        this.supports.find((support) => support.geometry === this.geometry),
    });
  }
  this.card.setItems([this.styleTypeSelector.render(), this.content]);
  this.showType(this.styleTypeSelector.value);
  return this.element;
};

/**
 * Keeps fields for future panels and updates existing panels.
 * @param {string[]} fields Available fields.
 * @returns {void}
 */
CustomStyle.prototype.setFields = function (fields) {
  this.fields = fields;
  Object.values(this.panels).forEach((panel) => {
    panel.setFields(fields);
    if (panel.colorClassification) {
      panel.colorClassification.setFields(fields);
    }
  });
};

export default CustomStyle;
