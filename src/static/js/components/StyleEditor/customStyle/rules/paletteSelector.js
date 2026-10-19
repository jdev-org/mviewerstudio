import { getColorRampScales, createColorRampScales } from "../../../../utils/styler/rampColor.js";

let paletteSelectorId = 0;

/** Liste de palettes avec aperçu des couleurs et navigation Bootstrap au clavier. */
export default class PaletteSelector {
  /**
   * @param {Object} options Palette sélectionnée et nombre de classes à prévisualiser.
   */
  constructor({ value, classes, reverseColors = false }) {
    this.value = value;
    this.classes = classes;
    this.reverseColors = reverseColors;
    this.options = getColorRampScales();
    this.element = document.createElement("div");
    this.element.className = "style-palette dropdown";
    paletteSelectorId += 1;
    this.id = `style-palette-${paletteSelectorId}`;
  }

  /** @returns {HTMLElement} Liste et champ transmettant la palette sélectionnée. */
  render() {
    this.element.innerHTML = `
      <label for="${this.id}">${mviewer.tr("style_editor.classification.colors")}</label>
      <input type="hidden" name="color">
      <button id="${this.id}" type="button" class="form-control dropdown-toggle style-palette__toggle"
        data-bs-toggle="dropdown" aria-expanded="false" aria-haspopup="menu"></button>
      <ul class="dropdown-menu style-palette__menu" role="menu" aria-labelledby="${this.id}"></ul>
    `;
    this.input = this.element.querySelector("input");
    this.input.value = this.value;
    this.toggle = this.element.querySelector("button");
    const menu = this.element.querySelector("ul");
    this.options.forEach((option) => {
      const item = document.createElement("li");
      item.setAttribute("role", "none");
      const button = document.createElement("button");
      button.type = "button";
      button.className = "dropdown-item style-palette__option";
      button.setAttribute("role", "menuitemradio");
      button.dataset.palette = option.value;
      button.addEventListener("click", () => {
        this.value = option.value;
        this.input.value = this.value;
        this.updatePreviews(this.classes);
        this.input.dispatchEvent(new Event("change", { bubbles: true }));
        this.toggle.focus();
      });
      item.appendChild(button);
      menu.appendChild(item);
    });
    this.updatePreviews(this.classes);
    return this.element;
  }

  /**
   * Actualise les aperçus et la sélection sans reconstruire la liste.
   * @param {number} classes Nombre de couleurs à afficher.
   * @param {boolean} [reverseColors] Inverse l'ordre des couleurs.
   * @returns {void}
   */
  updatePreviews(classes, reverseColors = this.reverseColors) {
    if (!Number.isInteger(classes) || classes < 1) return;
    this.classes = classes;
    this.reverseColors = reverseColors;
    this.element.querySelectorAll("[data-palette]").forEach((button) => {
      const name = button.dataset.palette;
      const colors = createColorRampScales(name, classes, reverseColors);
      button.innerHTML = `
        <span class="style-palette__name">${name}</span>
        <span class="style-palette__preview" aria-hidden="true">
          ${colors.map(color => `<span style="background-color: ${color}"></span>`).join("")}
        </span>
      `;
      const selected = name === this.value;
      button.classList.toggle("active", selected);
      button.setAttribute("aria-checked", selected);
      if (selected) this.toggle.innerHTML = button.innerHTML;
    });
  }
}
