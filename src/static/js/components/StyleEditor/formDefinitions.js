import {
  STYLE_MODES,
  STYLE_DEFINITIONS,
  CLASSIFICATION_METHOD_IDS,
} from "../../utils/styler/constants.js";

/** Form fields, translated choices and presentation metadata for the style editor. */

export const CLASSIFICATION_TOOLTIPS = {
  categories: "style_editor.tooltip.categories",
  classes: "style_editor.tooltip.classes",
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

export const STYLE_TYPES = [
  {
    value: "simple",
    label: "style_editor.type.simple",
    description: "style_editor.type.simple.description",
    img: "img/styler/style_simple.png",
    styleProp: [],
  },
  {
    value: "analyse",
    label: "style_editor.type.analyse",
    description: "style_editor.type.analyse.description",
    img: "img/styler/style_degrade.png",
    styleProp: ["field", "methods", "ramps", "classes"],
  },
  {
    value: "proportionalCircles",
    label: "style_editor.type.proportionalCircles",
    description: "style_editor.type.proportionalCircles.description",
    img: "img/styler/style_cercle_prop.png",
    styleProp: ["field", "methods", "color", "classes", "maxSize"],
  },
  {
    value: "proportionalColoredCircles",
    label: "style_editor.type.proportionalColoredCircles",
    description: "style_editor.type.proportionalColoredCircles.description",
    img: "img/styler/style_cercle_prop_color.png",
    styleProp: ["field", "methods", "ramps", "classes"],
  },
  {
    value: "categorized",
    label: "style_editor.type.categorized",
    description: "style_editor.type.categorized.description",
    styleProp: ["field", "randomColor"],
    img: "img/styler/style_categ.png",
  },
  {
    value: "cluster",
    label: "style_editor.type.cluster",
    description: "style_editor.type.cluster.description",
    styleProp: ["distance", "classInterval", "classes", "ramps"],
    img: "img/styler/style_cluster_regroup.png",
  },
].map((presentation) => ({
  ...STYLE_DEFINITIONS.find((definition) => definition.value === presentation.value),
  ...presentation,
}));

export const CLUSTER_RULE_CONDITIONS = [
  { value: "all", label: "style_editor.cluster_rule.all" },
  { value: "single", label: "style_editor.cluster_rule.single" },
  { value: "multiple", label: "style_editor.cluster_rule.multiple" },
  { value: "range", label: "style_editor.cluster_rule.range" },
  { value: "atLeast", label: "style_editor.cluster_rule.at_least" },
];

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

export const CLASSIFICATION_METHODS = CLASSIFICATION_METHOD_IDS.map((value) => ({
  value,
  label: `style_editor.method.${value}`,
}));

export const RULE_SCALE_FIELDS = [
  { name: "min", label: "style_editor.scale.min", type: "number", min: 0, step: "any" },
  { name: "max", label: "style_editor.scale.max", type: "number", min: 0, step: "any" },
];
