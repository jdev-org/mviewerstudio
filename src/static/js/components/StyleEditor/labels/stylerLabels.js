import {
  DEFAULT_LABELS,
  LABEL_FIELDS,
  LABEL_SCALES,
  CLUSTER_COUNT_OPTIONS,
} from "./constants.js";
import { createField } from "../customStyle/rules/fields.js";
import Select from "../../select/select.js";
import Accordion from "../../accordion/accordion.js";
import Switch from "../../switch/switch.js";
import Tooltip from "../../tooltip/tooltip.js";
import LabelPreview from "./preview.js";

let labelsId = 0;

/**
 * Reusable label settings form for a custom style.
 * @param {Object} [options={}] Available fields, saved state and configurable scale presets.
 * @returns {void}
 */
const stylerLabels = function ({
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
  this.createAccordion();
  this.setFields(fields, { preserveSelection: fields.length === 0 });
  this.updateEnabled();
  this.element.addEventListener("input", (event) => this.updateState(event));
  this.element.addEventListener("change", (event) => this.updateState(event));
};

/** Build the form containing appearance settings and selectors.
 * @returns {void}
 */
stylerLabels.prototype.createContent = function () {
  this.content = document.createElement("fieldset");
  this.content.className = "style-fields mt-3";
  this.content.innerHTML = `
    <legend class="visually-hidden">${mviewer.tr("style_editor.labels.settings")}</legend>
  `;
  this.content.appendChild(this.createFieldSelect());
  this.clusterCountSelect = new Select({
    id: `${this.id}-show-cluster-count`,
    label: mviewer.tr("style_editor.labels.show_cluster_count"),
    value: this.state.showClusterCount ? "true" : "false",
    options: CLUSTER_COUNT_OPTIONS.map((option) => ({
      value: option.value,
      label: mviewer.tr(option.label),
    })),
    visible: false,
  });
  this.clusterCountOption = this.clusterCountSelect.render();
  new Tooltip({
    message: mviewer.tr("style_editor.labels.show_cluster_count_help"),
    classes: "ms-1",
  }).appendTo(this.clusterCountOption.querySelector("label"));
  this.clusterCountSelect.getSelect().dataset.label = "showClusterCount";
  this.content.appendChild(this.clusterCountOption);
  this.onlyCountSelect = new Select({
    id: `${this.id}-only-cluster-count`,
    label: mviewer.tr("style_editor.labels.only_cluster_count"),
    value: this.state.onlyClusterCount ? "true" : "false",
    options: CLUSTER_COUNT_OPTIONS.map((option) => ({
      value: option.value,
      label: mviewer.tr(option.label),
    })),
    visible: false,
  });
  this.onlyCountOption = this.onlyCountSelect.render();
  new Tooltip({
    message: mviewer.tr("style_editor.labels.only_cluster_count_help"),
    classes: "ms-1",
  }).appendTo(this.onlyCountOption.querySelector("label"));
  this.onlyCountSelect.getSelect().dataset.label = "onlyClusterCount";
  this.content.insertBefore(this.onlyCountOption, this.fieldSelect.element);
  LABEL_FIELDS.forEach((definition) => {
    let fieldDefinition = definition;
    if (
      definition.name === "font" &&
      !definition.options.some((font) => font.value === this.state.font)
    ) {
      // Keep an imported SLD font selectable without changing the shared font list.
      fieldDefinition = {
        ...definition,
        options: [
          ...definition.options,
          { label: this.state.font, value: this.state.font },
        ],
      };
    }
    const field = createField(fieldDefinition, this.state[definition.name]);
    const input = field.querySelector("input, select");
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
stylerLabels.prototype.createFieldSelect = function () {
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
stylerLabels.prototype.createScaleSelect = function () {
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

/** Build a Bootstrap accordion with the shared label activation switch.
 * @returns {void}
 */
stylerLabels.prototype.createAccordion = function () {
  this.panel = new Accordion({
    title: mviewer.tr("style_editor.labels.settings"),
    expanded: true,
    classes: "styler-labels mt-3",
  });
  this.element = this.panel.element;
  this.enabledSwitch = new Switch({
    id: `${this.id}-enabled`,
    label: mviewer.tr("style_editor.labels.enabled"),
    checked: this.state.enabled,
    classes: "mb-3",
  });
  const toggle = this.enabledSwitch.render();
  this.enabledSwitch.getInput().dataset.label = "enabled";
  this.panel.content.append(toggle, this.content);
};

/** Store the value entered in a form field.
 * @param {Event} event Input or change event emitted by a field.
 * @returns {void}
 */
stylerLabels.prototype.updateState = function (event) {
  const input = event.target;
  if (!input.dataset.label) return;
  let value = input.value;
  if (input.type === "number") value = input.valueAsNumber;
  if (input.type === "checkbox") value = input.checked;
  if (["showClusterCount", "onlyClusterCount"].includes(input.dataset.label)) {
    value = input.value === "true";
  }
  this.state[input.dataset.label] = value;
  if (input.dataset.label === "scale") {
    // A newly selected preset replaces zoom bounds restored from the previous SLD.
    delete this.state.minZoom;
    delete this.state.maxZoom;
  }
  this.preview.update(this.state);
  this.updateEnabled();
};

/** Show and enable settings only while labels are enabled.
 * @returns {void}
 */
stylerLabels.prototype.updateEnabled = function () {
  this.updateClusterOptions();
  this.content.disabled = !this.state.enabled;
  this.content.classList.toggle("d-none", !this.state.enabled);
};

/**
 * Refresh fields and discard a selection that no longer exists in loaded data.
 * @param {string[]} fields Current available field names.
 * @param {Object} [options={}] Whether to retain a saved field during initial metadata loading.
 * @returns {void}
 */
stylerLabels.prototype.setFields = function (fields, { preserveSelection = false } = {}) {
  const names = [...fields];
  if (this.state.field && !names.includes(this.state.field)) {
    if (preserveSelection) names.push(this.state.field);
    else this.state.field = "";
  }
  this.fieldSelect.setOptions(names.map((name) => ({ label: name, value: name })));
  this.fieldSelect.setValue(this.state.field);
  this.preview.update(this.state);
};

/** Show the count option only for the cluster representation.
 * @param {boolean} enabled Whether the current representation uses clusters.
 * @returns {void}
 */
stylerLabels.prototype.setClusterMode = function (enabled) {
  this.clusterMode = enabled;
  this.updateClusterOptions();
};

/** Synchronize controls when only group counts are requested.
 * @returns {void}
 */
stylerLabels.prototype.updateClusterOptions = function () {
  const onlyCount = this.clusterMode && this.state.onlyClusterCount;
  this.onlyCountOption.classList.toggle("d-none", !this.clusterMode);
  this.clusterCountOption.classList.toggle("d-none", !this.clusterMode || onlyCount);
  this.fieldSelect.setVisible(!onlyCount);
  this.fieldSelect.getSelect().disabled = onlyCount;
  this.fieldSelect.getSelect().required = !onlyCount;
  this.scaleSelect.setVisible(!onlyCount);
  this.scaleSelect.getSelect().disabled = onlyCount;
};

/** Return a copy of the settings and selected zoom limits.
 * @returns {Object} Label configuration.
 */
stylerLabels.prototype.getValue = function () {
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
stylerLabels.prototype.render = function () {
  return this.element;
};

export default stylerLabels;
