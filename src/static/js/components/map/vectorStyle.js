/** Évalue les expressions utilisées par les styles produits par Studio.
 * @param {*} value Valeur littérale ou expression GeoStyler.
 * @param {Object} feature Entité OpenLayers.
 * @returns {*} Valeur calculée.
 */
function evaluate(value, feature) {
  if (!value || typeof value !== "object" || !value.name) return value;
  if (value.name === "property") return feature.get(value.args[0]);
  const args = value.args.map((argument) => evaluate(argument, feature));
  if (value.name === "strConcat") return args.join("");
  throw new Error(`Unsupported SLD expression: ${value.name}`);
}

/** Teste les filtres de catégories et de classes GeoStyler.
 * @param {Array} filter Filtre de la règle.
 * @param {Object} feature Entité OpenLayers.
 * @returns {boolean} Vrai si la règle s'applique.
 */
function matches(filter, feature) {
  if (!filter) return true;
  const [operator, field, expected, upper] = filter;
  if (operator === "&&") return filter.slice(1).every((item) => matches(item, feature));
  if (operator === "||") return filter.slice(1).some((item) => matches(item, feature));
  if (operator === "!") return !matches(field, feature);
  let actual = feature.get(field);
  if (typeof field === "object") actual = evaluate(field, feature);
  if (typeof expected === "number" && typeof actual === "string" && actual.trim()) {
    // Les valeurs CSV restent des chaînes, alors que les bornes du SLD sont numériques.
    actual = +actual.replace(",", ".");
  }
  switch (operator) {
    case "==":
      return actual === expected;
    case "!=":
      return actual !== expected;
    case ">":
      return actual > expected;
    case ">=":
      return actual >= expected;
    case "<":
      return actual < expected;
    case "<=":
      return actual <= expected;
    case "<=x<=":
      return actual >= expected && actual <= upper;
    default:
      throw new Error(`Unsupported SLD filter: ${operator}`);
  }
}

/** Combine une couleur et son opacité sans modifier les couleurs OpenLayers partagées.
 * @param {string} value Couleur CSS.
 * @param {number} opacity Opacité optionnelle.
 * @returns {Array|undefined} Couleur RGBA.
 */
function color(value, opacity) {
  if (!value) return;
  const result = ol.color.asArray(value).slice();
  if (opacity !== undefined) result[3] *= opacity;
  return result;
}

/** Construit un symbole OpenLayers depuis un symbole SLD lu par GeoStyler.
 * @param {Object} symbol Symbole GeoStyler.
 * @param {Object} feature Entité OpenLayers.
 * @returns {Object} Style OpenLayers.
 */
function symbolStyle(symbol, feature) {
  const value = {};
  for (const [key, item] of Object.entries(symbol)) value[key] = evaluate(item, feature);
  const fill = new ol.style.Fill({ color: color(value.color, value.fillOpacity) });
  if (value.kind === "Fill") {
    return new ol.style.Style({
      fill,
      stroke: new ol.style.Stroke({
        color: color(value.outlineColor, value.outlineOpacity),
        width: value.outlineWidth,
        lineDash: value.outlineDasharray,
        lineCap: value.outlineCap,
      }),
    });
  }
  if (value.kind === "Line") {
    return new ol.style.Style({
      stroke: new ol.style.Stroke({
        color: color(value.color, value.opacity),
        width: value.width,
        lineDash: value.dasharray,
        lineCap: value.cap,
        lineJoin: value.join,
      }),
    });
  }
  if (value.kind === "Text") {
    let text = value.label;
    if (typeof text === "string") {
      text = text.replace(/\{\{(.+?)\}\}/g, (match, field) => {
        const property = feature.get(field);
        if (property === undefined || property === null) return "";
        return `${property}`;
      });
    } else if (text !== undefined && text !== null) text = `${text}`;
    return new ol.style.Style({
      text: new ol.style.Text({
        text,
        font: `${value.fontStyle || "normal"} ${value.fontWeight || "normal"} ${value.size || 12}px ${(value.font || ["sans-serif"]).join(",")}`,
        fill: new ol.style.Fill({ color: color(value.color, value.opacity) }),
        stroke: new ol.style.Stroke({
          color: color(value.haloColor, value.haloOpacity),
          width: (value.haloWidth || 0) * 2,
        }),
        offsetX: value.offset && value.offset[0],
        offsetY: value.offset && value.offset[1],
        placement: value.placement,
      }),
    });
  }
  if (value.kind === "Icon") {
    const icon = new ol.style.Icon({
      src: value.image,
      opacity: value.opacity,
      rotation: ((value.rotate || 0) * Math.PI) / 180,
    });
    if (value.size) {
      icon.listenImageChange(() => {
        const size = icon.getSize();
        if (size) icon.setScale(value.size / Math.max(...size));
      });
    }
    return new ol.style.Style({ image: icon });
  }
  if (value.kind !== "Mark") throw new Error(`Unsupported SLD symbol: ${value.kind}`);
  const options = {
    fill,
    stroke: new ol.style.Stroke({
      color: color(value.strokeColor, value.strokeOpacity),
      width: value.strokeWidth,
      lineDash: value.strokeDasharray,
    }),
    radius: value.radius,
    rotation: ((value.rotate || 0) * Math.PI) / 180,
  };
  let image;
  switch (value.wellKnownName) {
    case "circle":
      image = new ol.style.Circle(options);
      break;
    case "square":
      image = new ol.style.RegularShape({ ...options, points: 4, angle: Math.PI / 4 });
      break;
    case "triangle":
      image = new ol.style.RegularShape({ ...options, points: 3 });
      break;
    case "star":
      image = new ol.style.RegularShape({
        ...options,
        points: 5,
        radius2: value.radius / 2,
      });
      break;
    case "cross":
      image = new ol.style.RegularShape({ ...options, points: 4, radius2: 0 });
      break;
    case "x":
      image = new ol.style.RegularShape({
        ...options,
        points: 4,
        radius2: 0,
        angle: Math.PI / 4,
      });
      break;
    default:
      throw new Error(`Unsupported SLD mark: ${value.wellKnownName}`);
  }
  return new ol.style.Style({ image });
}

/** Convertit un style SLD parsé en fonction de style pour les 15 entités de preview.
 * @param {Object} style Style GeoStyler.
 * @param {Object} projection Projection de la vue.
 * @returns {Function} Fonction de style OpenLayers respectant filtres et échelles.
 */
export function createVectorStyle(style, projection) {
  // Les entités de preview sont stables ; un nouveau SLD recrée cette fonction et son cache.
  const cache = new WeakMap();
  return (feature, resolution) => {
    // Le dénominateur SLD exprime une échelle papier avec un pixel de référence de 0,28 mm.
    const scale = (resolution * projection.getMetersPerUnit()) / 0.00028;
    const rules = style.rules.filter((rule) => {
      const range = rule.scaleDenominator || {};
      return (
        !(range.min !== undefined && scale < range.min) &&
        !(range.max !== undefined && scale >= range.max) &&
        matches(rule.filter, feature)
      );
    });
    const hasMatch = rules.some((rule) => !rule.elseRule);
    let featureStyles = cache.get(feature);
    if (!featureStyles) {
      featureStyles = new Map();
      cache.set(feature, featureStyles);
    }
    return rules
      .filter((rule) => !rule.elseRule || !hasMatch)
      .flatMap((rule) => {
        if (!featureStyles.has(rule)) {
          featureStyles.set(
            rule,
            rule.symbolizers.map((symbol) => symbolStyle(symbol, feature))
          );
        }
        return featureStyles.get(rule);
      });
  };
}
