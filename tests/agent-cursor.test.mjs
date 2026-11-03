import test from "node:test";
import assert from "node:assert/strict";
const { mountAgentCursor } = await import("../client/collab/agent-cursor.js");

test("agent cursor aims off center and varies its bow by name", async () => {
  const frames = [];
  let now = 0;
  globalThis.performance = { now: () => now };
  globalThis.requestAnimationFrame = (fn) => frames.push(fn);
  globalThis.CSS = { escape: (value) => value };
  globalThis.Node = { DOCUMENT_POSITION_FOLLOWING: 4 };
  const makeElement = (rect = {}) => {
    const element = {
    style: {}, dataset: {}, classList: { add() {}, remove() {} }, children: [],
    append(child) { this.children.push(child); child.parentElement = this; },
    querySelector(selector) { return selector === "span" ? (this.label ??= { textContent: "" }) : null; },
    querySelectorAll() { return []; },
    getBoundingClientRect() { return { left: 0, top: 0, width: 100, height: 100, ...rect }; },
    };
    return element;
  };
  globalThis.document = { createElement: () => {
    const element = makeElement();
    let cssText = "";
    Object.defineProperty(element, "style", { configurable: true, get() { return this._style ??= {}; }, set(value) {
      if (typeof value === "string") {
        this._style = Object.defineProperties({}, {
          cssText: { value, configurable: true },
          left: { set(v) { this._left = v; }, get() { return this._left; } },
          top: { set(v) { this._top = v; }, get() { return this._top; } },
        });
      } else this._style = value;
    } });
    return element;
  } };
  const target = makeElement({ left: 600, top: 500, width: 1000, height: 1000 });
  const canvas = makeElement();
  canvas.querySelector = () => target;
  const store = { ui: { zoom: 1, panX: 0, panY: 0 }, subscribe() {} };
  const cursor = mountAgentCursor(canvas, store);
  const move = async (promise) => {
    let settled = false;
    promise.then(() => { settled = true; });
    while (!settled && now < 2000) {
      const frame = frames.shift();
      if (!frame) { await new Promise((resolve) => setTimeout(resolve, 0)); continue; }
      now += 50;
      frame(now);
      await Promise.resolve();
    }
    assert.ok(settled, "cursor movement should finish");
  };
  const ada = cursor.aim("Ada", { nodeId: "target" });
  const adaPointer = canvas.children[0].children[0];
  const adaStart = { x: Number.parseFloat(adaPointer.style.left), y: Number.parseFloat(adaPointer.style.top) };
  await move(ada);
  const adaEnd = { x: Number.parseFloat(adaPointer.style.left), y: Number.parseFloat(adaPointer.style.top) };
  assert.deepEqual(adaEnd, { x: 800, y: 800 }, "cursor should reach the off-center target aim point");
  const adaMid = { x: (adaStart.x + adaEnd.x) / 2, y: (adaStart.y + adaEnd.y) / 2 };

  const grace = cursor.aim("Grace", { nodeId: "target" });
  const gracePointer = canvas.children[0].children[1];
  await move(grace);
  const graceStart = { x: Number.parseFloat(gracePointer.style.left), y: Number.parseFloat(gracePointer.style.top) };
  const graceEnd = { x: Number.parseFloat(gracePointer.style.left), y: Number.parseFloat(gracePointer.style.top) };
  const graceMid = { x: (graceStart.x + graceEnd.x) / 2, y: (graceStart.y + graceEnd.y) / 2 };
  assert.notDeepEqual(adaMid, graceMid, "agent names should produce distinct cursor arcs");
});
