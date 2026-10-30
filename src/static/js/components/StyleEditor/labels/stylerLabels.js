import { DEFAULT_LABELS, LABEL_FIELDS, LABEL_SCALES } from "./constants.js";
import { createField } from "../customStyle/rules/fields.js";
import Select from "../../select/select.js";
import Switch from "../../switch/switch.js";
import Tooltip from "../../tooltip/tooltip.js";
import LabelPreview from "./preview.js";

let labelsId = 0;

/**
 * Reusable label settings form for a custom style.
 * @param {Object} [options={}] Available fields, saved state and configurable scale presets.
 * @returns {void}
 */
const StylerLabels = function ({
  fields = [],
  state = {},
  scales = LABEL_SCALES,
  feature = null,
} = {}) {
  this.state = { ...DEFAULT_LABELS, ...state };
  this.feature = feature;
  if (state.radius === undefined && state.strokeWidth !== undefined) {
    this.state.radius = state.strokeWidth;
  }
  delete this.state.strokeWidth;
  if (!scales.some((scale) => scale.value === this.state.scale) && scales.length) {
    this.state.scale = scales[0].value;
  }
  this.scales = scales;
  labelsId += 1;
  this.id = `styler-labels-${labelsId}`;
  this.createContent();
  this.createSwitch();
  this.setFields(fields);
  this.updateEnabled();
  this.element.addEventListener("input", (event) => this.updateState(event));
  this.element.addEventListener("change", (event) => this.updateState(event));
};

/** Build the form containing appearance settings and selectors.
 * @returns {void}
 */
StylerLabels.prototype.createContent = function () {
  this.content = document.createElement("fieldset");
  this.content.className = "style-fields mt-3";
  this.content.innerHTML = `
    <legend class="visually-hidden">${mviewer.tr("style_editor.labels.settings")}</legend>
  `;
  this.content.appendChild(this.createFieldSelect());
  LABEL_FIELDS.forEach((definition) => {
    const field = createField(definition, this.state[definition.name]);
    const input = field.querySelector("input");
    input.dataset.label = definition.name;
    input.required = true;
    this.content.appendChild(field);
  });
  this.content.appendChild(this.createScaleSelect());
  this.preview = new LabelPreview({ style: this.state, feature: this.feature });
  this.content.appendChild(this.preview.render());
};

/** Build the selector for the field used as label text.
 * @returns {HTMLElement} Selector container and its label.
 */
StylerLabels.prototype.createFieldSelect = function () {
  this.fieldSelect = new Select({
    id: `${this.id}-field`,
    label: mviewer.tr("style_editor.labels.field"),
    placeholder: mviewer.tr("style_editor.classification.placeholder"),
    value: this.state.field,
  });
  const element = this.fieldSelect.render();
  const select = this.fieldSelect.getSelect();
  select.dataset.label = "field";
  select.required = true;
  return element;
};

/** Build the scale selector and its help tooltip.
 * @returns {HTMLElement} Selector container and its label.
 */
StylerLabels.prototype.createScaleSelect = function () {
  this.scaleSelect = new Select({
    id: `${this.id}-scale`,
    label: mviewer.tr("style_editor.labels.scale"),
    value: this.state.scale,
    options: this.scales.map((scale) => ({
      ...scale,
      label: mviewer.tr(scale.label),
    })),
  });
  const element = this.scaleSelect.render();
  const select = this.scaleSelect.getSelect();
  select.dataset.label = "scale";
  select.required = true;
  const tooltip = new Tooltip({
    message: mviewer.tr("style_editor.labels.scaleHelp"),
  });
  tooltip.appendTo(element.querySelector("label"));
  return element;
};

/** Build the switch card containing the label settings.
 * @returns {void}
 */
StylerLabels.prototype.createSwitch = function () {
  this.switch = new Switch({
    id: `${this.id}-enabled`,
    label: mviewer.tr("style_editor.labels.enabled"),
    checked: this.state.enabled,
    classes: "styler-labels mt-3",
    content: this.content,
    onChange: (checked) => {
      this.state.enabled = checked;
      this.updateEnabled();
    },
  });
  this.element = this.switch.render();
};

/** Store the value entered in a form field.
 * @param {Event} event Input or change event emitted by a field.
 * @returns {void}
 */
StylerLabels.prototype.updateState = function (event) {
  const input = event.target;
  if (!input.dataset.label) return;
  let value = input.value;
  if (input.type === "number") value = input.valueAsNumber;
  if (input.type === "checkbox") value = input.checked;
  this.state[input.dataset.label] = value;
  this.preview.update(this.state);
  this.updateEnabled();
};

/** Show and enable settings only while labels are enabled.
 * @returns {void}
 */
StylerLabels.prototype.updateEnabled = function () {
  this.content.disabled = !this.state.enabled;
  this.content.classList.toggle("d-none", !this.state.enabled);
  this.element
    .querySelector("[data-switch-card-content]")
    .classList.toggle("d-none", !this.state.enabled);
};

/**
 * Update available fields, preserving the saved field while WFS metadata loads.
 * @param {string[]} fields Available field names.
 * @returns {void}
 */
StylerLabels.prototype.setFields = function (fields) {
  const names = [...fields];
  if (this.state.field && !names.includes(this.state.field)) names.push(this.state.field);
  this.fieldSelect.setOptions(names.map((name) => ({ label: name, value: name })));
  this.fieldSelect.setValue(this.state.field);
};

/** Return a copy of the settings and selected zoom limits.
 * @returns {Object} Label configuration.
 */
StylerLabels.prototype.getValue = function () {
  const scale = this.scales.find((item) => item.value === this.state.scale);
  const value = { ...this.state };
  if (scale) {
    value.minZoom = scale.minZoom;
    value.maxZoom = scale.maxZoom;
  }
  return value;
};

/** Return the form while preserving entered values.
 * @returns {HTMLElement} Component element.
 */
StylerLabels.prototype.render = function () {
  return this.element;
};

export default StylerLabels;
