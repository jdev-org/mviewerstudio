import MapPreview from "../../map/map.js";
import { MAP_DEFAULTS } from "../../map/constants.js";
import { DATA_PREVIEW_LIMIT } from "../constants.js";
import { createGeoStylerStyle, geoStylerToSld } from "../../../utils/styler/style.js";
import { getPreviewFeatures } from "./previewFeatures.js";

/** Carte des données de la couche active, sans requête supplémentaire pour les CSV. */
export default class DataPreview {
  /** @param {Object} options Options de la couche éditée, dont layerId et url. */
  constructor(options) {
    this.options = options;
    this.element = document.createElement("section");
    this.element.className = "custom-style-preview";
    const title = document.createElement("h5");
    title.textContent = mviewer.tr("style_editor.preview.title");
    this.mapPreview = new MapPreview({
      title: title.textContent,
      controls: [new ol.control.Zoom(), new ol.control.Attribution()],
    });
    this.status = document.createElement("p");
    this.status.setAttribute("role", "status");
    this.element.append(title, this.status, this.mapPreview.render());
    this.update();
  }

  /** Reprojette les données vers EPSG:3857 et cadre les géométries disponibles.
   * @returns {void}
   */
  update() {
    let layer = this.options;
    if (this.options.layerId && typeof config !== "undefined") {
      // Le cache apporte les lignes chargées ; les options conservent les champs XY/GeoJSON
      // et la projection, qui peuvent être absents de ce cache partiel.
      layer = { ...this.options, ...config.temp.layers[this.options.layerId] };
    }
    const features = getPreviewFeatures(layer, DATA_PREVIEW_LIMIT);
    let dataProjection = layer.featuresProjection || layer.srs || layer.projection;
    // Les coordonnées CSV utilisent le SRS configuré, indépendamment des métadonnées WFS.
    if (layer.type === "csv") dataProjection = layer.srs;
    const source = new ol.source.Vector({
      features: new ol.format.GeoJSON().readFeatures(
        { type: "FeatureCollection", features },
        {
          // Reprojeter à la lecture crée des géométries de preview sans modifier le cache.
          dataProjection: dataProjection || "EPSG:4326",
          featureProjection: MAP_DEFAULTS.projection,
        }
      ),
    });
    this.status.textContent = "";
    this.mapPreview.setLayer(new ol.layer.Vector({ source }));
    if (!source.getFeatures().length) {
      this.status.textContent = mviewer.tr("style_editor.preview.empty");
    }
    // setLayer() vide la carte : réinsérer le fond sous les nouvelles entités.
    this.mapPreview.map
      .getLayers()
      .insertAt(0, new ol.layer.Tile({ source: new ol.source.OSM() }));
    if (!features.length && typeof _conf !== "undefined" && _conf.map) {
      this.mapPreview.map.getView().setCenter(_conf.map.center);
      this.mapPreview.map.getView().setZoom(_conf.map.zoom);
    }
    this.refreshStyle();
  }

  /** Applique le SLD produit par le formulaire sans enregistrer de fichier.
   * @returns {Promise<void>} Affiche une erreur si le style ne peut pas être appliqué.
   */
  async refreshStyle() {
    // Plusieurs saisies peuvent lancer des conversions simultanées : seule la dernière compte.
    const request = {};
    this.styleRequest = request;
    try {
      // Passer par le même SLD que la sauvegarde pour prévisualiser les règles exportées.
      const style = createGeoStylerStyle(this.options.getStyle());
      const sld = await geoStylerToSld(style);
      if (this.styleRequest !== request) return;
      await this.mapPreview.setSld(sld);
      if (this.styleRequest === request && this.mapPreview.source.getFeatures().length) {
        this.status.textContent = "";
      }
    } catch (error) {
      if (this.styleRequest === request) this.status.textContent = error.message;
    }
  }

  /** @returns {HTMLElement} Carte réutilisée lors des rendus du formulaire. */
  render() {
    return this.element;
  }

  /** Libère la carte et son observateur de taille.
   * @returns {void}
   */
  destroy() {
    this.styleRequest = null;
    this.mapPreview.destroy();
  }
}
