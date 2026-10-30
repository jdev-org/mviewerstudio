/**
 * Require a service URL and exactly one WMS layer name.
 * @param {Object} layer WMS descriptor.
 * @returns {void}
 */
export function validateWms(layer) {
  if (!layer.url || !layer.name || layer.name.includes(",")) {
    throw new Error("A preview requires one WMS layer name and service URL.");
  }
}

/**
 * Reuse an OpenLayers layer or create a single-layer WMS preview.
 * @param {Object} layer OpenLayers layer or WMS descriptor.
 * @returns {Object} OpenLayers layer; SLD loading is handled separately.
 */
export function createPreviewLayer(layer) {
  if (typeof layer.getSource === "function") return layer;
  validateWms(layer);
  return new ol.layer.Image({
    source: new ol.source.ImageWMS({
      url: layer.url,
      params: { ...layer.params, LAYERS: layer.name, STYLES: "", TRANSPARENT: true },
      ratio: 1,
    }),
  });
}
