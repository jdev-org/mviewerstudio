import assert from "node:assert/strict";
import test from "node:test";
import ClassificationPanel from "../static/js/components/StyleEditor/customStyle/ClassificationPanel.js";
import CircleColorClassificationPanel from "../static/js/components/StyleEditor/customStyle/circleColorClassificationPanel.js";
import CustomStyle from "../static/js/components/StyleEditor/customStyle/CustomStyle.js";
import { suggestClassificationMode } from "../static/js/utils/styler/classification/fieldValues.js";

// Unmounted components need only element identity, events and empty field queries.
class Element extends EventTarget {
  hasChildNodes() {
    return false;
  }
  querySelector() {
    return null;
  }
  querySelectorAll() {
    return [];
  }
  setAttribute() {}
}
globalThis.document = { createElement: () => new Element() };
globalThis.mviewer = { tr: (key) => key };
const options = {
  type: "analyse",
  geometry: "Point",
  fields: ["total", "status"],
  ruleMode: "color",
};

function createPanel() {
  return new CircleColorClassificationPanel({
    ...options,
    getFieldType: () => "categorized",
  });
}

test("Mode changes preserve compatible settings, clear incompatible rules and notify once", () => {
  const panel = createPanel();
  Object.assign(panel.methods.state, {
    field: "status",
    method: "quantiles",
    classes: 4,
    color: "Blues",
    reverseColors: true,
  });
  panel.rules.selected.add(0);
  panel.element.hasChildNodes = () => true;
  let renders = 0;
  let updates = 0;
  panel.render = () => renders++;
  panel.element.addEventListener("update", () => updates++);
  panel.setClassificationMode("categorized");
  const value = panel.getValue();
  assert.equal(value.type, "categorized");
  assert.equal(value.field, "status");
  assert.equal(value.method, "quantiles");
  assert.equal(value.classes, 4);
  assert.equal(value.color, "Blues");
  assert.equal(value.reverseColors, true);
  assert.deepEqual(value.rules, []);
  assert.equal(panel.rules.selected.size, 0);
  assert.equal(panel.rules.type, "categorized");
  assert.equal(renders, 1);
  assert.equal(updates, 1);
  panel.setClassificationMode("categorized");
  assert.equal(renders, 1);
  assert.equal(updates, 1);
  panel.setClassificationMode("analyse");
  assert.equal(panel.getValue().method, "quantiles");
});

test("Restoration restores color mode, keeps missing saved fields and clones saved data", () => {
  const panel = createPanel();
  const saved = {
    type: "categorized",
    field: "legacy_status",
    rules: [{ name: "Private", value: "001", fill: { color: "#123456" } }],
  };
  panel.restore(saved);
  const value = panel.getValue();
  assert.equal(value.type, "categorized");
  assert.equal(value.field, "legacy_status");
  assert.equal(value.rules[0].value, "001");
  assert.equal(value.rules[0].fill.color, "#123456");
  assert.ok(panel.methods.fields.includes("legacy_status"));
  value.rules[0].fill.color = "#ffffff";
  saved.rules[0].fill.color = "#000000";
  assert.equal(panel.getValue().rules[0].fill.color, "#123456");
  panel.restore({ field: "total", rules: [{ name: "0 – 10", min: 0, max: 10 }] });
  assert.equal(panel.getValue().type, "analyse");
});

test("Restoration keeps the size panel representation and excludes parent metadata", () => {
  const panel = new ClassificationPanel({
    ...options,
    type: "proportionalCircles",
    ruleMode: "size",
  });
  panel.restore({
    type: "proportionalColoredCircles",
    geometry: "Point",
    field: "total",
    colorClassification: {},
    referentialLayer: "layer",
    rules: [{ name: "size", min: 0, max: 10 }],
  });
  assert.equal(panel.type, "proportionalCircles");
  assert.equal(panel.getValue().colorClassification, undefined);
  assert.equal(panel.getValue().referentialLayer, undefined);
  assert.equal(panel.getValue().geometry, undefined);
});

test("Updating fields keeps a valid selection and clears a removed field", () => {
  const panel = createPanel();
  panel.restore({ field: "status", rules: [] });
  const fields = ["status", "another"];
  panel.setFields(fields);
  fields.push("external");
  assert.equal(panel.getValue().field, "status");
  assert.equal(panel.methods.fields.includes("external"), false);
  panel.setFields(["total"]);
  assert.equal(panel.getValue().field, "");
});

test("CustomStyle forwards field changes through the public panel API", () => {
  const calls = [];
  const fields = ["total"];
  const panel = {
    setFields: (value) => calls.push(value),
    colorClassification: { setFields: (value) => calls.push(value) },
  };
  CustomStyle.prototype.setFields.call({ panels: { combined: panel } }, fields);
  assert.deepEqual(calls, [fields, fields]);
});

for (const [name, layer, expected] of [
  ["numeric CSV", { csvData: [{ value: null }, { value: 12 }] }, "analyse"],
  ["text CSV", { csvData: [{ value: "private" }] }, "categorized"],
  ["numeric identifiers", { csvData: [{ value: "001" }] }, "categorized"],
  ["numeric GeoJSON", { features: [{ properties: { value: 12 } }] }, "analyse"],
  ["text GeoJSON", { features: [{ properties: { value: "private" } }] }, "categorized"],
  ["missing samples", {}, "analyse"],
]) {
  test(`Field mode suggestion uses supplied data for ${name}`, () => {
    assert.equal(suggestClassificationMode(layer, "value"), expected);
  });
}
