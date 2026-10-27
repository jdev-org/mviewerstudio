export const STYLE_MODES = {
  EXISTING: "existing",
  CUSTOM: "custom",
};

export const STYLE_EDITOR_EVENTS = {
  LOAD_OPTIONS: "loadOptions",
  SHOW_FIELDS: "showFields",
  SAVE: "saveStyle",
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

export const CLASSIFICATION_TOOLTIPS = {
  categories: "style_editor.tooltip.categories",
  classes: "style_editor.tooltip.classes",
};

export const CLASSIFICATION_LIMITS = {
  classes: { recommended: 5, max: 7 },
  categories: { recommended: 7, max: 10 },
};

export const STYLE_CHOICES = [
  {
    mode: STYLE_MODES.EXISTING,
    label: "style_editor.mode.existing",
    id: "style-editor-existing",
  },
  {
    mode: STYLE_MODES.CUSTOM,
    label: "style_editor.mode.custom",
    id: "style-editor-custom",
  },
];

export const STYLE_GEOMETRIES = {
  Point: "Point",
  MultiPoint: "Point",
  LineString: "LineString",
  MultiLineString: "LineString",
  Curve: "LineString",
  MultiCurve: "LineString",
  Polygon: "Polygon",
  MultiPolygon: "Polygon",
  Surface: "Polygon",
  MultiSurface: "Polygon",
};

export const MAX_STYLE_RULES = CLASSIFICATION_LIMITS.categories.max;

export const STYLE_TYPES = [
  {
    value: "simple",
    label: "style_editor.type.simple",
    description: "style_editor.type.simple.description",
    geom: ["Point", "LineString", "Polygon"],
    img: "img/styler/style_simple.png",
    styleProp: [],
  },
  {
    value: "analyse",
    maxClasses: CLASSIFICATION_LIMITS.classes.max,
    label: "style_editor.type.analyse",
    description: "style_editor.type.analyse.description",
    geom: ["Point", "Polygon", "LineString"],
    methods: ["jenk", "equalInterval", "quantiles"],
    img: "img/styler/style_degrade.png",
    styleProp: ["field", "methods", "ramps", "classes"],
  },
  {
    value: "proportionalCircles",
    maxClasses: CLASSIFICATION_LIMITS.classes.max,
    label: "style_editor.type.proportionalCircles",
    description: "style_editor.type.proportionalCircles.description",
    geom: ["Point"],
    methods: ["jenk", "equalInterval", "quantiles"],
    img: "img/styler/style_cercle_prop.png",
    styleProp: ["field", "methods", "color", "classes", "maxSize"],
  },
  {
    value: "proportionalColoredCircles",
    maxClasses: CLASSIFICATION_LIMITS.classes.max,
    label: "style_editor.type.proportionalColoredCircles",
    description: "style_editor.type.proportionalColoredCircles.description",
    geom: ["Point"],
    methods: ["jenk", "equalInterval", "quantiles"],
    img: "img/styler/style_cercle_prop_color.png",
    styleProp: ["field", "methods", "ramps", "classes"],
  },
  {
    value: "categorized",
    label: "style_editor.type.categorized",
    description: "style_editor.type.categorized.description",
    geom: ["Point", "Polygon", "LineString"],
    maxClasses: MAX_STYLE_RULES,
    styleProp: ["field", "randomColor"],
    img: "img/styler/style_categ.png",
  },
  {
    value: "cluster",
    label: "style_editor.type.cluster",
    description: "style_editor.type.cluster.description",
    geom: ["Point"],
    styleProp: ["field", "distance"],
    img: "img/styler/style_cluster_regroup.png",
  },
];

export const DEFAULT_FILL = { color: "#9e5698", opacity: 1 };
export const DEFAULT_COLOR_SCALE = "Purples";
export const DEFAULT_SIZE_COLOR = "#808080";
export const DEFAULT_CLUSTER_DISTANCE = 40;
export const RULE_PREVIEW = {
  width: 80,
  height: 48,
  padding: 4,
  symbolSize: 24,
  svgNamespace: "http://www.w3.org/2000/svg",
};
export const DEFAULT_STROKE = {
  color: "#ffffff",
  opacity: 1,
  width: 1,
  lineStyle: "solid",
};
export const DEFAULT_SYMBOL = {
  minSize: 6,
  maxSize: 24,
  shape: "circle",
  externalGraphic: "",
};
export const FILL_FIELDS = [
  { name: "color", label: "style_editor.field.color", type: "color" },
  {
    name: "opacity",
    label: "style_editor.field.opacity",
    type: "number",
    min: 0,
    max: 1,
    step: 0.1,
  },
];
export const STROKE_FIELDS = [
  ...FILL_FIELDS,
  { name: "width", label: "style_editor.field.width", type: "number", min: 0, step: 0.5 },
];
export const SYMBOL_FIELDS = [
  {
    name: "minSize",
    label: "style_editor.field.minSize",
    type: "number",
    min: 0,
    step: "any",
  },
  {
    name: "maxSize",
    label: "style_editor.field.maxSize",
    type: "number",
    min: 0,
    step: "any",
  },
  { name: "externalGraphic", label: "style_editor.field.externalGraphic", type: "url" },
];
export const STROKE_TYPES = [
  { value: "solid", label: "style_editor.stroke.solid" },
  { value: "dashed", label: "style_editor.stroke.dashed" },
  { value: "dotted", label: "style_editor.stroke.dotted" },
];
export const SYMBOL_SHAPES = [
  { value: "circle", label: "style_editor.shape.circle" },
  { value: "square", label: "style_editor.shape.square" },
  { value: "triangle", label: "style_editor.shape.triangle" },
  { value: "external", label: "style_editor.shape.external" },
];
export const CLASSIFICATION_METHODS = [
  { value: "jenk", label: "style_editor.method.jenk" },
  { value: "equalInterval", label: "style_editor.method.equalInterval" },
  { value: "quantiles", label: "style_editor.method.quantiles" },
];
