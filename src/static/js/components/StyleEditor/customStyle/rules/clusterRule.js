import RulesPanel from "./rulesPanel.js";
import Tooltip from "../../../tooltip/tooltip.js";
import { createField } from "./fields.js";
import {
  CLUSTER_RULE_CONDITIONS,
  DEFAULT_CLUSTER_RULE,
  MAX_CLUSTER_RULES,
} from "../../constants.js";

/** Cluster rules use PointStacker counts instead of source attribute classes. */
export default class ClusterRule extends RulesPanel {
  /** @returns {Object} Default cluster rule, applying to every count. */
  createRule() {
    return { ...super.createRule(), ...DEFAULT_CLUSTER_RULE };
  }

  /** @returns {boolean} Allow singleton and overflow rules alongside the count classes. */
  canAddRule() {
    return this.rules.length < MAX_CLUSTER_RULES;
  }

  /**
   * Normalizes legacy bounds that previously described source attribute classes.
   * @param {Object} rule Saved cluster rule.
   * @returns {Object} Independent rule with valid count bounds.
   */
  prepareRule(rule) {
    const prepared = super.prepareRule(rule);
    if (!this.isRuleRangeValid(prepared)) {
      prepared.min = DEFAULT_CLUSTER_RULE.min;
      prepared.max = DEFAULT_CLUSTER_RULE.max;
    }
    return prepared;
  }

  /** @returns {string[]} Standard editable properties retained by this component. */
  getRuleFields() {
    return ["name"];
  }

  /** @returns {HTMLElement} Rule table with an explanation of count conditions. */
  render() {
    super.render();
    new Tooltip({
      message: mviewer.tr("style_editor.cluster_rule.condition_help"),
      classes: "ms-1",
    }).appendTo(this.element.querySelector('[data-column="clusterCondition"]'));
    return this.element;
  }

  /** @returns {string[]} Cluster-specific table columns. */
  getRuleColumns() {
    const columns = ["name", "clusterCondition"];
    if (this.rules.some((rule) => ["range", "atLeast"].includes(rule.clusterCondition))) {
      columns.push("countMin");
    }
    if (this.rules.some((rule) => rule.clusterCondition === "range")) {
      columns.push("countMax");
    }
    return columns;
  }

  /**
   * Adds the count condition and separate minimum and maximum count columns.
   * @param {HTMLTableRowElement} row Current rule row.
   * @param {Object} rule Editable rule.
   * @param {number} index Rule position, used by accessible labels.
   * @returns {void}
   */
  appendRuleFields(row, rule, index) {
    super.appendRuleFields(row, rule, index);
    const cell = row.insertCell();
    const field = createField(
      {
        name: "clusterCondition",
        label: "style_editor.rule.clusterCondition",
        options: CLUSTER_RULE_CONDITIONS,
      },
      rule.clusterCondition
    );
    const select = field.querySelector("select");
    select.setAttribute(
      "aria-label",
      this.getFieldLabel("style_editor.rule.clusterCondition", index)
    );
    select.addEventListener("change", () => {
      rule.clusterCondition = select.value;
      if (rule.clusterCondition === "range" && rule.max < rule.min) rule.max = rule.min;
      this.render();
      this.update();
    });
    cell.appendChild(select);
    if (this.getRuleColumns().includes("countMin")) {
      this.appendCountBounds(row, rule, index);
    }
  }

  /**
   * Describes a field together with the rule it belongs to.
   * @param {string} key Translation key for the field.
   * @param {number} index Zero-based rule index.
   * @returns {string} Accessible field label.
   */
  getFieldLabel(key, index) {
    return mviewer
      .tr("style_editor.rule.field_label")
      .replace("{field}", mviewer.tr(key))
      .replace("{index}", index + 1);
  }

  /**
   * Adds inclusive integer bounds or a lower threshold, according to the condition.
   * @param {HTMLTableRowElement} row Rule row receiving the visible count cells.
   * @param {Object} rule Rule containing min and max counts.
   * @param {number} index Zero-based rule index.
   * @returns {void}
   */
  appendCountBounds(row, rule, index) {
    const names = ["min"];
    if (this.getRuleColumns().includes("countMax")) names.push("max");
    for (const name of names) {
      const key = `style_editor.cluster_rule.${name}`;
      const field = createField(
        { name, label: key, type: "number", min: 1, step: 1 },
        rule[name]
      );
      const input = field.querySelector("input");
      input.setAttribute("aria-label", this.getFieldLabel(key, index));
      input.disabled = rule.clusterCondition !== "range";
      if (rule.clusterCondition === "atLeast" && name === "min") input.disabled = false;
      if (input.disabled) {
        input.value = "";
        if (rule.clusterCondition === "single") input.value = 1;
      }
      input.addEventListener("change", () => {
        const updated = { ...rule, [name]: input.valueAsNumber };
        if (!this.isRuleRangeValid(updated)) {
          input.setCustomValidity(mviewer.tr("style_editor.error.cluster_rule"));
          input.reportValidity();
          input.setCustomValidity("");
          input.value = rule[name];
          return;
        }
        rule[name] = updated[name];
        this.update();
      });
      row.insertCell().appendChild(input);
    }
  }

  /**
   * Count intervals are inclusive and may describe a single integer value.
   * @param {Object} rule Proposed bounds.
   * @returns {boolean} Whether both bounds are valid group sizes.
   */
  isRuleRangeValid(rule) {
    if (rule.clusterCondition === "atLeast") {
      return Number.isInteger(rule.min) && rule.min >= 1;
    }
    return (
      Number.isInteger(rule.min) &&
      Number.isInteger(rule.max) &&
      rule.min >= 1 &&
      rule.max >= rule.min
    );
  }
}
