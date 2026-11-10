import { loadReferentialPreview } from "../../../utils/styler/referential.js";
import Accordion from "../../accordion/accordion.js";
import MapPreview from "../../map/map.js";
import { MAP_DEFAULTS } from "../../map/constants.js";
import { DATA_PREVIEW_LIMIT, DATA_PREVIEW_GEOMETRY_NAME } from "../constants.js";
import {
  createGeoStylerStyle,
  geoStylerToSld,
  getStyleGeometry,
} from "../../../utils/styler/style.js";
import { getPreviewFeatures } from "./previewFeatures.js";

/** Carte des données de la couche active, sans requête supplémentaire pour les CSV. */
export default class DataPreview {
  /** @param {Object} options Options de la couche éditée, dont layerId et url. */
  constructor(options) {
    this.options = options;
    const title = mviewer.tr("style_editor.preview.title");
    this.panel = new Accordion({ title, classes: "custom-style-preview" });
    this.element = this.panel.element;
    this.mapPreview = new MapPreview({
      title,
      controls: [new ol.control.Zoom(), new ol.control.Attribution()],
    });
    this.status = document.createElement("p");
    this.status.setAttribute("role", "status");
    this.element
      .querySelector(".accordion-body")
      .append(this.status, this.mapPreview.render());
    this.element
      .querySelector(".accordion-collapse")
      .addEventListener("shown.bs.collapse", () => {
        // Attendre la fin de l'animation pour cadrer la carte avec sa taille visible.
        this.mapPreview.map.updateSize();
        if (this.mapPreview.pendingFit) this.mapPreview.fitLayer();
      });
    this.update();
  }

  /** Reprojette les données vers EPSG:3857 et cadre les géométries disponibles.
   * @returns {void|Promise<void>} Actualise la carte après l'éventuelle lecture du référentiel.
   */
  update() {
    let layer = this.options;
    if (this.options.layerId && typeof config !== "undefined") {
      // Le cache apporte les lignes chargées ; les options conservent les champs XY/GeoJSON
      // et la projection, qui peuvent être absents de ce cache partiel.
      layer = { ...this.options, ...config.temp.layers[this.options.layerId] };
    }
    const request = {};
    this.dataRequest = request;
    let support;
    if (this.options.getSupport) support = this.options.getSupport();
    if (support) {
      if (layer.type !== "csv") {
        // Le support courant est déjà chargé : garder ses géométries et leur projection sans rappeler le WFS.
        const features = getPreviewFeatures(layer, DATA_PREVIEW_LIMIT);
        if (
          features.length &&
          features.every(
            (feature) => getStyleGeometry(feature.geometry.type) === support.geometry
          )
        ) {
          this.setFeatures(layer, features);
          return;
        }
      }
      layer = {
        ...layer,
        geojsonField: support.geojsonField,
        srs: support.referential.srs || layer.srs,
        featuresProjection: support.referential.srs || layer.srs,
      };
      const rows = layer.csvData || [];
      const hasGeometryColumn =
        Object.hasOwn(layer.fields || {}, support.geojsonField) ||
        rows.some((row) => Object.hasOwn(row, support.geojsonField));
      if (layer.type !== "csv" || (!hasGeometryColumn && rows.length)) {
        this.status.textContent = mviewer.tr("style_editor.loading_referential");
        return loadReferentialPreview(layer, support)
          .then((features) => {
            if (this.dataRequest !== request) return;
            this.setFeatures(layer, features);
          })
          .catch((error) => {
            if (this.dataRequest !== request) return;
            this.setFeatures(layer, []);
            this.status.textContent = error.message;
          });
      }
    }
    this.setFeatures(layer, getPreviewFeatures(layer, DATA_PREVIEW_LIMIT));
  }

  /**
   * Monte l'échantillon courant dans la carte et applique son style.
   * @param {Object} layer Paramètres de projection de la couche.
   * @param {Object[]} features Entités GeoJSON à afficher.
   * @returns {void}
   */
  setFeatures(layer, features) {
    let dataProjection = layer.featuresProjection || layer.srs || layer.projection;
    // Les coordonnées CSV utilisent le SRS configuré, indépendamment des métadonnées WFS.
    if (layer.type === "csv") dataProjection = layer.srs;
    const source = new ol.source.Vector({
      // La colonne CSV « geometry » doit rester un attribut, sans écraser la géométrie OL.
      features: new ol.format.GeoJSON({
        geometryName: DATA_PREVIEW_GEOMETRY_NAME,
      }).readFeatures(
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
    this.dataRequest = null;
    this.mapPreview.destroy();
  }
}
