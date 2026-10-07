import RuleConfig from "./ruleConfig.js";
import { DEFAULT_FILL, DEFAULT_STROKE, DEFAULT_SYMBOL } from "../../constants.js";
import { createField } from "./fields.js";

/** Tableau éditable des règles, sans génération statistique ni palette. */
export default class RulesPanel {
  constructor({ geometry = "Point", type = "simple", rules = [] } = {}) {
    this.geometry = geometry;

    this.type = type;

    this.rules = rules.map((rule) => this.prepareRule(rule));

    this.selected = new Set();

    this.element = document.createElement("div");

    this.element.className = "style-rules";

    this.config = new RuleConfig();

    if (this.rules.length === 0) {
      this.rules.push(this.createRule());
    }
  }

  /** @returns {Object} Nouvelle règle indépendante. */
  createRule() {
    return {
      name: "Nouvelle règle",
      value: "",
      min: 0,
      max: 1,
      fill: { ...DEFAULT_FILL },
      stroke: { ...DEFAULT_STROKE },
      symbol: { ...DEFAULT_SYMBOL },
    };
  }

  /** Complète une règle reçue sans modifier l'objet d'origine.
   * @param {Object} rule Règle à préparer.
   * @returns {Object} Copie contenant tous les paramètres nécessaires.
   */
  prepareRule(rule) {
    const copy = structuredClone(rule);

    return {
      ...this.createRule(),
      ...copy,
      fill: { ...DEFAULT_FILL, ...copy.fill },
      stroke: { ...DEFAULT_STROKE, ...copy.stroke },
      symbol: { ...DEFAULT_SYMBOL, ...copy.symbol },
    };
  }

  /** Émet une copie des règles après une modification. */
  update() {
    this.element.dispatchEvent(
      new CustomEvent("update", { detail: structuredClone(this.rules), bubbles: true })
    );
  }

  /** Remplace les classes avec les règles fournies par le calcul externe.
   * @param {Object[]} rules Règles calculées.
   * @returns {void}
   */
  setRules(rules) {
    this.rules = rules.map((rule) => this.prepareRule(rule));

    this.selected.clear();

    this.render();

    this.update();
  }

  /** Réordonne une règle et conserve ses valeurs. */
  move(index, direction) {
    const target = index + direction;

    if (target < 0 || target >= this.rules.length) {
      return;
    }

    const movedRule = this.rules[index];

    this.rules[index] = this.rules[target];

    this.rules[target] = movedRule;

    this.selected.clear();

    this.render();

    this.update();
  }

  /** @returns {HTMLElement} Tableau et barre d'actions. */
  render() {
    this.element.innerHTML = `
      <div class="style-rules__scroll">
        <table>
          <thead>
            <tr>
              <th><input type="checkbox" aria-label="Sélectionner toutes les règles" data-all></th>
              <th><span class="visually-hidden">Ordre</span></th>
              <th>Style</th>
              <th>Nom</th>
            </tr>
          </thead>
          <tbody></tbody>
        </table>
      </div>
      <div class="style-rules__toolbar">
        <button type="button" data-add>＋ Ajouter</button>
        <button type="button" data-delete disabled>− Supprimer</button>
      </div>
    `;

    // Les catégories ont une valeur unique ; les classes ont deux bornes.
    const header = this.element.querySelector("thead tr");

    if (this.type === "categorized") {
      header.insertAdjacentHTML("beforeend", "<th>Valeur</th>");
    } else if (this.type !== "simple") {
      header.insertAdjacentHTML("beforeend", "<th>Valeur min</th><th>Valeur max</th>");
    }

    header.insertAdjacentHTML(
      "beforeend",
      '<th><span class="visually-hidden">Dupliquer</span></th>'
    );

    const body = this.element.querySelector("tbody");

    this.rules.forEach((rule, index) => {
      body.appendChild(this.createRow(rule, index));
    });

    this.bindToolbar();

    this.updateSelection();

    return this.element;
  }

