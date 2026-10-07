import RuleConfigPanel from "./ruleConfigPanel.js";

/** Fenêtre d'édition d'une règle, avec validation et annulation. */
export default class RuleConfig {
  constructor() {
    this.element = document.createElement("dialog");

    this.element.className = "style-rule-dialog";

    this.element.setAttribute("aria-label", "Personnalisation du style");
  }

  /** Ouvre une copie de la règle ; seule la validation transmet les changements.
   * @param {Object} options Géométrie, règle et callback onSave.
   */
  open({ geometry, rule, onSave }) {
    const panel = new RuleConfigPanel({ geometry, rule });

    this.element.innerHTML = `
      <form>
        <header>
          <h5>Personnalisation du style</h5>
          <button type="button" data-close aria-label="Fermer">×</button>
        </header>
        <div class="style-rule-dialog__body"></div>
        <footer>
          <button class="btn btn-primary" type="submit">Enregistrer</button>
          <button class="btn btn-outline-primary" type="button" data-close>Fermer</button>
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
          max.setCustomValidity(
            "La taille maximale doit être supérieure ou égale à la taille minimale."
          );

          max.reportValidity();

          max.addEventListener("input", () => max.setCustomValidity(""), { once: true });

          return;
        }
      }

      onSave({ ...rule, ...panel.getValue() });

      this.element.close();
    });

    if (!this.element.isConnected) document.body.appendChild(this.element);

    this.element.showModal();
  }
}
