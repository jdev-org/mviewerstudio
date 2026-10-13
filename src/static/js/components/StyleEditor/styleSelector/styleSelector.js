import { STYLE_SELECTOR_IDS } from "../constants.js";
import escapeHtml from "../../../utils/escapeHtml.js";
import Tooltip from "../../tooltip/tooltip.js";

/**
 * Sélecteur des styles WMS existants de la couche.
 * @param {Object} [options={}] Options du sélecteur.
 * @param {Object[]} [options.styles=[]] Styles disponibles : name et src.
 * @param {string} [options.layerId] Identifiant de la couche configurée.
 * @returns {void}
 */
const StyleSelector = function (options = {}) {
  this.options = { ...options };
  this.element = document.createElement("div");
  this.element.className = "style-selector";
  this.element.innerHTML = `
    <div class="mt-4 layerOption-wms d-none" id="${STYLE_SELECTOR_IDS.container}">
      <h6 i18n="modal.layer.styles">Style(s) de la donnée disponible(s)</h6>
      <p><small><span i18n="modal.layer.styles.note">Si plusieurs styles sont sélectionnés, indiquer les libéllés des styles qui apparaîtront dans la liste déroulante.</span></small></p>
      <div class="row mt-3" id="${STYLE_SELECTOR_IDS.list}"></div>
    </div>
    <div class="form-group layerOption-wms d-none" id="${STYLE_SELECTOR_IDS.titleContainer}">
      <label for="${STYLE_SELECTOR_IDS.titleInput}"><span i18n="modal.layer.style.title">Libellé de la liste déroulante des styles</span> <span data-style-title-tooltip></span></label>
      <input type="text" class="form-control" id="${STYLE_SELECTOR_IDS.titleInput}" placeholder="Libellé de la liste des styles" i18n="modal.layer.style.placeholder">
    </div>
  `;
  new Tooltip({
    message: mviewer.tr("tooltip.analyse"),
    icon: "ri-information-line",
    color: "info",
  }).appendTo(this.element.querySelector("[data-style-title-tooltip]"));
  this.loadStyles();
};

/**
 * Initialise les styles, leurs sélections et leurs libellés depuis les options.
 * @returns {void} Remplit les champs du composant sans dépendre de son montage.
 */
StyleSelector.prototype.loadStyles = function () {
  const styles = this.options.styles || [];
  let layer = {};
  if (this.options.layerId) {
    layer = mv.getLayerById(this.options.layerId);
  }
  const selectedStyles = (layer.style || "").split(",");
  const aliases = (layer.stylesalias || "").split(",");
  const list = this.element.querySelector(`#${STYLE_SELECTOR_IDS.list}`);

  list.innerHTML = styles
    .map((style) => {
      const name = escapeHtml(style.name);
      const src = escapeHtml(style.src || "");
      const layerId = escapeHtml(this.options.layerId || "");
      const selectedIndex = selectedStyles.indexOf(style.name);
      let alias = style.name;
      if (selectedStyles.length > 1 && selectedIndex >= 0) {
        alias = aliases[selectedIndex] || style.name;
      }

      return `
    <div class="layer-style col-sm-6 col-md-4" name="${name}" data-legendurl="${src}" data-stylename="${name}" data-layerid="${layerId}">
      <div class="layer-style-block">
        <div class="custom-control custom-checkbox">
          <input type="checkbox" class="custom-control-input" id="${name}-style-selection" ${selectedIndex >= 0 ? "checked" : ""}>
          <label class="custom-control-label" for="${name}-style-selection">${name}</label>
        </div>
        <img class="my-3" src="${src}">
        <div class="input-group input-group-sm">
          <div class="input-group-prepend">
            <span class="input-group-text"><i class="bi bi-pencil"></i></span>
          </div>
          <input class="form-control" type="text" id="${name}-style-alias" value="${escapeHtml(alias)}">
        </div>
      </div>
    </div>
    `;
    })
    .join("");

  list.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
    checkbox.addEventListener("change", () => mv.changeLayerLegendInput());
  });

  this.element.querySelector(`#${STYLE_SELECTOR_IDS.titleInput}`).value =
    layer.styletitle || "";
  this.element
    .querySelector(`#${STYLE_SELECTOR_IDS.container}`)
    .classList.toggle("d-none", !this.options.styles);
  this.element
    .querySelector(`#${STYLE_SELECTOR_IDS.titleContainer}`)
    .classList.toggle("d-none", selectedStyles.filter((style) => style).length <= 1);
};

/**
 * Retourne le conteneur en conservant les styles et les sélections déjà chargés.
 * @returns {HTMLElement} Élément du composant.
 */
StyleSelector.prototype.render = function () {
  return this.element;
};

export default StyleSelector;
