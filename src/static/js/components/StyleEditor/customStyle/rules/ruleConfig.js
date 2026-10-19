import RuleConfigPanel from "./ruleConfigPanel.js";

/** Fenêtre d'édition d'une règle, avec validation et annulation. */
export default class RuleConfig {
  constructor() {
    this.element = document.createElement("dialog");

    this.element.className = "style-rule-dialog";

    this.element.setAttribute("aria-label", mviewer.tr("style_editor.rule.customize"));
  }

  /** Ouvre une copie de la règle ; seule la validation transmet les changements.
   * @param {Object} options Géométrie, règle et callback onSave.
   */
  open({ geometry, rule, ruleMode = "all", onSave }) {
    const panel = new RuleConfigPanel({ geometry, rule, ruleMode });

    this.element.innerHTML = `
      <form>
        <header>
          <h5>${mviewer.tr("style_editor.rule.customize")}</h5>
          <button type="button" data-close aria-label="${mviewer.tr("close")}">×</button>
        </header>
        <div class="style-rule-dialog__body"></div>
        <footer>
          <button class="btn btn-primary" type="submit">${mviewer.tr("save")}</button>
          <button class="btn btn-outline-primary" type="button" data-close>${mviewer.tr("close")}</button>
        </footer>
      </form>
    `;

    this.element.querySelector(".style-rule-dialog__body").appendChild(panel.render());

    this.element
      .querySelectorAll("[data-close]")
      .forEach((button) => button.addEventListener("click", () => this.element.close()));

    this.element.querySelector("form").addEventListener("submit", (event) => {
      event.preventDefault();

      const symbol = panel.panels.symbol;

      if (symbol) {
        const min = symbol.element.querySelector('[name="minSize"]');

        const max = symbol.element.querySelector('[name="maxSize"]');

        max.setCustomValidity("");

        if (max.valueAsNumber < min.valueAsNumber) {
          max.setCustomValidity(mviewer.tr("style_editor.error.size_range"));

          max.reportValidity();

          max.addEventListener("input", () => max.setCustomValidity(""), { once: true });

          return;
        }
      }

      const values = panel.getValue();
      if (values.symbol) values.symbol = { ...rule.symbol, ...values.symbol };
      onSave({ ...rule, ...values });

      this.element.close();
    });

    if (!this.element.isConnected) document.body.appendChild(this.element);

    this.element.showModal();
  }
}
