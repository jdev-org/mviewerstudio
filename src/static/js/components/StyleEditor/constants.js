/** Editor events, element identifiers and preview presentation settings. */

export const REPRESENTATION_SUPPORT_LABELS = {
  Polygon: "style_editor.support.polygons",
  Point: "style_editor.support.centroids",
};

export const DATA_PREVIEW_GEOMETRY_NAME = "__stylePreviewGeometry";

export const STYLE_EDITOR_EVENTS = {
  LOAD_OPTIONS: "loadOptions",
  SHOW_FIELDS: "showFields",
  SAVE: "saveStyle",
  GEOMETRY_CHANGE: "styleGeometryChange",
};

export const STYLE_SELECTOR_IDS = {
  container: "availableLayerStyles",
  heading: "headingAvailableLayerStyles",
  collapse: "collapseAvailableLayerStyles",
  loading: "availableLayerStylesLoading",
  list: "frm-lis-styles",
  titleContainer: "formLayerStyleTitle",
  titleInput: "frm-layer-styletitle",
};

export const RULE_PREVIEW = {
  width: 80,
  height: 48,
  padding: 4,
  symbolSize: 24,
  svgNamespace: "http://www.w3.org/2000/svg",
};
