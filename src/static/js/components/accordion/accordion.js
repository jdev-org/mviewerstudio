let accordionId = 0;

/** Reusable Bootstrap accordion panel, styled through Bootstrap variables and CSS classes. */
export default class Accordion {
  /**
   * @param {Object} [options={}] Panel configuration.
   * @param {string} [options.title=""] Visible heading, already translated by the caller.
   * @param {boolean} [options.expanded=false] Initial open state.
   * @param {string} [options.classes=""] Extra root classes, including theme classes.
   * @param {string} [options.parentId] Optional accordion group for exclusive opening.
   * @param {HTMLElement} [options.content] Initial panel content.
   * @param {Object} [options.ids={}] Optional container, heading and collapse IDs for legacy integrations.
   */
  constructor({
    title = "",
    expanded = false,
    classes = "",
    parentId,
    content,
    ids = {},
  } = {}) {
    accordionId += 1;
    const headingId = ids.heading || `accordion-heading-${accordionId}`;
    const collapseId = ids.collapse || `accordion-collapse-${accordionId}`;
    this.expanded = expanded;
    this.element = document.createElement("section");
    this.element.className = `accordion mv-accordion mb-3 ${classes}`.trim();
    if (ids.container) this.element.id = ids.container;
    this.element.innerHTML = `
      <div class="accordion-item">
        <h5 class="accordion-header" id="${headingId}">
          <button class="accordion-button ${expanded ? "" : "collapsed"}" type="button"
            data-bs-toggle="collapse" data-bs-target="#${collapseId}"
            aria-expanded="${expanded}" aria-controls="${collapseId}"></button>
        </h5>
        <div id="${collapseId}" class="accordion-collapse collapse ${expanded ? "show" : ""}"
          role="region" aria-labelledby="${headingId}">
          <div class="accordion-body"></div>
        </div>
      </div>
    `;
    this.button = this.element.querySelector(".accordion-button");
    this.button.textContent = title;
    this.collapse = this.element.querySelector(".accordion-collapse");
    this.content = this.element.querySelector(".accordion-body");
    if (parentId) this.collapse.setAttribute("data-bs-parent", `#${parentId}`);
    if (content) this.content.appendChild(content);
    this.collapse.addEventListener("show.bs.collapse", (event) => {
      if (event.target === this.collapse) this.expanded = true;
    });
    this.collapse.addEventListener("hide.bs.collapse", (event) => {
      if (event.target === this.collapse) this.expanded = false;
    });
  }

  /** Open or close through Bootstrap while keeping its button and ARIA state synchronized.
   * @param {boolean} expanded Whether the panel should be open.
   * @returns {void}
   */
  setExpanded(expanded) {
    const collapse = window.bootstrap.Collapse.getOrCreateInstance(this.collapse, {
      toggle: false,
    });
    if (expanded) collapse.show();
    else collapse.hide();
  }

  /** Replace panel content without rebuilding the header or resetting the open state.
   * @param {HTMLElement} content New panel content.
   * @returns {void}
   */
  setContent(content) {
    this.content.replaceChildren(content);
  }

  /** @returns {HTMLElement} Existing panel element, preserving its current state. */
  render() {
    return this.element;
  }

  /** Mount the existing panel in a container.
   * @param {HTMLElement} target Destination container.
   * @returns {HTMLElement} Mounted panel element.
   */
  appendTo(target) {
    target.appendChild(this.element);
    return this.element;
  }
}
