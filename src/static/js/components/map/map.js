import { MAP_DEFAULTS } from "./constants.js";
import { createPreviewLayer } from "./layers.js";
import { parseSld } from "./sld.js";
import { createVectorStyle } from "./vectorStyle.js";

/** Reusable single-layer OpenLayers preview. */
export default class MapPreview {
  /**
   * @param {Object} [options={}] Preview options.
   * @param {Object|null} [options.layer] OpenLayers layer or WMS descriptor:
   *   {url, name, title, bbox, bboxProjection, sld, sldUrl, params}. Bbox defaults to
   *   EPSG:4326 longitude/latitude order; sld accepts XML or a URL.
   *   OpenLayers WMS layers may provide sldUrl through layer properties.
   * @param {number|string} [options.height=300] Height in pixels or a CSS length.
   * @param {Array<Object>} [options.controls] Optional OpenLayers controls.
   * @param {string} [options.title="Map preview"] Accessible preview title.
   */
  constructor(options = {}) {
    this.options = { ...MAP_DEFAULTS, ...options };
    this.element = document.createElement("div");
    this.element.className = "map-preview";
    let height = this.options.height;
    if (typeof height === "number") height = `${height}px`;
    this.element.style.cssText = `width:100%;height:${height}`;
    this.element.setAttribute("role", "region");
    this.element.setAttribute("aria-label", this.options.title);
    this.map = new ol.Map({
      target: this.element,
      layers: [],
      controls: this.options.controls || [new ol.control.Zoom()],
      view: new ol.View({
        projection: MAP_DEFAULTS.projection,
        center: [0, 0],
        zoom: 2,
      }),
    });
    this.resizeObserver = new ResizeObserver(() => {
      this.map.updateSize();
      if (this.pendingFit) this.fitLayer();
    });
    this.resizeObserver.observe(this.element);
    this.ready = Promise.resolve(this.setLayer(this.options.layer));
  }

  /**
   * Replace the current layer; null clears the preview.
   * @param {Object|null} layer OpenLayers layer or WMS descriptor.
   * @returns {Promise<void>|void} Resolves after loading an optional SLD.
   */
  setLayer(layer) {
    if (this.source && this.sourceListener) this.source.un("change", this.sourceListener);
    // Invalider le SLD encore en chargement avant de remplacer sa couche cible.
    this.sldRequest = (this.sldRequest || 0) + 1;
    this.source = null;
    this.previewLayer = null;
    this.sourceListener = null;
    this.layer = layer;
    this.pendingFit = false;
    this.map.getLayers().clear();
    if (!layer) return;
    const previewLayer = createPreviewLayer(layer);
    this.previewLayer = previewLayer;
    this.source = previewLayer.getSource();
    this.map.addLayer(previewLayer);
    this.pendingFit = true;
    if (this.source && typeof this.source.getExtent === "function") {
      this.sourceListener = () => {
        if (this.pendingFit) this.fitLayer();
      };
      this.source.on("change", this.sourceListener);
    }
    this.fitLayer();
    let sld = layer.sldUrl || layer.sld;
    if (typeof layer.get === "function") {
      sld = layer.get("sldUrl") || layer.get("sld");
    }
    if (sld) return this.setSld(sld);
  }

  /** Fit the WMS bbox or loaded vector extent once the container has a size.
   * @returns {void}
   */
  fitLayer() {
    if (!this.layer) return;
    let extent;
    if (this.layer.bbox) {
      extent = ol.proj.transformExtent(
        this.layer.bbox,
        this.layer.bboxProjection || MAP_DEFAULTS.bboxProjection,
        this.map.getView().getProjection()
      );
    } else if (this.source && typeof this.source.getExtent === "function") {
      extent = this.source.getExtent();
    }
    if (!extent || !extent.every(Number.isFinite) || ol.extent.isEmpty(extent)) return;
    const size = this.map.getSize();
    // Une carte dans un onglet masqué sera cadrée par ResizeObserver une fois visible.
    if (!size || !size[0] || !size[1]) return;
    this.map.getView().fit(extent, {
      size,
      padding: MAP_DEFAULTS.padding,
      maxZoom: MAP_DEFAULTS.maxZoom,
    });
    this.pendingFit = false;
  }

  /**
   * Load and validate SLD XML or a URL; an empty string restores the default style.
   * @param {string} sld SLD XML content or a URL relative to the document.
   * @returns {Promise<void>} Rejects if loading, parsing or applying the SLD fails.
   */
  async setSld(sld) {
    if (!this.source) {
      throw new Error("SLD preview requires a layer.");
    }
    const source = this.source;
    const request = (this.sldRequest || 0) + 1;
    this.sldRequest = request;
    let parsed;
    if (sld) parsed = await parseSld(sld);
    // Une ancienne réponse ne doit ni écraser un style récent ni atteindre une autre couche.
    if (request !== this.sldRequest || source !== this.source) return;
    if (typeof source.updateParams === "function") {
      let xml;
      if (parsed) xml = parsed.xml;
      source.updateParams({ SLD: undefined, SLD_BODY: xml, STYLES: "" });
    } else if (typeof this.previewLayer.setStyle === "function") {
      let style;
      if (parsed) {
        style = createVectorStyle(parsed.style, this.map.getView().getProjection());
        // Détecter les symboles non pris en charge avant le rendu, pour remonter l'erreur au formulaire.
        for (const feature of source.getFeatures()) {
          style(feature, this.map.getView().getResolution());
        }
      }
      this.previewLayer.setStyle(style);
    } else {
      throw new Error("SLD preview requires a WMS or vector layer.");
    }
  }

  /** @returns {HTMLElement} Preview container, preserving subsequent updates. */
  render() {
    return this.element;
  }

  /**
   * Mount the preview and refresh its size and initial extent.
   * @param {HTMLElement} target Parent container.
   * @returns {HTMLElement} Preview container.
   */
  appendTo(target) {
    target.appendChild(this.element);
    this.map.updateSize();
    if (this.pendingFit) this.fitLayer();
    return this.element;
  }

  /** Release listeners and map resources.
   * @returns {void}
   */
  destroy() {
    this.sldRequest = (this.sldRequest || 0) + 1;
    this.resizeObserver.disconnect();
    if (this.source && this.sourceListener) this.source.un("change", this.sourceListener);
    this.map.dispose();
    this.element.remove();
  }
}
