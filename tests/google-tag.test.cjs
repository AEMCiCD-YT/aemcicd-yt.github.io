const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function setup() {
  const events = [];
  let click;
  const window = { location: { href: "https://aemcicd.org/colabora/", pathname: "/colabora/" }, gtag: (...args) => events.push(args) };
  const document = {
    createElement: () => ({}), head: { appendChild() {} },
    addEventListener: (type, handler) => { if (type === "click") click = handler; },
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../assets/js/google-tag.js"), "utf8"), { window, document, URL });
  return { events, click(href) { click({ target: { closest: () => ({ getAttribute: () => href }) } }); } };
}

test("opening the report form never records a received report", () => {
  const app = setup();
  app.click("https://braillelab.org/alianzas/#aviso");
  assert.equal(app.events.filter(([name]) => name === "event").length, 0);
});

test("support navigation keeps its separate conversion and linker precedes config", () => {
  const app = setup();
  app.click("https://braillelab.org/alianzas/");
  const conversions = app.events.filter(([name]) => name === "event");
  assert.equal(conversions.length, 1);
  assert.equal(conversions[0][2].send_to, "AW-18480905412/CwYnCK3HkpgdEMT5sOxE");
  const linkerIndex = app.events.findIndex(([name, key]) => name === "set" && key === "linker");
  const configIndex = app.events.findIndex(([name]) => name === "config");
  assert.ok(linkerIndex >= 0 && linkerIndex < configIndex);
  assert.deepEqual(Array.from(app.events[linkerIndex][2].domains), ["aemcicd.org", "braillelab.org"]);
});

test("English BrailleLab pages record the same conversions as the Spanish ones", () => {
  const app = setup();
  app.click("https://braillelab.org/en/support/#aviso");
  app.click("https://braillelab.org/en/support/");
  app.click("https://braillelab.org/en/challenge/");
  app.click("https://braillelab.org/en/transparency/");
  const sendTo = app.events.filter(([name]) => name === "event").map(([, , params]) => params.send_to);
  assert.deepEqual(sendTo, ["AW-18480905412/CwYnCK3HkpgdEMT5sOxE", "AW-18480905412/dbd7CKvIkpgdEMT5sOxE"]);
});
