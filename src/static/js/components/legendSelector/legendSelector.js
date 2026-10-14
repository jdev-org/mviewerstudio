import { LEGEND_SELECTOR_IDS, LEGEND_TYPES } from "./constants.js";

/**
 * Options de légende d'une couche WMS, compatibles avec le formulaire de couche.
 * @returns {void}
 */
const LegendSelector = function () {
  this.element = document.createElement("div");
  this.element.id = LEGEND_SELECTOR_IDS.container;
  this.element.className = "accordion mt-4 layerOption-wms d-none";
  this.element.innerHTML = `
    <div class="accordion-item">
      <h2 class="accordion-header" id="${LEGEND_SELECTOR_IDS.heading}">
        <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#${LEGEND_SELECTOR_IDS.collapse}" aria-expanded="false" aria-controls="${LEGEND_SELECTOR_IDS.collapse}">
          <span class="title-accordion" i18n="modal.layer.title">Gestion de la légende</span>
        </button>
      </h2>
      <div id="${LEGEND_SELECTOR_IDS.collapse}" class="accordion-collapse collapse" aria-labelledby="${LEGEND_SELECTOR_IDS.heading}">
        <div class="accordion-body">
          <div class="form-group">
            <label class="control-label" for="${LEGEND_SELECTOR_IDS.type}" i18n="modal.layer.legend">Type de la légende</label>
            <select id="${LEGEND_SELECTOR_IDS.type}" name="type-legend" class="form-control">
              <option value="${LEGEND_TYPES.DEFAULT}" i18n="modal.layer.legend.default" selected>Par défaut</option>
              <option value="${LEGEND_TYPES.CUSTOM}" i18n="modal.layer.legend.custom">Personnalisée</option>
            </select>
          </div>
          <div class="form-group" id="${LEGEND_SELECTOR_IDS.defaultGroup}">
            <div class="custom-control custom-switch">
              <input type="checkbox" class="custom-control-input" id="${LEGEND_SELECTOR_IDS.dynamic}">
              <label class="custom-control-label" for="${LEGEND_SELECTOR_IDS.dynamic}" i18n="modal.layer.legend.dynamic">Adapter la légende selon les données visibles dans l'emprise de la carte</label>
            </div>
          </div>
          <div class="form-group mt-2 d-none" id="${LEGEND_SELECTOR_IDS.customGroup}">
            <label for="${LEGEND_SELECTOR_IDS.url}" i18n="modal.layer.legendurl.text">Lien vers une légende personnalisée (image)</label>
            <input type="text" class="form-control checkedurl" id="${LEGEND_SELECTOR_IDS.url}" placeholder="URL vers Image légende" i18n="modal.layer.legendurl.placeholder">
          </div>
        </div>
      </div>
    </div>
  `;
  this.element
    .querySelector(`#${LEGEND_SELECTOR_IDS.type}`)
    .addEventListener("change", (event) => mv.changeLayerLegend(event.target.value));
};

/**
 * Retourne le formulaire en conservant les valeurs saisies et ses événements.
 * @returns {HTMLElement} Élément du composant.
 */
LegendSelector.prototype.render = function () {
  return this.element;
};

export default LegendSelector;
