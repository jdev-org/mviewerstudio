import ClassificationPanel from "./ClassificationPanel.js";

/** Classification repliable, partageant les calculs et les règles du panneau standard. */
export default class AccordionClassificationPanel extends ClassificationPanel {
  /** @param {Object} options Configuration de classification, parentId et état expanded. */
  constructor({ parentId, expanded = false, ...options }) {
    super(options);
    this.parentId = parentId;
    this.expanded = expanded;
    this.element.className =
      "style-classification accordion-classification-panel accordion-item";
  }

  /** @returns {HTMLElement} Volet Bootstrap avec identifiants propres à l'instance. */
  render() {
    const titleId = `${this.element.id}-title`;
    const collapseId = `${this.element.id}-collapse`;
    this.element.innerHTML = `
      <h5 class="accordion-header" id="${titleId}">
        <button class="accordion-button ${this.expanded ? "" : "collapsed"}" type="button"
          data-bs-toggle="collapse" data-bs-target="#${collapseId}"
          aria-expanded="${this.expanded}" aria-controls="${collapseId}"></button>
      </h5>
      <div id="${collapseId}" class="accordion-collapse collapse ${this.expanded ? "show" : ""}"
        role="region" aria-labelledby="${titleId}" data-bs-parent="#${this.parentId}">
        <div class="accordion-body"></div>
      </div>
    `;
    this.element.setAttribute("aria-labelledby", titleId);
    this.element.querySelector(".accordion-button").textContent = mviewer.tr(this.title);
    const collapse = this.element.querySelector(".accordion-collapse");
    collapse.addEventListener("show.bs.collapse", (event) => {
      if (event.target === collapse) this.expanded = true;
    });
    collapse.addEventListener("hide.bs.collapse", (event) => {
      if (event.target === collapse) this.expanded = false;
    });
    this.element
      .querySelector(".accordion-body")
      .append(this.methods.render(), this.rules.render());
    return this.element;
  }
}
