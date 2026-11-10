import {
  POINT_STACKER,
  MAX_CLUSTER_CLASSES,
  DEFAULT_CLUSTER_CLASS_INTERVAL,
  DEFAULT_CLUSTER_SYMBOL,
  DEFAULT_SINGLE_POINT_RADIUS,
  CLASSIFICATION_LIMITS,
} from "../../components/StyleEditor/constants.js";
import { calculateClusterSizes } from "./circleSizes.js";

/**
 * Builds editable inclusive count ranges without reading source attributes.
 * @param {Object} settings Positive integer classInterval and number of classes.
 * @returns {Object[]} A singleton rule, sized intervals and a final unbounded count rule.
 * @throws {Error} If the interval, class count or resulting upper bound is invalid.
 */
export function createClusterClasses({
  classInterval = DEFAULT_CLUSTER_CLASS_INTERVAL,
  classes = CLASSIFICATION_LIMITS.classes.recommended,
}) {
  if (
    !Number.isSafeInteger(classInterval) ||
    classInterval < 1 ||
    !Number.isInteger(classes) ||
    classes < 1 ||
    classes > MAX_CLUSTER_CLASSES ||
    !Number.isSafeInteger(classInterval * classes + 1)
  ) {
    throw new Error(
      mviewer
        .tr("style_editor.error.cluster_classes")
        .replace("{max}", MAX_CLUSTER_CLASSES)
    );
  }
  const rules = Array.from({ length: classes }, (_, index) => {
    const min = Math.max(2, index * classInterval + 1);
    const max = (index + 1) * classInterval;
    return { name: `${min} – ${max}`, clusterCondition: "range", min, max };
  }).filter((rule) => rule.min <= rule.max);
  const sizes = calculateClusterSizes(
    rules,
    DEFAULT_CLUSTER_SYMBOL.minSize / 2,
    DEFAULT_CLUSTER_SYMBOL.maxSize / 2.2
  );
  const singleRule = {
    name: mviewer.tr("style_editor.cluster_rule.single"),
    clusterCondition: "single",
    min: 1,
    max: 1,
    symbol: {
      ...DEFAULT_CLUSTER_SYMBOL,
      minSize: DEFAULT_SINGLE_POINT_RADIUS * 2,
      maxSize: DEFAULT_SINGLE_POINT_RADIUS * 2,
    },
  };
  const threshold = classInterval * classes + 1;
  const overflowRule = {
    name: mviewer.tr("style_editor.cluster_rule.or_more").replace("{min}", threshold),
    clusterCondition: "atLeast",
    min: threshold,
    symbol: {
      ...DEFAULT_CLUSTER_SYMBOL,
      minSize: DEFAULT_CLUSTER_SYMBOL.maxSize,
      maxSize: DEFAULT_CLUSTER_SYMBOL.maxSize,
    },
  };
  return [
    singleRule,
    ...rules.map((rule, index) => ({
      ...rule,
      symbol: {
        ...DEFAULT_CLUSTER_SYMBOL,
        minSize: sizes[index],
        maxSize: sizes[index],
      },
    })),
    overflowRule,
  ];
}

/**
 * Converts a cluster rule condition into a filter on PointStacker's count.
 * @param {Object} rule Rule condition and optional inclusive min/max counts.
 * @returns {Array|undefined} GeoStyler filter, absent for all counts.
 * @throws {Error} If a condition or its count interval is invalid.
 */
export function createClusterRuleFilter(rule) {
  const field = POINT_STACKER.countField;
  switch (rule.clusterCondition) {
    case undefined:
    case "all":
      return;
    case "single":
      return ["==", field, 1];
    case "multiple":
      return [">", field, 1];
    case "atLeast":
      if (Number.isInteger(rule.min) && rule.min >= 1) {
        return [">=", field, rule.min];
      }
      break;
    case "range":
      if (
        Number.isInteger(rule.min) &&
        Number.isInteger(rule.max) &&
        rule.min >= 1 &&
        rule.max >= rule.min
      ) {
        return ["&&", [">=", field, rule.min], ["<=", field, rule.max]];
      }
  }
  throw new Error(mviewer.tr("style_editor.error.cluster_rule"));
}

/**
 * Restores the editable condition represented by an exported count filter.
 * @param {Array|undefined} filter GeoStyler rule filter.
 * @returns {Object} Cluster condition and optional bounds.
 * @throws {Error} If the filter cannot be edited as a cluster rule.
 */
