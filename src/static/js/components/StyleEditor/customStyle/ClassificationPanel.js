import MethodsPanel from "./rules/methodsPanel.js";
import RulesPanel from "./rules/rulesPanel.js";
import ClusterRule from "./rules/clusterRule.js";
import { createField } from "./rules/fields.js";
import { STYLE_TYPES, CLASSIFICATION_METHODS } from "../formDefinitions.js";

let classificationPanelId = 0;

/** Independent classification with settings, calculation and a rule table. */
export default class ClassificationPanel {
  /**
   * @param {Object} options Type, geometry, fields, properties and rule mode.
   * @param {string[]} [options.classificationModes=[]] Allowed modes; multiple modes enable a selector.
   * @param {Function} [options.suggestMode] Suggests an allowed mode when the selected field changes.
   */
  constructor({
    type,
    geometry,
    fields,
    styleProp,
    ruleMode = "all",
    title,
    classificationModes = [],
    suggestMode,
  }) {
    const definition = STYLE_TYPES.find((item) => item.value === type);
    let methods = CLASSIFICATION_METHODS;
    if (definition.methods) {
      methods = methods.filter((method) => definition.methods.includes(method.value));
    }
    this.type = type;
    this.defaultType = type;
    this.classificationModes = [...classificationModes];
    this.methods = new MethodsPanel({ fields, type, methods, styleProp });
    let RulesComponent = RulesPanel;
    if (type === "cluster") RulesComponent = ClusterRule;
    this.rules = new RulesComponent({ geometry, type, ruleMode });
    this.title = title;
    this.element = document.createElement("section");
    classificationPanelId += 1;
    this.element.id = `style-classification-${classificationPanelId}`;
    this.element.className = "style-classification";
    if (suggestMode && this.classificationModes.length) {
      this.element.addEventListener("change", (event) => {
        if (event.target.name !== "field") return;
        this.setClassificationMode(suggestMode(event.target.value));
      });
    }
    this.methods.element.addEventListener("calculate", (event) => {
      event.stopPropagation();
      this.element.dispatchEvent(
        new CustomEvent("calculate", {
          bubbles: true,
          detail: {
            ...event.detail,
            type: this.type,
            geometry,
            ruleMode,
            setRules: (rules) => this.rules.setRules(rules),
          },
        })
      );
    });
  }

  /**
   * Changes classification settings and clears rules incompatible with the new mode.
   * Preserves compatible field, method and visual settings.
   * @param {string} type Numeric or categorical classification type.
   * @param {Object} [options={}] Whether to render and emit an update immediately.
   * @returns {void}
   */
  setClassificationMode(type, { render = true } = {}) {
    if (this.type === type) return;
    if (this.classificationModes.length && !this.classificationModes.includes(type))
      return;
    this.methods.readState();
    const definition = STYLE_TYPES.find((item) => item.value === type);
    const methods = CLASSIFICATION_METHODS.filter(
      (method) => !definition.methods || definition.methods.includes(method.value)
    );
    this.type = type;
    this.methods.type = type;
    this.methods.styleProp = definition.styleProp;
    this.methods.methods = methods;
    if (!methods.some((method) => method.value === this.methods.state.method)) {
      this.methods.state.method = methods[0].value;
    }
    this.rules.type = type;
    this.rules.rules = [];
    this.rules.selected.clear();
    if (render) {
      if (this.element.hasChildNodes()) this.render();
      this.element.dispatchEvent(new CustomEvent("update", { bubbles: true }));
    }
  }

  /**
   * Updates available fields while retaining a valid selection.
   * @param {string[]} fields Available field names.
   * @returns {void}
   */
  setFields(fields) {
    this.methods.setFields([...fields]);
  }

  /**
   * Restores saved settings and prepares independent editable rules.
   * Keeps a saved field available even if it is absent from the current schema.
   * @param {Object} value Saved classification settings and rules.
   * @returns {void}
   */
  restore(value) {
    if (this.classificationModes.length) {
      this.setClassificationMode(value.type || this.defaultType, { render: false });
    }
    const { rules, ...state } = structuredClone(value);
    delete state.type;
    delete state.geometry;
    delete state.colorClassification;
    delete state.referentialLayer;
    this.methods.state = { ...this.methods.state, ...state };
    const fields = [...this.methods.fields];
    if (value.field && !fields.includes(value.field)) fields.push(value.field);
    this.setFields(fields);
    this.rules.rules = rules.map((rule) => this.rules.prepareRule(rule));
    this.rules.selected.clear();
    if (this.element.hasChildNodes()) this.render();
  }

  /** @returns {HTMLElement} Section containing only this classification. */
  render() {
    this.element.replaceChildren();
    if (this.title) {
      const heading = document.createElement("h5");
      heading.id = `${this.element.id}-title`;
      heading.textContent = mviewer.tr(this.title);
      this.element.setAttribute("aria-labelledby", heading.id);
      this.element.appendChild(heading);
    }
    if (this.classificationModes.length > 1) {
      this.element.appendChild(this.renderModeSelector());
    }
    this.element.append(this.methods.render(), this.rules.render());
    return this.element;
  }

  /** @returns {HTMLElement} Selector containing the configured classification modes. */
  renderModeSelector() {
    const field = createField(
      {
        name: "classificationType",
        label: "style_editor.classification.method",
        options: STYLE_TYPES.filter((type) =>
          this.classificationModes.includes(type.value)
        ),
      },
      this.type
    );
    field.querySelector("select").addEventListener("change", (event) => {
      this.setClassificationMode(event.target.value);
    });
    return field;
  }

  /** @returns {Object} Copy of the settings and rules for this classification. */
  getValue() {
    const value = { ...this.methods.state, rules: structuredClone(this.rules.rules) };
    if (this.classificationModes.length) value.type = this.type;
    return value;
  }
}
