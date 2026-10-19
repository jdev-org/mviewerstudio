import MethodsPanel from "./rules/methodsPanel.js";
import RulesPanel from "./rules/rulesPanel.js";
import { STYLE_TYPES, CLASSIFICATION_METHODS } from "../constants.js";

let classificationPanelId = 0;

/** Classification indépendante : paramètres, calcul et tableau de règles. */
export default class ClassificationPanel {
  /** @param {Object} options Type, géométrie, champs, propriétés et rôle des règles. */
  constructor({ type, geometry, fields, styleProp, ruleMode = "all", title }) {
    const definition = STYLE_TYPES.find((item) => item.value === type);
    let methods = CLASSIFICATION_METHODS;
    if (definition.methods) {
      methods = methods.filter((method) => definition.methods.includes(method.value));
    }
    this.methods = new MethodsPanel({ fields, type, methods, styleProp });
    this.rules = new RulesPanel({ geometry, type, ruleMode });
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
            type,
            geometry,
            ruleMode,
            setRules: (rules) => this.rules.setRules(rules),
          },
        })
      );
    });
  }

  /** @returns {HTMLElement} Section contenant uniquement cette classification. */
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

  /** @returns {Object} Copie des paramètres et règles de cette classification. */
  getValue() {
    return { ...this.methods.state, rules: structuredClone(this.rules.rules) };
  }
}
