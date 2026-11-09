import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { createPost, mutate, posts } from "../src/worker.js";

const makeRequest = (body) => new Request("https://local.test/api/questions", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

const createDb = ({ existing = [], insertMeta = { last_row_id: 101 } } = {}) => {
  const calls = [];
  return {
    calls,
    prepare(sql) {
      const statement = {
        values: [],
        bind(...values) { this.values = values; return this; },
        async run() { calls.push({ sql, values: this.values }); return { meta: insertMeta }; },
        async first() { return { total: existing.length }; },
        async all() { return { results: existing }; },
      };
      return statement;
    },
  };
};

test("question creation normalizes title newlines and stores title/body separately", async () => {
  const DB = createDb();
  const response = await createPost(makeRequest({ title: "첫 번째 줄\n두 번째 줄", content: "본문 첫째 줄\n본문 둘째 줄" }), { DB }, "question", { id: 9, nickname: "테스터" });
  const body = await response.json();
  assert.equal(response.status, 201);
  assert.equal(body.question.title, "첫 번째 줄 두 번째 줄");
  assert.equal(body.question.content, "본문 첫째 줄\n본문 둘째 줄");
  assert.equal(body.question.body, "본문 첫째 줄\n본문 둘째 줄");
  assert.deepEqual(DB.calls[0].values, [9, "테스터", "본문 첫째 줄\n본문 둘째 줄", "첫 번째 줄 두 번째 줄", body.question.created_at, "question"]);
});

test("question edits update title and body independently after title normalization", async () => {
  const calls = [];
  const DB = {
    prepare(sql) {
      return {
        values: [],
        bind(...values) { this.values = values; return this; },
        async first() { return { id: 5, user_id: 9, title: "old title", content: "old body" }; },
        async run() { calls.push({ sql, values: this.values }); return { success: true }; },
      };
    },
  };
  const request = new Request("https://local.test/api/questions/5", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ title: "새 제목\n이어지는 제목", content: "본문\n두 번째 문단" }),
  });
  const response = await mutate(request, { DB }, "/api/questions/5", { id: 9 });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.title, "새 제목 이어지는 제목");
  assert.equal(body.content, "본문\n두 번째 문단");
  assert.match(calls[0].sql, /SET title=\?,content=\?/);
  assert.deepEqual(calls[0].values, ["새 제목 이어지는 제목", "본문\n두 번째 문단", 5, 9]);
});

test("question title containing only line breaks is rejected", async () => {
  const response = await createPost(makeRequest({ title: "\n\r\n", content: "본문" }), { DB: createDb() }, "question", { id: 9, nickname: "테스터" });
  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /제목/);
});

test("question list returns separate columns and falls back for pre-migration records", async () => {
  const rows = [
    { id: 1, user_id: 9, nickname: "테스터", content: "본문\n줄2", title: "질문 제목", created_at: "2026-11-09", category: "question" },
    { id: 2, user_id: 9, nickname: "테스터", content: "구형 제목\n구형 본문", title: null, created_at: "2026-11-08", category: "question" },
  ];
  const DB = createDb({ existing: rows });
  const response = await posts({ DB }, "question", null, new URL("https://local.test/api/questions"));
  const body = await response.json();
  assert.equal(body.posts[0].title, "질문 제목");
  assert.equal(body.posts[0].body, "본문\n줄2");
  assert.equal(body.posts[1].title, "구형 제목");
  assert.equal(body.posts[1].body, "구형 본문");
});

test("migration backfills legacy question title and body without splitting greeting posts", async () => {
  const migration = await fs.readFile(new URL("../migrations/0004_separate_question_title.sql", import.meta.url), "utf8");
  assert.match(migration, /ALTER TABLE posts ADD COLUMN title TEXT/);
  assert.match(migration, /category = 'question'/);
  assert.match(migration, /instr\(content, char\(10\)\)/);
  assert.match(migration, /ELSE content/);
});