  /** Construit une ligne et branche ses boutons.
   * @param {Object} rule Règle affichée.
   * @param {number} index Position dans la liste.
   * @returns {HTMLTableRowElement} Ligne du tableau.
   */
  createRow(rule, index) {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td><input type="checkbox" aria-label="Sélectionner la règle ${index + 1}"></td>
      <td class="style-rules__order">
        <button type="button" data-up aria-label="Monter">⌃</button>
        <button type="button" data-down aria-label="Descendre">⌄</button>
      </td>
      <td>
        <button type="button" class="style-rules__preview" aria-label="Personnaliser la règle ${index + 1}">
          <span></span>
        </button>
      </td>
    `;

    const checkbox = row.querySelector("input");

    checkbox.checked = this.selected.has(index);

    checkbox.addEventListener("change", () => {
      if (checkbox.checked) {
        this.selected.add(index);
      } else {
        this.selected.delete(index);
      }

      this.updateSelection();
    });

    const upButton = row.querySelector("[data-up]");

    const downButton = row.querySelector("[data-down]");

    upButton.disabled = index === 0;

    downButton.disabled = index === this.rules.length - 1;

    upButton.addEventListener("click", () => this.move(index, -1));

    downButton.addEventListener("click", () => this.move(index, 1));

    const preview = row.querySelector(".style-rules__preview");

    const swatch = preview.querySelector("span");

    swatch.style.backgroundColor = rule.fill.color;

    if (this.geometry === "LineString") {
      swatch.style.backgroundColor = rule.stroke.color;
    }

    if (this.geometry === "Point") {
      swatch.style.borderRadius = "50%";
    }

    // La fenêtre ne modifie la règle qu'après un clic sur Enregistrer.
    preview.addEventListener("click", () => {
      this.config.open({
        geometry: this.geometry,
        rule,
        onSave: (updatedRule) => {
          this.rules[index] = updatedRule;

          this.render();

          this.update();
        },
      });
    });

    this.appendRuleFields(row, rule, index);

    row.insertAdjacentHTML(
      "beforeend",
      `
      <td><button type="button" data-duplicate aria-label="Dupliquer la règle">⧉</button></td>
    `
    );

    const duplicateButton = row.querySelector("[data-duplicate]");

    duplicateButton.disabled = this.type === "categorized" && this.rules.length >= 10;

    duplicateButton.addEventListener("click", () => {
      // Une copie indépendante évite de partager les couleurs entre deux règles.
      const copy = structuredClone(rule);

      this.rules.splice(index + 1, 0, copy);

      this.selected.clear();

      this.render();

      this.update();
    });

    return row;
  }

  /** Ajoute les champs éditables correspondant au mode de représentation.
   * @param {HTMLTableRowElement} row Ligne à compléter.
   * @param {Object} rule Règle modifiée par les champs.
   * @param {number} index Position utilisée pour les libellés accessibles.
   * @returns {void}
   */
  appendRuleFields(row, rule, index) {
    const names = ["name"];

    if (this.type === "categorized") {
      names.push("value");
    } else if (this.type !== "simple") {
      names.push("min", "max");
    }

    names.forEach((name) => {
      const definition = { name, label: name, type: "text" };

      if (name === "min" || name === "max") {
        definition.type = "number";

        definition.step = "any";
      }

      const field = createField(definition, rule[name]);

      const input = field.querySelector("input");

      input.setAttribute("aria-label", `${name} de la règle ${index + 1}`);

      const cell = row.insertCell();

      cell.appendChild(input);

      input.addEventListener("change", () => {
        rule[name] = input.value;

        if (input.type === "number") {
          rule[name] = input.valueAsNumber;
        }

        this.update();
      });
    });
  }

  /** Branche les actions qui concernent l'ensemble du tableau. */
  bindToolbar() {
    const selectAll = this.element.querySelector("[data-all]");

    const addButton = this.element.querySelector("[data-add]");

    const deleteButton = this.element.querySelector("[data-delete]");

    selectAll.addEventListener("change", () => {
      this.selected.clear();

      if (selectAll.checked) {
        this.rules.forEach((rule, index) => {
          this.selected.add(index);
        });
      }

      this.render();
    });

    addButton.disabled = this.type === "categorized" && this.rules.length >= 10;

    addButton.addEventListener("click", () => {
      this.rules.push(this.createRule());

      this.render();

      this.update();
    });

    deleteButton.addEventListener("click", () => {
      this.rules = this.rules.filter((rule, index) => !this.selected.has(index));

      this.selected.clear();

      this.render();

      this.update();
    });
  }

  /** Synchronise la sélection globale et le bouton de suppression. */
  updateSelection() {
    const all = this.element.querySelector("[data-all]");

    all.checked = this.rules.length > 0 && this.selected.size === this.rules.length;

    all.indeterminate = this.selected.size > 0 && !all.checked;

    this.element.querySelector("[data-delete]").disabled = this.selected.size === 0;
  }
}
