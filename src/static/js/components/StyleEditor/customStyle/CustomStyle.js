import ListStyleTypeSelector from "./listStyleTypeSelector.js";
import ListCard from "../../listCard/listCard.js";
import MethodsPanel from "./rules/methodsPanel.js";
import RulesPanel from "./rules/rulesPanel.js";
import { STYLE_TYPES, CLASSIFICATION_METHODS } from "../constants.js";

/**
 * Conteneur de l'éditeur de style personnalisé.
 * @returns {void}
 */
const CustomStyle = function ({ geometry = "Point", fields = [] } = {}) {
  this.geometry = geometry;
  this.fields = fields;
  this.panels = {};
  this.card = new ListCard({ title: "Éditeur de style", classes: "custom-style" });
  this.element = this.card.element;
  this.styleTypeSelector = new ListStyleTypeSelector(geometry);
  this.content = document.createElement("div");
  this.styleTypeSelector.element.addEventListener("style-type-change", (event) =>
    this.showType(event.detail)
  );
};

/** Affiche les panneaux du mode sélectionné en conservant leurs saisies.
 * @param {string} type Mode de représentation.
 * @returns {void}
 */
CustomStyle.prototype.showType = function (type) {
  if (!this.panels[type]) {
    const definition = STYLE_TYPES.find((item) => item.value === type);
    let methods = CLASSIFICATION_METHODS;
    if (definition.methods)
      methods = methods.filter((method) => definition.methods.includes(method.value));
    this.panels[type] = {
      methods: new MethodsPanel({ fields: this.fields, type, methods }),
      rules: new RulesPanel({ geometry: this.geometry, type }),
    };
    const panels = this.panels[type];
    panels.methods.element.addEventListener("calculate", (event) => {
      event.stopPropagation();
      this.element.dispatchEvent(
        new CustomEvent("calculate", {
          bubbles: true,
          detail: {
            ...event.detail,
            type,
            geometry: this.geometry,
            setRules: (rules) => panels.rules.setRules(rules),
          },
        })
      );
    });
  }
  const panels = this.panels[type];
  this.content.replaceChildren(panels.methods.render(), panels.rules.render());
};

/** Retourne la configuration saisie, sans transformation SLD.
 * @returns {Object} Mode, géométrie, paramètres et règles.
 */
CustomStyle.prototype.getValue = function () {
  const type = this.styleTypeSelector.value;
  const panels = this.panels[type];
  return {
    type,
    geometry: this.geometry,
    ...panels.methods.state,
    rules: structuredClone(panels.rules.rules),
  };
};

/**
 * Affiche le titre de l'éditeur et la liste des modes de représentation.
 * @returns {HTMLElement} Élément du composant.
 */
CustomStyle.prototype.render = function () {
  this.card.setItems([this.styleTypeSelector.render(), this.content]);
  this.showType(this.styleTypeSelector.value);
  return this.element;
};

export default CustomStyle;
