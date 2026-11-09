import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { posts } from "../src/worker.js";

const createDb = (rows) => ({
  prepare(sql) {
    return {
      values: [],
      bind(...values) { this.values = values; return this; },
      async first() {
        const category = this.values[0];
        const userId = sql.includes("user_id=?") ? this.values[1] : null;
        return { total: rows.filter((row) => row.category === category && (userId === null || row.user_id === userId)).length };
      },
      async all() {
        const category = this.values[0];
        const hasUser = sql.includes("user_id=?");
        const userId = hasUser ? this.values[1] : null;
        const limit = this.values[hasUser ? 2 : 1];
        const offset = this.values[hasUser ? 3 : 2];
        return { results: rows.filter((row) => row.category === category && (userId === null || row.user_id === userId)).slice(offset, offset + limit) };
      },
    };
  },
});

const records = Array.from({ length: 23 }, (_, index) => ({
  id: index + 1,
  user_id: index % 2 ? 2 : 1,
  nickname: `user-${index + 1}`,
  content: index % 2 ? `question-${index + 1}\nbody-${index + 1}` : `greeting-${index + 1}`,
  created_at: "2026-11-09T00:00:00.000Z",
  category: index % 2 ? "question" : "greeting",
}));

const readJson = async (response) => response.json();

test("greeting feed uses 10-item pages and reports more items correctly", async () => {
  const env = { DB: createDb(records) };
  const first = await readJson(await posts(env, "greeting", null, new URL("https://local.test/api/posts")));
  assert.equal(first.posts.length, 10);
  assert.equal(first.page, 1);
  assert.equal(first.pageSize, 10);
  assert.equal(first.total, 12);
  assert.equal(first.hasMore, true);

  const second = await readJson(await posts(env, "greeting", null, new URL("https://local.test/api/posts?page=2&limit=10")));
  assert.equal(second.posts.length, 2);
  assert.equal(second.hasMore, false);
});

test("question pagination preserves title/body fields and supports page navigation", async () => {
  const env = { DB: createDb(records) };
  const page2 = await readJson(await posts(env, "question", null, new URL("https://local.test/api/questions?page=2&limit=4")));
  assert.equal(page2.page, 2);
  assert.equal(page2.total, 11);
  assert.equal(page2.totalPages, 3);
  assert.equal(page2.posts.length, 4);
  assert.match(page2.posts[0].title, /^question-/);
  assert.match(page2.posts[0].body, /^body-/);
});

test("my-post pagination filters by user and clamps invalid limits", async () => {
  const env = { DB: createDb(records) };
  const result = await readJson(await posts(env, "question", 2, new URL("https://local.test/api/me/posts?page=0&limit=1000")));
  assert.equal(result.page, 1);
  assert.equal(result.pageSize, 50);
  assert.equal(result.total, 11);
  assert.ok(result.posts.every((post) => post.user_id === 2));
});

test("out-of-range pages clamp to the final page and empty lists stay on page one", async () => {
  const env = { DB: createDb(records) };
  const pastEnd = await readJson(await posts(env, "greeting", null, new URL("https://local.test/api/posts?page=999&limit=10")));
  assert.equal(pastEnd.page, 2);
  assert.equal(pastEnd.posts.length, 2);
  assert.equal(pastEnd.hasMore, false);

  const empty = await readJson(await posts({ DB: createDb([]) }, "greeting", null, new URL("https://local.test/api/posts?page=99")));
  assert.equal(empty.page, 1);
  assert.equal(empty.total, 0);
  assert.equal(empty.totalPages, 0);
  assert.equal(empty.hasMore, false);
});

test("both board pagination controls and skeleton styles are wired into the page", async () => {
  const html = await fs.readFile(new URL("../public/index.html", import.meta.url), "utf8");
  const script = await fs.readFile(new URL("../public/script.js", import.meta.url), "utf8");
  const style = await fs.readFile(new URL("../public/style.css", import.meta.url), "utf8");

  assert.match(html, /id="post-pagination"/);
  assert.match(html, /id="question-pagination"/);
  assert.match(script, /renderListSkeleton\(postList, "greeting"\)/);
  assert.match(script, /renderListSkeleton\(questionList, "question"\)/);
  assert.match(style, /\.post-skeleton/);
  assert.match(style, /\.page-button/);
  assert.match(style, /\.load-more-button/);
});