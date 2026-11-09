import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

const html = await fs.readFile(new URL("../public/index.html", import.meta.url), "utf8");
const script = await fs.readFile(new URL("../public/script.js", import.meta.url), "utf8");
const readme = await fs.readFile(new URL("../README.md", import.meta.url), "utf8");
const worker = await fs.readFile(new URL("../src/worker.js", import.meta.url), "utf8");

test("analytics identifiers and consent UI are present", () => {
  assert.match(script, /GTM-PQQFR7KV/);
  assert.match(script, /G-0HFX4KE2GH/);
  assert.match(html, /id="analytics-consent"/);
  assert.match(html, /id="analytics-consent-accept"/);
  assert.match(html, /id="analytics-consent-reject"/);
  assert.match(html, /id="privacy-settings-open"/);
});

test("consent defaults to denied and both tags load only from the consent action", () => {
  const defaultConsent = script.indexOf('window.gtag("consent", "default"');
  const tagLoader = script.indexOf("const loadGoogleTagManager = () =>");
  const initialization = script.indexOf("initializeAnalyticsConsent();");
  assert.ok(defaultConsent >= 0 && defaultConsent < tagLoader);
  assert.match(script, /analytics_storage:\s*"denied"/);
  assert.match(script, /analytics_storage:\s*consent/);
  assert.ok(script.includes("if (granted) loadGoogleTagManager();"));
  assert.ok(initialization > defaultConsent);
  assert.match(script, /id = "google-tag-manager-script"/);
});

test("conversion events are consent-gated and exclude personal information", () => {
  const eventFunctionStart = script.indexOf("const pushAnalyticsEvent =");
  const eventFunctionEnd = script.indexOf("\n};", eventFunctionStart) + 3;
  const functionSource = script.slice(eventFunctionStart, eventFunctionEnd);
  assert.match(functionSource, /localStorage\.getItem\(ANALYTICS_CONSENT_KEY\) !== "granted"/);
  for (const event of ["greeting_submit", "question_submit"]) {
    assert.ok(script.includes(`pushAnalyticsEvent("${event}"`), `missing ${event} conversion`);
  }
  assert.match(script, /authMode === "login" \? "login" : "sign_up"/);
  assert.doesNotMatch(functionSource, /email|nickname|content|question/);
});

test("GTM script and analytics endpoints are allowed by the Worker CSP and documented", () => {
  assert.match(worker, /script-src[^\"]*www\.googletagmanager\.com/);
  assert.match(worker, /connect-src[^\"]*google-analytics\.com/);
  assert.match(readme, /GTM Custom Event: `site_conversion`/);
  assert.match(readme, /중복 집계를 피하세요/);
});

test("GA4 is sent only through GTM (no direct gtag config/script to avoid double counting)", () => {
  assert.doesNotMatch(script, /gtag\/js\?id=/);
  assert.doesNotMatch(script, /window\.gtag\("config"/);
  assert.doesNotMatch(script, /window\.gtag\("event"/);
});
