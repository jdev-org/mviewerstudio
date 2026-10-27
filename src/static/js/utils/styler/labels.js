import {
  DEFAULT_LABELS,
  LABEL_SCALES,
  LABEL_SCALE_DENOMINATOR,
} from "../../components/StyleEditor/labels/constants.js";

/**
 * Build an independent text rule so label scales do not hide layer symbols.
 * @param {Object} labels Label settings from the editor.
 * @returns {Object|undefined} GeoStyler rule, absent when labels are disabled.
 */
export const createLabelRule = (labels) => {
  if (!labels || !labels.enabled) return;
  const settings = { ...DEFAULT_LABELS, ...labels };
  if (labels.radius === undefined && labels.strokeWidth !== undefined) {
    settings.radius = labels.strokeWidth;
  }
  if (!settings.field) throw new Error("A label field is required.");
  const preset = LABEL_SCALES.find((scale) => scale.value === settings.scale);
  let minZoom = settings.minZoom;
  let maxZoom = settings.maxZoom;
  if (minZoom === undefined && preset) minZoom = preset.minZoom;
  if (maxZoom === undefined && preset) maxZoom = preset.maxZoom;
  const rule = {
    name: "Labels",
    symbolizers: [
      {
        kind: "Text",
        label: `{{${settings.field}}}`,
        font: [settings.font],
        size: settings.size,
        color: settings.color,
        haloColor: settings.strokeColor,
        haloOpacity: settings.fillOpacity,
        haloWidth: settings.radius,
      },
    ],
  };
  if (minZoom !== undefined && maxZoom !== undefined) {
    rule.scaleDenominator = {
      min: LABEL_SCALE_DENOMINATOR / 2 ** maxZoom,
      max: LABEL_SCALE_DENOMINATOR / 2 ** minZoom,
    };
  }
  return rule;
};

/**
 * Restore the label settings represented by a Studio text rule.
 * @param {Object} rule GeoStyler rule containing a Text symbolizer.
 * @param {Object[]} [scales=LABEL_SCALES] Configured scale presets.
 * @returns {Object} Editable label settings.
 */
export const restoreLabels = (rule, scales = LABEL_SCALES) => {
  const text = rule.symbolizers.find((symbolizer) => symbolizer.kind === "Text");
  let field;
  if (typeof text.label === "string") {
    const match = text.label.match(/^\{\{(.+)\}\}$/);
    if (match) field = match[1];
  } else if (text.label && text.label.name === "property") {
    field = text.label.args[0];
  }
  if (!field) throw new Error("Unsupported SLD label expression.");
  const labels = { ...DEFAULT_LABELS, enabled: true, field };
  if (text.font && text.font.length) labels.font = text.font[0];
  if (text.size !== undefined) labels.size = text.size;
  if (text.color !== undefined) labels.color = text.color;
  if (text.haloColor !== undefined) labels.strokeColor = text.haloColor;
  if (text.haloOpacity !== undefined) labels.fillOpacity = text.haloOpacity;
  if (text.haloWidth !== undefined) labels.radius = text.haloWidth;
  if (rule.scaleDenominator) {
    const { min, max } = rule.scaleDenominator;
    if (max > 0) labels.minZoom = Math.log2(LABEL_SCALE_DENOMINATOR / max);
    if (min > 0) labels.maxZoom = Math.log2(LABEL_SCALE_DENOMINATOR / min);
    const preset = scales.find(
      (scale) =>
        Math.abs(scale.minZoom - labels.minZoom) < 0.000001 &&
        Math.abs(scale.maxZoom - labels.maxZoom) < 0.000001
    );
    if (preset) labels.scale = preset.value;
  }
  return labels;
};
