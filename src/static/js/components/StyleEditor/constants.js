export const STYLE_MODES = {
  EXISTING: "existing",
  CUSTOM: "custom",
};

export const STYLE_EDITOR_EVENTS = {
  LOAD_OPTIONS: "loadOptions",
  SHOW_FIELDS: "showFields",
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
  categories:
    "Il est recommandé d’utiliser 7 catégories. Jusqu’à 10 catégories restent possibles, mais la lisibilité peut diminuer.",
  classes:
    "Il est recommandé d’utiliser 5 classes. Jusqu’à 7 classes restent possibles, mais la lisibilité peut diminuer.",
};

export const STYLE_CHOICES = [
  {
    mode: STYLE_MODES.EXISTING,
    label: "Choisir un style existant",
    id: "style-editor-existing",
  },
  {
    mode: STYLE_MODES.CUSTOM,
    label: "Créer un style personnalisé",
    id: "style-editor-custom",
  },
];

export const STYLE_TYPES = [
  {
    value: "simple",
    label: "Représentation uniforme",
    description: "Représentation unique pour toutes les données",
    geom: ["Point", "LineString", "Polygon"],
    rules: ["size", "fill", "stroke", "symbolizer"],
    img: "img/styler/style_simple.png",
  },
  {
    value: "analyse",
    label: "Variation de valeurs/couleurs",
    description: "Représentation d'une donnée quantitative relative",
    geom: ["Point", "Polygon", "LineString"],
    methods: ["jenk", "equalInterval", "quantiles"],
    rules: ["size", "fill", "stroke", "methods", "classes"],
    img: "img/styler/style_degrade.png",
  },
  {
    value: "proportionalCircles",
    label: "Cercles proportionnels",
    description: "Représentation d’une donnée quantitative absolue",
    geom: ["Point"],
    methods: ["jenk", "equalInterval", "quantiles"],
    img: "img/styler/style_cercle_prop.png",
  },
  {
    value: "proportionalColoredCircles",
    label: "Cercles proportionnels colorés",
    description:
      "Représentation d’une donnée quantitative absolue avec une variation (valeur relative) de couleur",
    geom: ["Point"],
    methods: ["jenk", "equalInterval", "quantiles"],
    img: "img/styler/style_cercle_prop_color.png",
  },
  {
    value: "categorized",
    label: "Catégorisation",
    description: "Représentation d'une données qualitative",
    geom: ["Point", "Polygon", "LineString"],
    maxClasses: 10,
    img: "img/styler/style_categ.png",
  },
  {
    value: "cluster",
    label: "Regroupement géographique (clusters)",
    description: "Représentation d'agrégats de points",
    geom: ["Point", "Polygon", "LineString"],
    rules: ["size", "fill", "stroke", "classes", "classesMinMax"],
    img: "img/styler/style_cluster_regroup.png",
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
