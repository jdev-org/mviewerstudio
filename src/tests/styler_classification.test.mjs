import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import { loadFieldValues } from "../static/js/utils/styler/data/loadFieldValues.js";
import { classify } from "../static/js/utils/styler/classification/classify.js";
import { createClassificationRules } from "../static/js/utils/styler/classification/createRules.js";
import StyleEditor from "../static/js/components/StyleEditor/StyleEditor.js";

function setGlobal(t, name, value) {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, name);
  Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
  t.after(() => {
    if (descriptor) Object.defineProperty(globalThis, name, descriptor);
    else delete globalThis[name];
  });
}

const bundle = (file, name) =>
  vm.runInNewContext(readFileSync(new URL(file, import.meta.url), "utf8") + `; ${name}`);
globalThis.ss = bundle("../static/lib/simple-statistics.min.js", "ss");
globalThis.chroma = bundle("../static/lib/chroma.js/index.min.js", "chroma");
globalThis.mviewer = { tr: (key) => key };
const parameters = {
  type: "proportionalCircles",
  geometry: "Point",
  field: "amount",
  method: "equalInterval",
  classes: 2,
  color: "#123456",
  maxSize: 20,
};
const records = [{ amount: 0 }, { amount: 10 }, { amount: 20 }];

for (const method of ["jenk", "equalInterval", "quantiles"]) {
  test(`Numeric ${method} classification returns intervals without visual properties`, () => {
    const rules = classify(records, { ...parameters, method });
    assert.equal(rules.length, 2);
    assert.equal(rules[0].min, 0);
    assert.equal(rules[1].max, 20);
    assert.equal(rules[0].fill, undefined);
    assert.equal(rules[0].symbol, undefined);
  });
}

test("Rule construction preserves proportional areas and leaves source records untouched", () => {
  const before = structuredClone(records);
  const rules = createClassificationRules(records, parameters);
  assert.equal(rules[1].symbol.maxSize, 20);
  assert.ok(
    Math.abs((rules[0].symbol.maxSize / rules[1].symbol.maxSize) ** 2 - 1 / 3) < 1e-12
  );
  assert.equal(rules[0].fill.color, parameters.color);
  assert.deepEqual(records, before);
  const sizes = createClassificationRules(records, { ...parameters, ruleMode: "size" });
  assert.equal(sizes[0].fill, undefined);
  assert.equal(sizes[0].stroke, undefined);
});

test("Categories retain identifiers and apply colors to the correct geometry", () => {
  const data = [{ amount: "001" }, { amount: "002" }, { amount: "001" }];
  const rules = createClassificationRules(data, {
    ...parameters,
    type: "categorized",
    geometry: "LineString",
  });
  assert.deepEqual(
    rules.map((rule) => rule.value),
    ["001", "002"]
  );
  assert.match(rules[0].stroke.color, /^#[0-9a-f]{6}$/i);
  assert.equal(rules[0].fill, undefined);
});

test("Empty values and too many categories retain their existing errors", () => {
  assert.throws(() => classify([], parameters), /style_editor.error.no_classes/);
  assert.throws(
    () =>
      classify(
        Array.from({ length: 11 }, (_, amount) => ({ amount })),
        { ...parameters, type: "categorized" }
      ),
    /style_editor.error.too_many_categories/
  );
});

test("WFS loading requests all values for the selected field and layer", async (t) => {
  setGlobal(t, "ogc", {
    urlToObject: (base, values) => {
      assert.equal(base, "https://example.org/wfs");
      assert.equal(values.TYPENAME, "namespace:layer");
      assert.equal(values.PROPERTYNAME, "amount");
      assert.equal(values.MAXFEATURES, undefined);
      return new URL(base);
    },
  });
  const fetch = t.mock.method(globalThis, "fetch", async () =>
    Response.json({ features: records.map((properties) => ({ properties })) })
  );
  const data = await loadFieldValues(
    { wfs_url: "https://example.org/wfs" },
    "namespace:layer",
    parameters
  );
  assert.deepEqual(data, records);
  assert.equal(fetch.mock.callCount(), 1);
});

for (const [name, response, error] of [
  ["HTTP errors", () => new Response("failure", { status: 503 }), "load_values"],
  ["invalid collections", () => Response.json({ features: null }), "invalid_data"],
]) {
  test(`WFS loading reports ${name}`, async (t) => {
    setGlobal(t, "ogc", {
      urlToObject: () => new URL("https://example.org/wfs"),
    });
    t.mock.method(globalThis, "fetch", async () => response());
    await assert.rejects(
      loadFieldValues({ wfs_url: "https://example.org/wfs" }, "layer", parameters),
      new RegExp(`style_editor.error.${error}`)
    );
  });
}

test("Cluster calculations do not require source records", () => {
  const rules = createClassificationRules([], {
    ...parameters,
    type: "cluster",
    classInterval: 10,
  });
  assert.equal(rules[0].clusterCondition, "single");
  assert.equal(rules.at(-1).clusterCondition, "atLeast");
  assert.ok(rules.every((rule) => rule.fill.color));
});

for (const change of ["layer", "panel"]) {
  test(`Late WFS results do not update a replaced ${change}`, async (t) => {
    setGlobal(t, "config", {
      temp: { layers: { layer: { wfs_url: "https://example.org/wfs" } } },
    });
    setGlobal(t, "ogc", {
      urlToObject: () => new URL("https://example.org/wfs"),
    });
    let finish;
    t.mock.method(
      globalThis,
      "fetch",
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    );
    const button = { disabled: false };
    const message = { textContent: "", classList: { add() {}, remove() {} } };
    let updates = 0;
    const editor = {
      layerId: "layer",
      customStyle: { preview: { refreshStyle: () => updates++ } },
    };
    const pending = StyleEditor.prototype.calculate.call(editor, {
      target: {
        querySelector: (selector) => (selector.includes("button") ? button : message),
      },
      detail: { ...parameters, setRules: () => updates++ },
    });
    assert.equal(button.disabled, true);
    if (change === "layer") editor.layerId = "other";
    else editor.customStyle = {};
    finish(Response.json({ features: records.map((properties) => ({ properties })) }));
    await pending;
    assert.equal(updates, 0);
    assert.equal(button.disabled, false);
    assert.equal(message.textContent, "");
  });
}
