import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import vm from "node:vm";

const source = await fs.readFile(new URL("../public/script.js", import.meta.url), "utf8");
const start = source.indexOf("const bindLazyComments = ({");
const end = source.indexOf("\n};", start) + 2;
assert.notEqual(start, -1, "bindLazyComments helper should exist");
const bindLazyComments = vm.runInNewContext(`(${source.slice(start, end).replace(/^const bindLazyComments = /, "")})`);

const makeElement = () => {
  const listeners = new Map();
  const attributes = new Map();
  return {
    hidden: false,
    disabled: false,
    textContent: "",
    addEventListener(type, handler) { listeners.set(type, handler); },
    getAttribute(name) { return attributes.get(name) ?? null; },
    setAttribute(name, value) { attributes.set(name, value); },
    async click() { await listeners.get("click")(); },
  };
};

const setup = (load) => {
  const button = makeElement();
  const list = makeElement();
  const form = makeElement();
  const countLabel = { textContent: "not loaded" };
  bindLazyComments({ button, list, form, countLabel, load, noun: "댓글" });
  return { button, list, form, countLabel };
};

test("comments do not load until expanded and load once across collapse/reopen", async () => {
  let calls = 0;
  const ui = setup(async () => { calls += 1; return true; });

  assert.equal(calls, 0);
  assert.equal(ui.list.hidden, true);
  assert.equal(ui.form.hidden, true);

  await ui.button.click();
  assert.equal(calls, 1);
  assert.equal(ui.button.getAttribute("aria-expanded"), "true");
  assert.equal(ui.list.hidden, false);
  assert.equal(ui.form.hidden, false);

  await ui.button.click();
  await ui.button.click();
  assert.equal(calls, 1);
});

test("concurrent expansion attempts share one in-flight comment request", async () => {
  let calls = 0;
  let resolveLoad;
  const ui = setup(() => {
    calls += 1;
    return new Promise((resolve) => { resolveLoad = resolve; });
  });

  const first = ui.button.click();
  const second = ui.button.click();
  assert.equal(calls, 1);
  resolveLoad(true);
  await Promise.all([first, second]);
  assert.equal(ui.button.disabled, false);
});

test("failed lazy load can be retried", async () => {
  let calls = 0;
  const ui = setup(async () => { calls += 1; return calls > 1; });

  await ui.button.click();
  assert.equal(ui.button.textContent, "댓글 다시 불러오기");
  await ui.button.click();
  await ui.button.click();
  assert.equal(calls, 2);
  assert.equal(ui.button.textContent, "댓글 접기");
});