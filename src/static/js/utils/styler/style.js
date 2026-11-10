import { createLabelRule } from "./labels.js";
import { addPointStackerTransformation, createClusterRuleFilter } from "./cluster.js";
import {
  DEFAULT_FILL,
  DEFAULT_STROKE,
  DEFAULT_SYMBOL,
  STYLE_GEOMETRIES,
  STYLE_TYPES,
  DEFAULT_SLD_VERSION,
  SLD_SCHEMA_LOCATIONS,
  DEFAULT_CLUSTER_DISTANCE,
  MAX_CLUSTER_RULES,
  POINT_STACKER,
} from "../../components/StyleEditor/constants.js";

/**
 * Associe une géométrie GeoJSON ou un type GML à la géométrie de l'éditeur.
 * @param {string} geometry Type GeoJSON ou WFS, par exemple gml:MultiSurfacePropertyType.
 * @returns {string|undefined} Point, LineString ou Polygon ; absent si indéterminé.
 */
export const getStyleGeometry = (geometry) => {
  if (!geometry) return;
  const type = geometry
    .split(":")
    .pop()
    .replace(/PropertyType$|Type$/, "");
  return STYLE_GEOMETRIES[type];
};

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
  const styleGeometry = getStyleGeometry(geometry);
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

  if (styleGeometry === "LineString") {
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

  if (styleGeometry === "Polygon") {
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

  if (styleGeometry !== "Point") {
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
  if (classification.type === "cluster") return createClusterRuleFilter(rule);
  if (!classification.field) return;
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
  const geometry = getStyleGeometry(configuration.geometry);
  const definition = STYLE_TYPES.find((type) => type.value === configuration.type);
  if (!definition || !definition.geom.includes(geometry)) {
    throw new Error(
      `Style ${configuration.type} is incompatible with geometry ${configuration.geometry}.`
    );
  }
  if (
    configuration.type === "cluster" &&
    configuration.rules.length > MAX_CLUSTER_RULES
  ) {
    throw new Error(
      mviewer
        .tr("style_editor.error.cluster_rule_limit")
        .replace("{max}", MAX_CLUSTER_RULES)
    );
  }
  const rules = [];
  const addRule = (rule, colorRule, colorClassification) => {
    const options = { ...rule, geometry };
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
    const outputRule = createGeoStylerRuleObject(
      ruleName,
      [createGeoStylerSymbolizer(options)],
      filter
    );
    const scaleDenominator = { ...rule.scaleDenominator };
    if (colorRule && colorRule.scaleDenominator) {
      // Crossed size and color rules are visible only within their shared scale range.
      const colorScale = colorRule.scaleDenominator;
      if (colorScale.min !== undefined) {
        scaleDenominator.min = Math.max(scaleDenominator.min || 0, colorScale.min);
      }
      if (colorScale.max !== undefined) {
        scaleDenominator.max = colorScale.max;
        if (rule.scaleDenominator && rule.scaleDenominator.max !== undefined) {
          scaleDenominator.max = Math.min(rule.scaleDenominator.max, colorScale.max);
        }
      }
    }
    if (
      scaleDenominator.max !== undefined &&
      scaleDenominator.max <= (scaleDenominator.min || 0)
    )
      return;
    if (Object.keys(scaleDenominator).length) {
      outputRule.scaleDenominator = scaleDenominator;
    }
    rules.push(outputRule);
  };

  configuration.rules.forEach((rule) => {
    if (configuration.colorClassification) {
      const colors = { ...configuration.colorClassification, type: "analyse" };
      colors.rules.forEach((colorRule) => addRule(rule, colorRule, colors));
    } else {
      addRule(rule);
    }
  });
  const labels = configuration.labels;
  const onlyCount = configuration.type === "cluster" && labels && labels.onlyClusterCount;
  let labelSettings = labels;
  if (onlyCount) labelSettings = { ...labels, field: POINT_STACKER.countField };
  const labelRule = createLabelRule(labelSettings);
  if (labelRule) {
    if (configuration.type === "cluster") {
      // Preserve the selected source field for singletons and use count for groups.
      if (!onlyCount) {
        labelRule.filter = ["==", POINT_STACKER.countField, 1];
        rules.push(labelRule);
      }
      if (onlyCount || labels.showClusterCount !== false) {
        const groupLabelRule = createLabelRule({
          ...labels,
          field: POINT_STACKER.countField,
        });
        // Group counts remain visible at every scale when their display is enabled.
        delete groupLabelRule.scaleDenominator;
        groupLabelRule.filter = [">", POINT_STACKER.countField, 1];
        rules.push(groupLabelRule);
      }
    } else {
      rules.push(labelRule);
    }
  }
  const style = createEmptyGeoStylerObject(name, rules);
  if (configuration.type === "cluster") {
    let distance = DEFAULT_CLUSTER_DISTANCE;
    if (configuration.distance !== undefined) distance = +configuration.distance;
    if (!Number.isFinite(distance) || distance < 0) {
      throw new Error(mviewer.tr("style_editor.error.cluster_distance"));
    }
    style.pointStacker = { cellSize: distance };
  }
  return style;
};

/**
 * Serialize a GeoStyler style as SLD 1.1.0 with SE 1.1 symbolizers by default.
 * @param {Object} style GeoStyler style containing name and rules.
 * @param {Object} [options={}] SldStyleParser options, including sldVersion.
 * @param {string} [options.layerName] Technical WMS name for NamedLayer/Name.
 * @returns {Promise<string>} SLD document referencing its official schema.
 * @throws {Error} If the parser is unavailable or serialization fails.
 */
export const geoStylerToSld = async (style, options = {}) => {
  const { layerName, ...parserOptions } = options;
  const sldVersion = parserOptions.sldVersion || DEFAULT_SLD_VERSION;
  const parser = new globalThis.GeoStylerSLDParser.SldStyleParser({
    ...parserOptions,
    sldVersion,
  });
  const { output, errors } = await parser.writeStyle(style);
  if (errors && errors.length > 0) {
    throw new Error(errors.map((error) => error.message || error).join("\n"));
  }
  if (!output) throw new Error("SLD conversion produced no output.");
  let sld = output.replace(
    /xsi:schemaLocation="[^"]*"/,
    `xsi:schemaLocation="http://www.opengis.net/sld ${SLD_SCHEMA_LOCATIONS[sldVersion]}"`
  );
  if (style.pointStacker) sld = addPointStackerTransformation(sld, style.pointStacker);
  if (layerName) {
    const xmlLayerName = layerName.replace(
      /[<>&"']/g,
      (character) =>
        ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[
          character
        ]
    );
    // Preserve the readable style name when replacing the technical layer name.
    return sld.replace(
      /(<NamedLayer>\s*<(?:se:)?Name>)[\s\S]*?(<\/(?:se:)?Name>)/,
      (match, opening, closing) => `${opening}${xmlLayerName}${closing}`
    );
  }
  return sld;
};
