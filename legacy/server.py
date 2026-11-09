"""Serve the profile and guestbook API backed by a local SQLite database."""

from __future__ import annotations

import hashlib
import hmac
import json
import os
import secrets
import sqlite3
import threading
from datetime import datetime, timezone
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit


WEB_ROOT = Path(__file__).resolve().parent
DATABASE_PATH = WEB_ROOT.parent / "lilypage.sqlite3"
MAX_BODY_BYTES = 16_384
PASSWORD_ITERATIONS = 310_000


def connect_database() -> sqlite3.Connection:
    connection = sqlite3.connect(DATABASE_PATH, timeout=10)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


def initialize_database() -> None:
    with connect_database() as database:
        database.execute("PRAGMA journal_mode = WAL")
        database.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT NOT NULL COLLATE NOCASE UNIQUE,
                password_hash TEXT NOT NULL,
                nickname TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )
        database.execute(
            """
            CREATE TABLE IF NOT EXISTS posts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nickname TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )
        post_columns = {
            row[1] for row in database.execute("PRAGMA table_info(posts)").fetchall()
        }
        if "category" not in post_columns:
            database.execute(
                "ALTER TABLE posts ADD COLUMN category TEXT NOT NULL DEFAULT 'greeting'"
            )
        database.execute(
            """
            CREATE TABLE IF NOT EXISTS comments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                post_id INTEGER NOT NULL,
                nickname TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
            )
            """
        )
        database.execute(
            "CREATE INDEX IF NOT EXISTS idx_posts_category_id ON posts(category, id DESC)"
        )
        database.execute(
            "CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id, id)"
        )
        question_count = database.execute(
            "SELECT COUNT(*) FROM posts WHERE category = 'question'"
        ).fetchone()[0]
        if question_count == 0:
            examples = [
                (
                    "박민준",
                    "AI 답변을 더 정확하게 받으려면 어떻게 질문해야 하나요?",
                    "막연하게 질문했더니 답변도 두루뭉술했어요. 프롬프트에 어떤 정보를 넣으면 도움이 될까요?",
                    "송구현",
                    "목표, 필요한 맥락, 결과 형식, 지켜야 할 조건을 구체적으로 나누어 적어 보세요. 한 번에 완벽하게 쓰기보다 답을 확인하고 조건을 보완하는 방식으로 대화를 이어가는 것도 좋습니다.",
                ),
                (
                    "정유나",
                    "AI가 알려준 내용이 맞는지 확인하려면요?",
                    "AI가 자신 있게 답해도 틀린 정보가 있을 수 있다고 들었어요. 수업에서 안전하게 활용하는 방법이 궁금합니다.",
                    "송구현",
                    "중요한 사실은 공식 문서나 신뢰할 수 있는 원문과 대조해 보세요. 최신 정보, 숫자, 출처는 특히 확인하고, AI의 답은 최종 사실이 아니라 검토할 초안으로 활용하는 편이 안전합니다.",
                ),
                (
                    "최준서",
                    "처음 만드는 AI 자동화 프로젝트는 무엇부터 시작할까요?",
                    "AI로 반복 작업을 줄여보고 싶지만 처음부터 큰 프로젝트를 잡으면 어려울 것 같아요. 작게 시작하는 방법을 추천해 주세요!",
                    "송구현",
                    "먼저 매주 반복하는 일 하나를 정하고, 입력과 원하는 결과를 간단히 적어 보세요. 처음에는 AI에게 초안을 만들게 한 다음 직접 확인하는 작은 단계 하나만 자동화하면 부담이 적고 효과도 확인하기 쉽습니다.",
                ),
            ]
            for author, title, body, responder, answer in examples:
                cursor = database.execute(
                    "INSERT INTO posts (nickname, content, created_at, category) "
                    "VALUES (?, ?, ?, 'question')",
                    (author, f"{title}\n{body}", datetime.now(timezone.utc).isoformat()),
                )
                database.execute(
                    "INSERT INTO comments (post_id, nickname, content, created_at) "
                    "VALUES (?, ?, ?, ?)",
                    (cursor.lastrowid, responder, answer, datetime.now(timezone.utc).isoformat()),
                )
        post_count = database.execute("SELECT COUNT(*) FROM posts").fetchone()[0]
        greeting_count = database.execute(
            "SELECT COUNT(*) FROM posts WHERE category = 'greeting'"
        ).fetchone()[0]
        if greeting_count == 0:
            samples = [
                (
                    "AI 공부하는 민수",
                    "AI를 배우면서 직접 만든 것을 공유하는 모습이 멋져요. 저도 수업 내용을 하나씩 실습해 볼게요!",
                ),
                (
                    "프롬프트 연습생",
                    "프롬프트를 어떻게 작성하면 원하는 결과를 얻는지 궁금해요. 다음 학습 노트도 기대합니다.",
                ),
                (
                    "호기심 많은 지우",
                    "안녕하세요 :) AI로 아이디어를 직접 만들어 보는 수업이라니 흥미로워요. 함께 배워가요!",
                ),
            ]
            for nickname, content in samples:
                database.execute(
                    "INSERT INTO posts (nickname, content, created_at, category) "
                    "VALUES (?, ?, ?, 'greeting')",
                    (nickname, content, datetime.now(timezone.utc).isoformat()),
                )


initialize_database()


class SiteHandler(SimpleHTTPRequestHandler):
    """Handle static profile assets and the guestbook's SQLite API."""

    server_version = "LittlePage/1.0"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(WEB_ROOT), **kwargs)

    def end_headers(self):
        path = self.path.split("?")[0]
        if path.endswith((".js", ".html", ".css")) or path == "/":
            self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        elif path.endswith(".mp3"):
            self.send_header("Cache-Control", "public, max-age=3600")
        super().end_headers()

    def remove_post_and_comments(self, database: sqlite3.Connection, post_id: int) -> None:
        if database.execute(
            "SELECT 1 FROM posts WHERE id = ? AND category = 'question'",
            (post_id,),
        ).fetchone() is not None:
            database.execute("DELETE FROM comments WHERE post_id = ?", (post_id,))
            database.execute("DELETE FROM posts WHERE id = ?", (post_id,))

    def send_json(self, status: int, payload: dict) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def read_json(self) -> dict | None:
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except (ValueError, TypeError):
            self.send_json(400, {"error": "요청 형식을 확인해 주세요."})
            return None

        if length < 1 or length > MAX_BODY_BYTES:
            self.send_json(413, {"error": "요청 데이터가 없거나 너무 큽니다."})
            return None

        if "application/json" not in self.headers.get("Content-Type", "").lower():
            self.send_json(415, {"error": "JSON 형식으로 요청해 주세요."})
            return None

        try:
            payload = json.loads(self.rfile.read(length).decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            self.send_json(400, {"error": "올바른 JSON 형식이 아닙니다."})
            return None

        if not isinstance(payload, dict):
            self.send_json(400, {"error": "올바른 요청 형식이 아닙니다."})
            return None
        return payload

    def do_GET(self) -> None:
        route = urlsplit(self.path)
        if route.path.startswith("/api/posts/") and route.path.endswith("/comments"):
            self.list_comments(route.path)
            return
        if route.path not in ("/api/posts", "/api/questions"):
            if route.path.startswith("/api/"):
                self.send_json(404, {"error": "요청한 API를 찾을 수 없습니다."})
                return
            super().do_GET()
            return

        try:
            category = "question" if route.path == "/api/questions" else "greeting"
            with connect_database() as database:
                rows = database.execute(
                    "SELECT id, nickname, content, created_at, category "
                    "FROM posts WHERE category = ? ORDER BY id DESC LIMIT 50",
                    (category,),
                ).fetchall()
            self.send_json(
                200,
                {
                    "posts": [
                        {
                            "id": row["id"],
                            "nickname": row["nickname"],
                            "content": row["content"],
                            "created_at": row["created_at"],
                            "category": row["category"],
                            "title": row["content"].split("\n", 1)[0]
                            if row["category"] == "question"
                            else None,
                            "body": row["content"].split("\n", 1)[1]
                            if row["category"] == "question" and "\n" in row["content"]
                            else row["content"]
                            if row["category"] == "question"
                            else None,
                        }
                        for row in rows
                    ]
                },
            )
        except sqlite3.Error:
            self.send_json(500, {"error": "게시글을 불러오지 못했습니다."})

    def do_POST(self) -> None:
        route = urlsplit(self.path).path
        if route.startswith("/api/posts/") and route.endswith("/comments"):
            self.create_comment(route)
            return
        if route not in ("/api/posts", "/api/questions", "/api/users"):
            self.send_json(404, {"error": "요청한 API를 찾을 수 없습니다."})
            return

        payload = self.read_json()
        if payload is None:
            return

        if route == "/api/questions":
            self.create_question(payload)
        elif route == "/api/posts":
            self.create_post(payload)
        else:
            self.create_user(payload)

    def create_question(self, payload: dict) -> None:
        nickname = payload.get("nickname")
        title = payload.get("title")
        content = payload.get("content")
        if not isinstance(nickname, str) or not 1 <= len(nickname.strip()) <= 30:
            self.send_json(400, {"error": "닉네임을 1~30자 사이로 입력해 주세요."})
            return
        if not isinstance(title, str) or not 1 <= len(title.strip()) <= 120:
            self.send_json(400, {"error": "질문 제목을 1~120자 사이로 입력해 주세요."})
            return
        if not isinstance(content, str) or not 1 <= len(content.strip()) <= 2000:
            self.send_json(400, {"error": "질문 내용을 1~2,000자 사이로 입력해 주세요."})
            return

        nickname, title, content = nickname.strip(), title.strip(), content.strip()
        if any(
            ord(character) < 32 and character not in "\n\r\t"
            for character in nickname + title + content
        ):
            self.send_json(400, {"error": "입력에 허용되지 않는 제어 문자가 있습니다."})
            return

        created_at = datetime.now(timezone.utc).isoformat()
        try:
            with connect_database() as database:
                cursor = database.execute(
                    "INSERT INTO posts (nickname, content, created_at, category) "
                    "VALUES (?, ?, ?, 'question')",
                    (nickname, f"{title}\n{content}", created_at),
                )
                question_id = cursor.lastrowid
        except sqlite3.Error:
            self.send_json(500, {"error": "질문을 저장하지 못했습니다."})
            return

        self.send_json(
            201,
            {
                "question": {
                    "id": question_id,
                    "nickname": nickname,
                    "title": title,
                    "content": content,
                    "created_at": created_at,
                    "category": "question",
                }
            },
        )
    def create_post(self, payload: dict) -> None:
        nickname = payload.get("nickname")
        content = payload.get("content")
        if not isinstance(nickname, str) or not 1 <= len(nickname.strip()) <= 30:
            self.send_json(400, {"error": "닉네임을 1~30자 사이로 입력해 주세요."})
            return
        if not isinstance(content, str) or not 1 <= len(content.strip()) <= 1000:
            self.send_json(400, {"error": "내용을 1~1,000자 사이로 입력해 주세요."})
            return

        nickname = nickname.strip()
        content = content.strip()
        if any(ord(character) < 32 and character not in "\n\r\t" for character in nickname + content):
            self.send_json(400, {"error": "입력에 허용되지 않는 제어 문자가 있습니다."})
            return

        created_at = datetime.now(timezone.utc).isoformat()
        try:
            with connect_database() as database:
                cursor = database.execute(
                    "INSERT INTO posts (nickname, content, created_at, category) "
                    "VALUES (?, ?, ?, 'greeting')",
                    (nickname, content, created_at),
                )
                post_id = cursor.lastrowid
        except sqlite3.Error:
            self.send_json(500, {"error": "게시글을 저장하지 못했습니다."})
            return

        self.send_json(
            201,
            {
                "post": {
                    "id": post_id,
                    "nickname": nickname,
                    "content": content,
                    "created_at": created_at,
                    "category": "greeting",
                }
            },
        )

    @staticmethod
    def parse_post_id(route: str) -> int | None:
        post_id_text = route.removeprefix("/api/posts/").removesuffix("/comments")
        try:
            post_id = int(post_id_text)
        except ValueError:
            return None
        return post_id if post_id > 0 else None

    def list_comments(self, route: str) -> None:
        post_id = self.parse_post_id(route)
        if post_id is None:
            self.send_json(400, {"error": "올바른 게시글 번호가 아닙니다."})
            return

        try:
            with connect_database() as database:
                if database.execute("SELECT 1 FROM posts WHERE id = ?", (post_id,)).fetchone() is None:
                    self.send_json(404, {"error": "게시글을 찾을 수 없습니다."})
                    return
                rows = database.execute(
                    "SELECT id, post_id, nickname, content, created_at "
                    "FROM comments WHERE post_id = ? ORDER BY id ASC",
                    (post_id,),
                ).fetchall()
            self.send_json(
                200,
                {
                    "comments": [
                        {
                            "id": row["id"],
                            "post_id": row["post_id"],
                            "nickname": row["nickname"],
                            "content": row["content"],
                            "created_at": row["created_at"],
                        }
                        for row in rows
                    ]
                },
            )
        except sqlite3.Error:
            self.send_json(500, {"error": "댓글을 불러오지 못했습니다."})

    def create_comment(self, route: str) -> None:
        post_id = self.parse_post_id(route)
        if post_id is None:
            self.send_json(400, {"error": "올바른 게시글 번호가 아닙니다."})
            return

        payload = self.read_json()
        if payload is None:
            return

        nickname = payload.get("nickname")
        content = payload.get("content")
        if not isinstance(nickname, str) or not 1 <= len(nickname.strip()) <= 30:
            self.send_json(400, {"error": "닉네임을 1~30자 사이로 입력해 주세요."})
            return
        if not isinstance(content, str) or not 1 <= len(content.strip()) <= 500:
            self.send_json(400, {"error": "댓글을 1~500자 사이로 입력해 주세요."})
            return

        nickname = nickname.strip()
        content = content.strip()
        if any(
            ord(character) < 32 and character not in "\n\r\t"
            for character in nickname + content
        ):
            self.send_json(400, {"error": "입력에 허용되지 않는 제어 문자가 있습니다."})
            return

        created_at = datetime.now(timezone.utc).isoformat()
        try:
            with connect_database() as database:
                if database.execute(
                    "SELECT 1 FROM posts WHERE id = ?", (post_id,)
                ).fetchone() is None:
                    self.send_json(404, {"error": "게시글을 찾을 수 없습니다."})
                    return
                cursor = database.execute(
                    "INSERT INTO comments (post_id, nickname, content, created_at) "
                    "VALUES (?, ?, ?, ?)",
                    (post_id, nickname, content, created_at),
                )
                comment_id = cursor.lastrowid
        except sqlite3.Error:
            self.send_json(500, {"error": "댓글을 저장하지 못했습니다."})
            return

        self.send_json(
            201,
            {
                "comment": {
                    "id": comment_id,
                    "post_id": post_id,
                    "nickname": nickname,
                    "content": content,
                    "created_at": created_at,
                }
            },
        )

class Server(ThreadingHTTPServer):
    allow_reuse_address = True
    daemon_threads = True


if __name__ == "__main__":
    host = os.environ.get("LITTLEPAGE_HOST", "127.0.0.1")
    port = int(os.environ.get("LITTLEPAGE_PORT", "8081"))
    httpd = Server((host, port), SiteHandler)
    print(f"자기소개 페이지와 SQLite 게시판: http://localhost:{port}/", flush=True)
    print(f"SQLite 데이터베이스: {DATABASE_PATH}", flush=True)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        httpd.server_close()