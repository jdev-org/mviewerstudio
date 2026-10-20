import {
  DEFAULT_FILL,
  DEFAULT_STROKE,
  DEFAULT_SYMBOL,
} from "../../components/StyleEditor/constants.js";

/**
 * Construit un style GeoStyler indépendant des règles fournies.
 * @param {string} name Nom du style.
 * @param {Object[]} rules Règles au format GeoStyler.
 * @returns {Object} Style GeoStyler.
 */
export const createEmptyGeoStylerObject = (name = "", rules = []) => ({
  name,
  rules: structuredClone(rules),
});

/**
 * Convertit les paramètres graphiques de l'éditeur en symbole GeoStyler.
 * Les tailles de l'éditeur sont des diamètres ; Mark utilise un rayon.
 * @param {Object} options Géométrie et paramètres fill, stroke et symbol d'une règle.
 * @returns {Object} Symbole Mark, Icon, Line ou Fill.
 * @throws {Error} Si la géométrie ou l'URL d'une icône est invalide.
 */
export const createGeoStylerSymbolizer = ({
  geometry = "Point",
  fill = {},
  stroke = {},
  symbol = {},
} = {}) => {
  fill = { ...DEFAULT_FILL, ...fill };
  stroke = { ...DEFAULT_STROKE, ...stroke };
  symbol = { ...DEFAULT_SYMBOL, ...symbol };

  let dasharray;
  if (stroke.lineStyle === "dashed") {
    dasharray = [stroke.width * 4, stroke.width * 2];
  }
  if (stroke.lineStyle === "dotted") {
    dasharray = [stroke.width, stroke.width * 3];
  }

  if (geometry === "LineString" || geometry === "MultiLineString") {
    const result = {
      kind: "Line",
      color: stroke.color,
      opacity: stroke.opacity,
      width: stroke.width,
    };
    if (dasharray) result.dasharray = dasharray;
    if (stroke.lineStyle === "dotted") result.cap = "round";
    return result;
  }

  if (geometry === "Polygon" || geometry === "MultiPolygon") {
    const result = {
      kind: "Fill",
      color: fill.color,
      fillOpacity: fill.opacity,
      outlineColor: stroke.color,
      outlineOpacity: stroke.opacity,
      outlineWidth: stroke.width,
    };
    if (dasharray) result.outlineDasharray = dasharray;
    if (stroke.lineStyle === "dotted") result.outlineCap = "round";
    return result;
  }

  if (geometry !== "Point" && geometry !== "MultiPoint") {
    throw new Error(`Unsupported geometry: ${geometry}`);
  }

  if (symbol.shape === "external") {
    if (!symbol.externalGraphic) throw new Error("An external graphic URL is required.");
    return {
      kind: "Icon",
      image: symbol.externalGraphic,
      size: symbol.maxSize,
      opacity: fill.opacity,
    };
  }

  const result = {
    kind: "Mark",
    wellKnownName: symbol.shape,
    radius: symbol.maxSize / 2,
    color: fill.color,
    fillOpacity: fill.opacity,
    strokeColor: stroke.color,
    strokeOpacity: stroke.opacity,
    strokeWidth: stroke.width,
  };
  if (dasharray) result.strokeDasharray = dasharray;
  return result;
};

/**
 * Construit une règle indépendante des symboles et du filtre fournis.
 * @param {string} name Libellé de la règle.
 * @param {Object[]} symbolizers Symboles au format GeoStyler.
 * @param {Array} [filter] Filtre GeoStyler, par exemple ["==", "type", "A"].
 * @returns {Object} Règle GeoStyler.
 */
export const createGeoStylerRuleObject = (name, symbolizers = [], filter) => {
  const rule = { name, symbolizers: structuredClone(symbolizers) };
  if (filter) rule.filter = structuredClone(filter);
  return rule;
};

/**
 * Construit le filtre d'une règle de classification de l'éditeur.
 * La borne inférieure partagée avec une autre classe est exclusive.
 * @param {Object} classification Type, champ et règles de la classification.
 * @param {Object} rule Règle à filtrer.
 * @returns {Array|undefined} Filtre GeoStyler, absent pour un style uniforme.
 */
const createClassificationFilter = (classification, rule) => {
  if (!classification.field || classification.type === "cluster") return;
  if (classification.type === "categorized") {
    return ["==", classification.field, rule.value];
  }
  if (classification.type === "simple") return;

  const sharedMinimum = classification.rules.some(
    (other) => other !== rule && other.max === rule.min
  );
  let lowerOperator = ">=";
  if (sharedMinimum) lowerOperator = ">";
  return [
    "&&",
    [lowerOperator, classification.field, rule.min],
    ["<=", classification.field, rule.max],
  ];
};

/**
 * Convertit la configuration du style personnalisé en objet GeoStyler.
 * Les classifications de taille et de couleur sont croisées pour les cercles colorés.
 * @param {Object} configuration Valeur retournée par CustomStyle.getValue().
 * @param {string} [name=""] Nom du style.
 * @returns {Object} Style GeoStyler indépendant de la configuration.
 */
export const createGeoStylerStyle = (configuration, name = "") => {
  const rules = [];
  const addRule = (rule, colorRule, colorClassification) => {
    const options = { ...rule, geometry: configuration.geometry };
    let ruleName = rule.name;
    let filter = createClassificationFilter(configuration, rule);
    if (colorRule) {
      options.fill = colorRule.fill;
      options.stroke = colorRule.stroke;
      ruleName = `${rule.name} / ${colorRule.name}`;
      const colorFilter = createClassificationFilter(colorClassification, colorRule);
      if (filter && colorFilter) {
        filter = ["&&", filter, colorFilter];
      } else if (colorFilter) {
        filter = colorFilter;
      }
    }
    rules.push(
      createGeoStylerRuleObject(ruleName, [createGeoStylerSymbolizer(options)], filter)
    );
  };

  configuration.rules.forEach((rule) => {
    if (configuration.colorClassification) {
      const colors = { ...configuration.colorClassification, type: "analyse" };
      colors.rules.forEach((colorRule) => addRule(rule, colorRule, colors));
    } else {
      addRule(rule);
    }
  });
  return createEmptyGeoStylerObject(name, rules);
};

/**
 * Sérialise un style GeoStyler avec la bibliothèque chargée dans index.html.
 * @param {Object} style Style GeoStyler contenant name et rules.
 * @param {Object} [options={}] Options de SldStyleParser, dont sldVersion.
 * @returns {Promise<string>} Document SLD.
 * @throws {Error} Si la bibliothèque manque ou si la conversion échoue.
 */
export const geoStylerToSld = async (style, options = {}) => {
  const parser = new globalThis.GeoStylerSLDParser.SldStyleParser(options);
  const { output, errors } = await parser.writeStyle(style);
  if (errors && errors.length > 0) {
    throw new Error(errors.map((error) => error.message || error).join("\n"));
  }
  if (!output) throw new Error("SLD conversion produced no output.");
  return output;
};