export function restoreClusterRuleFilter(filter) {
  if (!filter) return { clusterCondition: "all" };
  const field = POINT_STACKER.countField;
  if (filter[1] === field && filter[2] === 1) {
    if (filter[0] === "==") return { clusterCondition: "single" };
    if (filter[0] === ">") return { clusterCondition: "multiple" };
  }
  if (filter[0] === ">=" && filter[1] === field) {
    const rule = { clusterCondition: "atLeast", min: filter[2] };
    createClusterRuleFilter(rule);
    return rule;
  }
  if (filter[0] === "&&" && filter.length === 3) {
    const [, lower, upper] = filter;
    if (
      lower[0] === ">=" &&
      upper[0] === "<=" &&
      lower[1] === field &&
      upper[1] === field
    ) {
      const rule = { clusterCondition: "range", min: lower[2], max: upper[2] };
      createClusterRuleFilter(rule);
      return rule;
    }
  }
  throw new Error(mviewer.tr("style_editor.error.cluster_rule"));
}

/**
 * Adds the GeoServer rendering transformation understood by mviewer's cluster reader.
 * This is a FeatureTypeStyle transformation, placed before its symbolizer rules.
 * @param {string} sld Serialized SLD 1.0 or 1.1 document.
 * @param {Object} settings PointStacker configuration with cellSize in pixels.
 * @returns {string} SLD containing one PointStacker transformation.
 */
export function addPointStackerTransformation(sld, settings) {
  const parameters = Object.entries(POINT_STACKER.environment).map(
    ([name, variable]) => `
      <ogc:Function name="parameter">
        <ogc:Literal>${name}</ogc:Literal>
        <ogc:Function name="env">
          <ogc:Literal>${variable}</ogc:Literal>
        </ogc:Function>
      </ogc:Function>`
  );
  const transformation = `
    <Transformation>
      <ogc:Function name="${POINT_STACKER.name}">
        <ogc:Function name="parameter">
          <ogc:Literal>data</ogc:Literal>
        </ogc:Function>
        <ogc:Function name="parameter">
          <ogc:Literal>cellSize</ogc:Literal>
          <ogc:Literal>${settings.cellSize}</ogc:Literal>
        </ogc:Function>
        ${parameters.join("")}
      </ogc:Function>
    </Transformation>`;
  return sld.replace(
    /(<(?:se:)?FeatureTypeStyle\b[^>]*>)/,
    (opening) => opening + transformation
  );
}

/**
 * Reads the literal cellSize from a PointStacker SLD, including the gs alias.
 * The expression matches the transformation block, never symbolizer expressions.
 * @param {string} xml SLD XML content.
 * @returns {Object|undefined} Settings for the exported transformation, if present.
 */
export function readPointStackerTransformation(xml) {
  const transformations = xml.matchAll(
    /<(?:\w+:)?Transformation\b[^>]*>([\s\S]*?)<\/(?:\w+:)?Transformation>/g
  );
  for (const [, transformation] of transformations) {
    if (
      !/<(?:\w+:)?Function\b[^>]*\bname=["'](?:vec|gs):PointStacker["']/.test(
        transformation
      )
    )
      continue;
    const parameter = transformation.match(
      /<(?:\w+:)?Literal>\s*cellSize\s*<\/(?:\w+:)?Literal>\s*<(?:\w+:)?Literal>\s*([\d.eE+-]+)\s*<\/(?:\w+:)?Literal>/
    );
    if (parameter) {
      const cellSize = +parameter[1];
      if (Number.isFinite(cellSize) && cellSize >= 0) return { cellSize };
    }
  }
}

/**
 * Wraps preview features without modifying their attributes or geometries.
 * @param {ol.source.Vector} source Original preview data source.
 * @param {Object} settings PointStacker cellSize in screen pixels.
 * @returns {ol.source.Cluster} Cluster source exposing count for SLD labels and filters.
 */
export function createPointStackerSource(source, settings) {
  return new ol.source.Cluster({
    source,
    distance: settings.cellSize,
    createCluster: (geometry, features) => {
      // Only singletons expose source fields; grouped labels use the generated count.
      let properties = {};
      if (features.length === 1) properties = features[0].getProperties();
      return new ol.Feature({
        ...properties,
        geometry,
        features,
        [POINT_STACKER.countField]: features.length,
      });
    },
  });
}
