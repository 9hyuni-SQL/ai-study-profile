ALTER TABLE posts ADD COLUMN title TEXT;

UPDATE posts
SET title = CASE
  WHEN instr(content, char(10)) > 0 THEN substr(content, 1, instr(content, char(10)) - 1)
  WHEN category = 'question' THEN content
  ELSE NULL
END,
content = CASE
  WHEN category = 'question' AND instr(content, char(10)) > 0
    THEN substr(content, instr(content, char(10)) + 1)
  WHEN category = 'question' THEN ''
  ELSE content
END
WHERE category = 'question';