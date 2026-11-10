import {
  DEFAULT_LABELS,
  LABEL_FIELDS,
  LABEL_SCALES,
  CLUSTER_COUNT_OPTIONS,
} from "./constants.js";
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
  this.createSwitch();
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

/** Build the switch card containing the label settings.
 * @returns {void}
 */
stylerLabels.prototype.createSwitch = function () {
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
  this.createAccordion();
};

/** Rend le titre repliable sans lier l'ouverture du panneau à l'activation des étiquettes.
 * @returns {void} Conserve le switch et les champs déjà montés.
 */
stylerLabels.prototype.createAccordion = function () {
  const title = this.element.querySelector(".switch-card-title");
  const content = this.element.querySelector("[data-switch-card-content]");
  const collapseId = `${this.id}-collapse`;
  const button = document.createElement("button");
  button.type = "button";
  button.id = `${this.id}-heading`;
  button.className = "switch-card-title accordion-button p-0 shadow-none";
  button.textContent = mviewer.tr("style_editor.labels.settings");
  const icon = document.createElement("i");
  icon.className = "ri-arrow-down-s-line styler-labels-toggle-icon";
  icon.setAttribute("aria-hidden", "true");
  button.appendChild(icon);
  button.setAttribute("data-bs-toggle", "collapse");
  button.setAttribute("data-bs-target", `#${collapseId}`);
  button.setAttribute("aria-expanded", "true");
  button.setAttribute("aria-controls", collapseId);
  title.replaceWith(button);

  const collapse = document.createElement("div");
  collapse.id = collapseId;
  collapse.className = "collapse show";
  collapse.setAttribute("role", "region");
  collapse.setAttribute("aria-labelledby", button.id);
  content.replaceWith(collapse);
  collapse.appendChild(content);
  // Le libellé accessible du switch reste indépendant du bouton de dépliage.
  this.switch
    .getInput()
    .setAttribute("aria-label", mviewer.tr("style_editor.labels.enabled"));
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
  this.element
    .querySelector("[data-switch-card-content]")
    .classList.toggle("d-none", !this.state.enabled);
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
