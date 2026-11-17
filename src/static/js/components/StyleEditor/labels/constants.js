import { LABEL_SCALE_PRESETS } from "../../../utils/styler/constants.js";

export const LABEL_SCALES = LABEL_SCALE_PRESETS.map((preset) => ({
  ...preset,
  label: `style_editor.labels.${preset.value}`,
}));

export const LABEL_PREVIEW = {
  svgNamespace: "http://www.w3.org/2000/svg",
  height: 64,
  text: "Lorem Ipsum",
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
