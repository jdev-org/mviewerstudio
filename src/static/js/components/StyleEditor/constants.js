export const STYLE_MODES = {
  EXISTING: "existing",
  CUSTOM: "custom",
};

export const STYLE_CHOICES = [
  { mode: STYLE_MODES.EXISTING, label: "Choisir un style existant" },
  { mode: STYLE_MODES.CUSTOM, label: "Créer un style personnalisé" },
];

export const STYLE_TYPES = [
  {
    value: "simple",
    label: "Représentation uniforme",
    description: "Représentation unique pour toutes les données",
    geom: ["Point", "LineString", "Polygon"],
    rules: ["size", "fill", "stroke", "symbolizer"],
  },
  {
    value: "analyse",
    label: "Variation de valeurs/couleurs",
    description: "Représentation d'une donnée quantitative relative",
    geom: ["Point", "Polygon", "LineString"],
    methods: ["jenk", "equalInterval", "quantiles"],
    rules: ["size", "fill", "stroke", "methods", "classes"],
  },
  {
    value: "proportionalCircles",
    label: "Cercles proportionnels",
    description: "Représentation d’une donnée quantitative absolue",
    geom: ["Point"],
    methods: ["jenk", "equalInterval", "quantiles"],
  },
  {
    value: "categorized",
    label: "Catégorisation",
    description: "Représentation d'une données qualitative",
    geom: ["Point", "Polygon", "LineString"],
    maxClasses: 10,
  },
  {
    value: "cluster",
    label: "Regroupement géographique",
    description: "Représentation d'agrégats de points",
    geom: ["Point", "Polygon", "LineString"],
    rules: ["size", "fill", "stroke", "classes", "classesMinMax"],
  },
];

export const DEFAULT_FILL = { color: "#9e5698", opacity: 1 };
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
  { name: "color", label: "Couleur", type: "color" },
  { name: "opacity", label: "Opacité", type: "number", min: 0, max: 1, step: 0.1 },
];
export const STROKE_FIELDS = [
  ...FILL_FIELDS,
  { name: "width", label: "Épaisseur", type: "number", min: 0, step: 0.5 },
];
export const SYMBOL_FIELDS = [
  { name: "minSize", label: "Taille minimale", type: "number", min: 1 },
  { name: "maxSize", label: "Taille maximale", type: "number", min: 1 },
  { name: "externalGraphic", label: "URL du symbole externe", type: "url" },
];
export const STROKE_TYPES = [
  { value: "solid", label: "— Continu" },
  { value: "dashed", label: "– – Tirets" },
  { value: "dotted", label: "··· Pointillés" },
];
export const SYMBOL_SHAPES = [
  { value: "circle", label: "Cercle" },
  { value: "square", label: "Carré" },
  { value: "triangle", label: "Triangle" },
  { value: "external", label: "Symbole externe" },
];
export const CLASSIFICATION_METHODS = [
  { value: "jenk", label: "Jenks" },
  { value: "equalInterval", label: "Intervalles égaux" },
  { value: "quantiles", label: "Quantiles" },
];
