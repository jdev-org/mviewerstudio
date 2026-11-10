// OGC scale denominator at Web Mercator zoom 0 (256 px tiles, 0.28 mm pixels).
export const LABEL_SCALE_DENOMINATOR = 559082264.0287178;

export const LABEL_SCALES = [
  { value: "regional", label: "style_editor.labels.regional", minZoom: 5, maxZoom: 15 },
  {
    value: "departmental",
    label: "style_editor.labels.departmental",
    minZoom: 7,
    maxZoom: 15,
  },
  {
    value: "municipal",
    label: "style_editor.labels.municipal",
    minZoom: 11,
    maxZoom: 19,
  },
  {
    value: "street",
    label: "style_editor.labels.street",
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
  radius: 6,
  scale: "regional",
};

export const LABEL_PREVIEW = {
  svgNamespace: "http://www.w3.org/2000/svg",
  height: 64,
  text: "Aa",
};

export const LABEL_FONTS = [
  "Calibri",
  "Arial",
  "Verdana",
  "Tahoma",
  "Trebuchet MS",
  "Georgia",
  "Times New Roman",
  "Courier New",
  "sans-serif",
  "serif",
  "monospace",
];

export const LABEL_FIELDS = [
  {
    name: "font",
    label: "style_editor.labels.font",
    options: LABEL_FONTS.map((font) => ({ label: font, value: font })),
  },
  { name: "size", label: "style_editor.labels.size", type: "number", min: 1, step: 1 },
  { name: "color", label: "style_editor.labels.color", type: "color" },
  {
    name: "fillOpacity",
    label: "style_editor.labels.fillOpacity",
    type: "number",
    min: 0,
    max: 1,
    step: 0.1,
  },
  { name: "strokeColor", label: "style_editor.labels.strokeColor", type: "color" },
  {
    name: "radius",
    label: "style_editor.labels.radius",
    type: "number",
    min: 0,
    step: 0.5,
  },
];

export const CLUSTER_COUNT_OPTIONS = [
  { value: "true", label: "style_editor.labels.yes" },
  { value: "false", label: "style_editor.labels.no" },
];
