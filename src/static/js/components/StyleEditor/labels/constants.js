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
    maxZoom: 15,
  },
];

export const DEFAULT_LABELS = {
  enabled: false,
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

export const LABEL_FIELDS = [
  { name: "font", label: "style_editor.labels.font", type: "text" },
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
