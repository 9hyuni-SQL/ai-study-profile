import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { withSecurityHeaders } from "../src/worker.js";

test("security headers are applied without dropping existing response headers or body", async () => {
  const original = new Response("not found", {
    status: 404,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=0" },
  });
  const response = withSecurityHeaders(original);

  assert.equal(response.status, 404);
  assert.equal(response.headers.get("content-type"), "text/plain; charset=utf-8");
  assert.equal(response.headers.get("cache-control"), "public, max-age=0");
  assert.equal(response.headers.get("x-frame-options"), "SAMEORIGIN");
  assert.match(response.headers.get("content-security-policy"), /frame-ancestors 'self'/);
  assert.match(response.headers.get("content-security-policy"), /object-src 'none'/);
  assert.equal(response.headers.get("strict-transport-security"), "max-age=31536000; includeSubDomains");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("referrer-policy"), "strict-origin-when-cross-origin");
  assert.equal(response.headers.get("permissions-policy"), "camera=(), microphone=(), geolocation=()");
  assert.equal(await response.text(), "not found");
});

test("static asset headers distinguish HTML revalidation from cacheable assets", async () => {
  const headers = await fs.readFile(new URL("../public/_headers", import.meta.url), "utf8");

  assert.match(headers, /\/\*\.html[\s\S]*?Cache-Control: public, max-age=0, must-revalidate/);
  assert.match(headers, /\/\*\.css[\s\S]*?Cache-Control: public, max-age=31536000, immutable/);
  assert.match(headers, /\/\*\.js[\s\S]*?Cache-Control: public, max-age=31536000, immutable/);
  assert.match(headers, /\/images\/\*[\s\S]*?Cache-Control: public, max-age=86400/);
  assert.doesNotMatch(headers, /Content-Security-Policy:/);
});