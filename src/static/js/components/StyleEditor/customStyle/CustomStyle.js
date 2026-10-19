import ListStyleTypeSelector from "./listStyleTypeSelector.js";
import ListCard from "../../listCard/listCard.js";
import ClassificationPanel from "./ClassificationPanel.js";
import AccordionClassificationPanel from "./accordionClassificationPanel.js";
import { STYLE_TYPES } from "../constants.js";

let customStyleId = 0;

/**
 * Conteneur de l'éditeur de style personnalisé.
 * @returns {void}
 */
const CustomStyle = function ({ geometry = "Point", fields = [] } = {}) {
  this.geometry = geometry;
  this.fields = fields;
  this.panels = {};
  this.card = new ListCard({
    title: mviewer.tr("style_editor.title"),
    classes: "custom-style",
  });
  this.element = this.card.element;
  this.styleTypeSelector = new ListStyleTypeSelector(geometry);
  this.content = document.createElement("div");
  customStyleId += 1;
  this.content.id = `style-classifications-${customStyleId}`;
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
    const options = { type, fields: this.fields, geometry: this.geometry };
    if (type === "proportionalColoredCircles") {
      const definition = STYLE_TYPES.find((item) => item.value === "proportionalCircles");
      this.panels[type] = new AccordionClassificationPanel({
        ...options,
        parentId: this.content.id,
        expanded: true,
        type: "proportionalCircles",
        styleProp: definition.styleProp.filter(
          (property) => property !== "color" && property !== "ramps"
        ),
        ruleMode: "size",
        title: "style_editor.classification.circle_sizes",
      });
      this.panels[type].colorClassification = new AccordionClassificationPanel({
        ...options,
        parentId: this.content.id,
        type: "analyse",
        ruleMode: "color",
        title: "style_editor.classification.circle_colors",
      });
    } else {
      this.panels[type] = new ClassificationPanel(options);
    }
  }
  const panels = this.panels[type];
  this.content.classList.toggle("accordion", panels.colorClassification !== undefined);
  this.content.replaceChildren(panels.render());
  if (panels.colorClassification) {
    this.content.appendChild(panels.colorClassification.render());
  }
};

/** Retourne la configuration saisie, sans transformation SLD.
 * @returns {Object} Mode, géométrie, paramètres et règles.
 */
CustomStyle.prototype.getValue = function () {
  const type = this.styleTypeSelector.value;
  const panels = this.panels[type];
  const value = {
    type,
    geometry: this.geometry,
    ...panels.getValue(),
  };
  if (panels.colorClassification) {
    value.colorClassification = panels.colorClassification.getValue();
  }
  return value;
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

/**
 * Conserve les champs pour les futurs panneaux et actualise les panneaux existants.
 * @param {string[]} fields Champs disponibles.
 * @returns {void}
 */
CustomStyle.prototype.setFields = function (fields) {
  this.fields = fields;
  Object.values(this.panels).forEach((panel) => {
    panel.methods.setFields(fields);
    if (panel.colorClassification) {
      panel.colorClassification.methods.setFields(fields);
    }
  });
};

export default CustomStyle;
