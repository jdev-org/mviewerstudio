/** Shared style defaults, limits and representation behavior, independent of editor forms. */

export const DEFAULT_SLD_VERSION = "1.1.0";

export const DATA_PREVIEW_LIMIT = 100;

export const REFERENTIAL_GEOMETRY_FIELDS = {
  Polygon: "geometry",
  Point: "geometry_centroid",
};

export const SLD_SCHEMA_LOCATIONS = {
  "1.0.0": "https://schemas.opengis.net/sld/1.0.0/StyledLayerDescriptor.xsd",
  "1.1.0": "https://schemas.opengis.net/sld/1.1.0/StyledLayerDescriptor.xsd",
};

export const STYLE_MODES = {
  EXISTING: "existing",
  CUSTOM: "custom",
};

export const CLASSIFICATION_TYPES = ["analyse", "categorized"];

export const CLASSIFICATION_LIMITS = {
  classes: { recommended: 5, max: 7 },
  categories: { recommended: 7, max: 10 },
};

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

export const MAX_CLUSTER_RULES = 7;

export const MAX_CLUSTER_CLASSES = MAX_CLUSTER_RULES - 2;

export const DEFAULT_FILL = { color: "#9e5698", opacity: 1 };

export const DEFAULT_COLOR_SCALE = "Purples";

export const DEFAULT_SIZE_COLOR = "#808080";

export const DEFAULT_CLUSTER_DISTANCE = 5;

export const DEFAULT_CLUSTER_CLASS_INTERVAL = 10;

export const DEFAULT_SINGLE_POINT_RADIUS = 5;

export const POINT_STACKER = {
  name: "vec:PointStacker",
  countField: "count",
  environment: {
    outputBBOX: "wms_bbox",
    outputWidth: "wms_width",
    outputHeight: "wms_height",
  },
};

export const DEFAULT_CLUSTER_RULE = { clusterCondition: "all", min: 1, max: 10 };

export const DEFAULT_CLUSTER_FILL = { ...DEFAULT_FILL, color: "#ffa500" };

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

// Stored sizes are diameters: default cluster radii range from 10 to 40 pixels.
export const DEFAULT_CLUSTER_SYMBOL = { ...DEFAULT_SYMBOL, minSize: 20, maxSize: 80 };

export const CLASSIFICATION_METHOD_IDS = ["jenk", "equalInterval", "quantiles"];
export const CLASSIFICATION_KINDS = {
  NONE: "none",
  NUMERIC: "numeric",
  CATEGORICAL: "categorical",
  COUNT: "count",
};
export const COLOR_MODES = { SINGLE: "single", RAMP: "ramp", RANDOM: "random" };

export const STYLE_DEFINITIONS = [
  {
    value: "simple",
    geom: ["Point", "LineString", "Polygon"],
    classification: CLASSIFICATION_KINDS.NONE,
    colorMode: COLOR_MODES.SINGLE,
  },
  {
    value: "analyse",
    geom: ["Point", "Polygon", "LineString"],
    maxClasses: CLASSIFICATION_LIMITS.classes.max,
    methods: CLASSIFICATION_METHOD_IDS,
    classification: CLASSIFICATION_KINDS.NUMERIC,
    colorMode: COLOR_MODES.RAMP,
  },
  {
    value: "proportionalCircles",
    geom: ["Point"],
    maxClasses: CLASSIFICATION_LIMITS.classes.max,
    methods: CLASSIFICATION_METHOD_IDS,
    classification: CLASSIFICATION_KINDS.NUMERIC,
    colorMode: COLOR_MODES.SINGLE,
  },
  {
    value: "proportionalColoredCircles",
    geom: ["Point"],
    maxClasses: CLASSIFICATION_LIMITS.classes.max,
    methods: CLASSIFICATION_METHOD_IDS,
    classification: CLASSIFICATION_KINDS.NUMERIC,
    colorMode: COLOR_MODES.RAMP,
  },
  {
    value: "categorized",
    geom: ["Point", "Polygon", "LineString"],
    maxClasses: MAX_STYLE_RULES,
    classification: CLASSIFICATION_KINDS.CATEGORICAL,
    colorMode: COLOR_MODES.RANDOM,
  },
  {
    value: "cluster",
    geom: ["Point"],
    maxClasses: MAX_CLUSTER_CLASSES,
    classification: CLASSIFICATION_KINDS.COUNT,
    colorMode: COLOR_MODES.RAMP,
  },
];

// OGC scale denominator at Web Mercator zoom 0 (256 px tiles, 0.28 mm pixels).
export const LABEL_SCALE_DENOMINATOR = 559082264.0287178;

export const LABEL_SCALE_PRESETS = [
  {
    value: "regional",
    minZoom: 5,
    maxZoom: 15,
  },
  {
    value: "departmental",
    minZoom: 7,
    maxZoom: 15,
  },
  {
    value: "municipal",
    minZoom: 11,
    maxZoom: 19,
  },
  {
    value: "street",
    minZoom: 16,
    maxZoom: 19,
  },
];

export const DEFAULT_LABELS = {
  enabled: false,
  showClusterCount: true,
  onlyClusterCount: false,
  field: "",
  font: "Calibri",
  size: 10,
  color: "#000000",
  fillOpacity: 1,
  strokeColor: "#ffffff",
  radius: 1,
  scale: "regional",
};
