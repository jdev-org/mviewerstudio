import {
  DEFAULT_FILL,
  DEFAULT_STROKE,
  DEFAULT_SYMBOL,
} from "../../components/StyleEditor/constants.js";

/**
 * Restaure le trait d'un symbole GeoStyler, y compris les pointillés.
 * @param {Object} stroke Couleur, opacité, largeur et tirets du trait.
 * @returns {Object} Trait utilisable dans le formulaire.
 */
const restoreStroke = ({ color, opacity, width, dasharray }) => {
  const stroke = { ...DEFAULT_STROKE };
  if (color !== undefined) stroke.color = color;
  if (opacity !== undefined) stroke.opacity = opacity;
  if (width !== undefined) stroke.width = width;
  if (dasharray && dasharray.length > 0) {
    stroke.lineStyle = dasharray[0] === width ? "dotted" : "dashed";
  }
  return stroke;
};

/**
 * Convertit un symbole GeoStyler en paramètres du formulaire.
 * @param {Object} symbolizer Symbole Mark, Icon, Line ou Fill lu dans le SLD.
 * @returns {Object} Géométrie et paramètres graphiques.
 */
const restoreSymbolizer = (symbolizer) => {
  const fill = { ...DEFAULT_FILL };
  const symbol = { ...DEFAULT_SYMBOL };
  let geometry = "Point";
  let stroke;
  if (symbolizer.kind === "Line") {
    geometry = "LineString";
    stroke = restoreStroke(symbolizer);
  } else if (symbolizer.kind === "Fill") {
    geometry = "Polygon";
    stroke = restoreStroke({
      color: symbolizer.outlineColor,
      opacity: symbolizer.outlineOpacity,
      width: symbolizer.outlineWidth,
      dasharray: symbolizer.outlineDasharray,
    });
  } else if (symbolizer.kind === "Mark") {
    stroke = restoreStroke({
      color: symbolizer.strokeColor,
      opacity: symbolizer.strokeOpacity,
      width: symbolizer.strokeWidth,
      dasharray: symbolizer.strokeDasharray,
    });
    symbol.shape = symbolizer.wellKnownName;
    symbol.minSize = symbolizer.radius * 2;
    symbol.maxSize = symbol.minSize;
  } else if (symbolizer.kind === "Icon") {
    stroke = { ...DEFAULT_STROKE };
    symbol.shape = "external";
    symbol.externalGraphic = symbolizer.image;
    symbol.minSize = symbolizer.size;
    symbol.maxSize = symbolizer.size;
    if (symbolizer.opacity !== undefined) fill.opacity = symbolizer.opacity;
  } else {
    throw new Error("Unsupported SLD symbolizer.");
  }
  if (symbolizer.color !== undefined) fill.color = symbolizer.color;
  if (symbolizer.fillOpacity !== undefined) fill.opacity = symbolizer.fillOpacity;
  return { geometry, fill, stroke, symbol };
};

/**
 * Décompose les filtres de catégories et d'intervalles générés par Studio.
 * @param {Array|undefined} filter Filtre GeoStyler.
 * @returns {Object[]} Champ et valeur ou bornes pour chaque classification.
 */
const restoreClassifications = (filter) => {
  if (!filter) return [];
  if (filter[0] === "==") return [{ field: filter[1], value: filter[2] }];
  if (filter[0] === "&&") {
    const [, lower, upper] = filter;
    if ([">", ">="].includes(lower[0]) && upper[0] === "<=" && lower[1] === upper[1]) {
      return [{ field: lower[1], min: lower[2], max: upper[2] }];
    }
    return filter.slice(1).flatMap(restoreClassifications);
  }
  throw new Error("Unsupported SLD classification filter.");
};

/**
 * Reconstitue les règles éditables d'un style produit par Studio.
 * @param {Object} style Style GeoStyler lu dans le SLD.
 * @returns {Object} Configuration de CustomStyle.
 */
export const geoStylerToConfiguration = (style) => {
  if (!style.rules || style.rules.length === 0) throw new Error("The SLD has no rules.");
  const entries = style.rules.map((rule) => {
    if (rule.symbolizers.length !== 1) throw new Error("Unsupported SLD rule.");
    const { geometry, ...graphics } = restoreSymbolizer(rule.symbolizers[0]);
    return {
      geometry,
      classifications: restoreClassifications(rule.filter),
      rule: { name: rule.name, ...graphics },
    };
  });
  const geometry = entries[0].geometry;
  const first = entries[0].classifications[0];
  let type = "simple";
  if (first) {
    type = "analyse";
    if (first.value !== undefined) type = "categorized";
    else if (
      geometry === "Point" &&
      new Set(entries.map((entry) => entry.rule.symbol.maxSize)).size > 1
    ) {
      type = "proportionalCircles";
    }
  }
  const configuration = { type, geometry, rules: [] };
  if (first) configuration.field = first.field;
  const combined = entries[0].classifications.length === 2;
  if (combined) {
    configuration.type = "proportionalColoredCircles";
    configuration.colorClassification = {
      field: entries[0].classifications[1].field,
      rules: [],
    };
  }
  entries.forEach(({ classifications, rule }) => {
    const classification = classifications[0] || {};
    const restored = { ...rule, ...classification };
    delete restored.field;
    if (!combined) {
      configuration.rules.push(restored);
      return;
    }
    // Le SLD croise les classes de taille et de couleur : restaurer deux listes.
    const names = rule.name.split(" / ");
    restored.name = names[0];
    if (
      !configuration.rules.some(
        (item) => item.min === restored.min && item.max === restored.max
      )
    ) {
      configuration.rules.push(restored);
    }
    const colorRule = {
      ...rule,
      ...classifications[1],
      name: names.slice(1).join(" / "),
    };
    delete colorRule.field;
    const colors = configuration.colorClassification;
    if (
      !colors.rules.some(
        (item) => item.min === colorRule.min && item.max === colorRule.max
      )
    ) {
      colors.rules.push(colorRule);
    }
  });
  configuration.classes = configuration.rules.length;
  configuration.maxSize = Math.max(
    ...configuration.rules.map((rule) => rule.symbol.maxSize)
  );
  if (configuration.type === "proportionalCircles")
    configuration.color = configuration.rules[0].fill.color;
  if (combined)
    configuration.colorClassification.classes =
      configuration.colorClassification.rules.length;
  return configuration;
};

/**
 * Charge un SLD, en résolvant son chemin relatif depuis l'instance mviewer.
 * @param {string} sld URL absolue ou chemin relatif enregistré sur la couche.
 * @returns {Promise<Object>} Style GeoStyler et configuration du formulaire.
 */
export const loadSldStyle = async (sld) => {
  const instance = _conf.mviewer_instance.replace(/\/?$/, "/");
  const base = new URL(instance, window.location.origin);
  const url = new URL(sld, base);
  let target = url.toString();
  if (url.origin !== window.location.origin && _conf.proxy) {
    target = _conf.proxy + encodeURIComponent(target);
  }
  const response = await fetch(target);
  if (!response.ok) throw new Error(`Could not load SLD (HTTP ${response.status}).`);
  const parser = new globalThis.GeoStylerSLDParser.SldStyleParser();
  const { output, errors } = await parser.readStyle(await response.text());
  if (errors && errors.length > 0) {
    throw new Error(errors.map((error) => error.message || error).join("\n"));
  }
  if (!output) throw new Error("SLD conversion produced no output.");
  return { geoStylerStyle: output, configuration: geoStylerToConfiguration(output) };
};
