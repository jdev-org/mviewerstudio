import MethodsPanel from "./rules/methodsPanel.js";
import RulesPanel from "./rules/rulesPanel.js";
import ClusterRule from "./rules/clusterRule.js";
import { STYLE_TYPES, CLASSIFICATION_METHODS } from "../constants.js";

let classificationPanelId = 0;

/** Independent classification with settings, calculation and a rule table. */
export default class ClassificationPanel {
  /** @param {Object} options Type, geometry, fields, properties and rule mode. */
  constructor({ type, geometry, fields, styleProp, ruleMode = "all", title }) {
    const definition = STYLE_TYPES.find((item) => item.value === type);
    let methods = CLASSIFICATION_METHODS;
    if (definition.methods) {
      methods = methods.filter((method) => definition.methods.includes(method.value));
    }
    this.methods = new MethodsPanel({ fields, type, methods, styleProp });
    let RulesComponent = RulesPanel;
    if (type === "cluster") RulesComponent = ClusterRule;
    this.rules = new RulesComponent({ geometry, type, ruleMode });
    this.title = title;
    this.element = document.createElement("section");
    classificationPanelId += 1;
    this.element.id = `style-classification-${classificationPanelId}`;
    this.element.className = "style-classification";
    this.methods.element.addEventListener("calculate", (event) => {
      event.stopPropagation();
      this.element.dispatchEvent(
        new CustomEvent("calculate", {
          bubbles: true,
          detail: {
            ...event.detail,
            type: this.methods.type,
            geometry,
            ruleMode,
            setRules: (rules) => this.rules.setRules(rules),
          },
        })
      );
    });
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
    this.element.append(this.methods.render(), this.rules.render());
    return this.element;
  }

  /** @returns {Object} Copy of the settings and rules for this classification. */
  getValue() {
    return { ...this.methods.state, rules: structuredClone(this.rules.rules) };
  }
}
