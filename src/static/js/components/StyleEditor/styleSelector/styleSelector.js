import { STYLE_SELECTOR_IDS } from "../constants.js";

/**
 * Conteneur des styles WMS existants, alimenté par mv.showStyles().
 * @returns {void}
 */
const StyleSelector = function () {
  this.element = document.createElement("div");
  this.element.className = "style-selector";
  this.element.innerHTML = `
    <div class="mt-4 layerOption-wms d-none" id="${STYLE_SELECTOR_IDS.container}">
      <h6 i18n="modal.layer.styles">Style(s) de la donnée disponible(s)</h6>
      <p><small><span i18n="modal.layer.styles.note">Si plusieurs styles sont sélectionnés, indiquer les libéllés des styles qui apparaîtront dans la liste déroulante.</span></small></p>
      <div class="row mt-3" id="${STYLE_SELECTOR_IDS.list}"></div>
    </div>
    <div class="form-group layerOption-wms d-none" id="${STYLE_SELECTOR_IDS.titleContainer}">
      <label for="${STYLE_SELECTOR_IDS.titleInput}"><span i18n="modal.layer.style.title">Libellé de la liste déroulante des styles</span><span class="tooltip-info" data-bs-toggle="tooltip" data-bs-placement="right" data-bs-title="tooltip.analyse"><i class="ri-information-line"></i></span></label>
      <input type="text" class="form-control" id="${STYLE_SELECTOR_IDS.titleInput}" placeholder="Libellé de la liste des styles" i18n="modal.layer.style.placeholder">
    </div>
  `;
};

/**
 * Retourne le conteneur en conservant les styles et les sélections déjà chargés.
 * @returns {HTMLElement} Élément du composant.
 */
StyleSelector.prototype.render = function () {
  return this.element;
};

export default StyleSelector;
