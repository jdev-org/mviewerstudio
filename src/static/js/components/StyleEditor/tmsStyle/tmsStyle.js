import { TMS_STYLE_IDS } from "./constants.js";

/**
 * Champs de configuration du style d'une couche TMS.
 * @returns {void}
 */
const TmsStyle = function () {
  this.element = document.createElement("div");
  this.element.className = "tms-style";
  this.element.innerHTML = `
    <div class="mt-4 layerOption-tms d-none" id="${TMS_STYLE_IDS.container}">
      <h6>Style de la donnée</h6>
      <div class="form-group">
        <label for="${TMS_STYLE_IDS.url}" i18n="modal.layer.new.param.tms.styleurl">Lien vers le fichier de style (JSON)</label>
        <input type="text" class="form-control checkedurl" id="${TMS_STYLE_IDS.url}" placeholder="Url vers le fichier de style">
      </div>
      <div class="form-group">
        <label for="${TMS_STYLE_IDS.name}"><span i18n="modal.layer.new.param.tms.style">Nom du style</span><span class="tooltip-info" data-bs-toggle="tooltip" data-bs-placement="right" data-bs-title="tooltip.style"><i class="ri-information-line"></i></span></label>
        <input type="text" class="form-control" id="${TMS_STYLE_IDS.name}" placeholder="BD Topo">
      </div>
      <div class="form-group">
        <label for="${TMS_STYLE_IDS.filter}"><span i18n="modal.layertms.filterstyle">Indiquer le nom des couches à masquer dans le style</span><span class="tooltip-info" data-bs-toggle="tooltip" data-bs-placement="right" data-bs-title="tooltip.separator"><i class="ri-information-line"></i></span></label>
        <input type="text" class="form-control" id="${TMS_STYLE_IDS.filter}" placeholder="BD Topo">
      </div>
    </div>
  `;
};

/**
 * Retourne le formulaire en conservant les valeurs saisies.
 * @returns {HTMLElement} Élément du composant.
 */
TmsStyle.prototype.render = function () {
  return this.element;
};

export default TmsStyle;
