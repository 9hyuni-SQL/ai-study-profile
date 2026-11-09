"""SNS scheduled-post dry-run simulator. Never reads tokens or publishes."""

from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse


MAX_IMAGE_BYTES = 8 * 1024 * 1024
INSTAGRAM_MAX_CHARS = 2_200
THREADS_MAX_CHARS = 500
ALLOWED_IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png", ".webp"}


def parse_datetime(value: object, field: str, errors: list[str]) -> datetime | None:
    if value is None or value == "":
        return None
    if not isinstance(value, str):
        errors.append(f"{field}: ISO 8601 문자열이어야 합니다.")
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        errors.append(f"{field}: 올바른 ISO 8601 날짜/시간이 아닙니다.")
        return None
    if parsed.tzinfo is None:
        errors.append(f"{field}: 시간대가 포함되어야 합니다(예: +09:00 또는 Z).")
        return None
    return parsed.astimezone(timezone.utc)


def validate_image(image: object, errors: list[str]) -> dict | None:
    if image is None:
        return None
    if not isinstance(image, dict):
        errors.append("image: 객체여야 하며 path, url, bytes, content_type 중 필요한 필드를 포함해야 합니다.")
        return None

    path_value = image.get("path")
    image_path: Path | None = None
    url_value = image.get("url")
    has_public_url = isinstance(url_value, str) and bool(url_value.strip())
    if path_value is not None:
        if not isinstance(path_value, str) or not path_value.strip():
            errors.append("image.path: 비어 있지 않은 파일 경로여야 합니다.")
        else:
            image_path = Path(path_value)
            if not image_path.is_file():
                if not has_public_url:
                    errors.append(f"image.path: 파일을 찾을 수 없습니다: {path_value}")
                else:
                    image_path = None
            elif image_path.suffix.lower() not in ALLOWED_IMAGE_SUFFIXES:
                errors.append("image.path: JPG, JPEG, PNG 또는 WebP 파일이어야 합니다.")

    if url_value is not None:
        if not isinstance(url_value, str):
            errors.append("image.url: 문자열이어야 합니다.")
        else:
            parsed_url = urlparse(url_value)
            if parsed_url.scheme != "https" or not parsed_url.netloc:
                errors.append("image.url: Meta가 가져갈 수 있는 HTTPS 공개 URL이어야 합니다.")

    size = image.get("bytes")
    if size is None and image_path is not None and image_path.is_file():
        size = image_path.stat().st_size
    if size is not None:
        if not isinstance(size, int) or isinstance(size, bool) or size <= 0:
            errors.append("image.bytes: 양의 정수 바이트 수여야 합니다.")
        elif size > MAX_IMAGE_BYTES:
            errors.append("image: 파일이 8MB를 초과합니다.")

    content_type = image.get("content_type")
    if content_type is not None and content_type not in {
        "image/jpeg",
        "image/png",
        "image/webp",
    }:
        errors.append("image.content_type: JPEG, PNG 또는 WebP 형식이어야 합니다.")

    width = image.get("width")
    height = image.get("height")
    if width is not None or height is not None:
        if not (
            isinstance(width, int)
            and not isinstance(width, bool)
            and width > 0
            and isinstance(height, int)
            and not isinstance(height, bool)
            and height > 0
        ):
            errors.append("image.width/height: 둘 다 양의 정수 픽셀 값이어야 합니다.")

    return {
        "path": str(image_path) if image_path else None,
        "url": url_value,
        "bytes": size,
        "content_type": content_type,
        "width": width,
        "height": height,
    }


def simulate_post(post: object, now: datetime) -> dict:
    errors: list[str] = []
    warnings: list[str] = []

    if not isinstance(post, dict):
        return {"ok": False, "errors": ["post: JSON 객체여야 합니다."]}

    nickname = post.get("nickname")
    if not isinstance(nickname, str) or not 1 <= len(nickname.strip()) <= 30:
        errors.append("nickname: 1~30자 닉네임이 필요합니다(로컬 API가 요구함).")

    content = post.get("content")
    if not isinstance(content, str) or not content.strip():
        errors.append("content: 비어 있지 않은 본문이 필요합니다.")
        content = ""
    elif len(content.strip()) > 1_000:
        errors.append("content: 로컬 게시판 제한인 1,000자를 초과합니다.")

    channels = post.get("channels", [])
    if not isinstance(channels, list) or any(
        channel not in {"threads", "instagram"} for channel in channels
    ):
        errors.append("channels: threads 및 instagram 중 하나 이상을 배열로 지정해야 합니다.")
        channels = []
    channels = sorted(set(channels))
    if not channels:
        errors.append("channels: 게시할 채널을 하나 이상 선택해야 합니다.")

    image = validate_image(post.get("image"), errors)
    mode = post.get("mode", "immediate")
    if mode not in {"immediate", "scheduled"}:
        errors.append("mode: immediate 또는 scheduled여야 합니다.")
        mode = "invalid"

    scheduled_at = parse_datetime(post.get("scheduled_at"), "scheduled_at", errors)
    if mode == "scheduled" and scheduled_at is None:
        errors.append("mode=scheduled인 경우 scheduled_at이 필요합니다.")
    if mode == "immediate" and post.get("scheduled_at") not in (None, ""):
        warnings.append("즉시 발행 모드에서는 scheduled_at을 사용하지 않습니다.")

    if "threads" in channels:
        if len(content) > THREADS_MAX_CHARS:
            warnings.append(
                f"Threads 본문이 {THREADS_MAX_CHARS}자를 초과합니다. 현재 서버는 440자 이후를 자르는 로직이 있습니다."
            )
        if not post.get("threads_token_configured", False):
            warnings.append("Threads 토큰 설정 여부가 입력되지 않았습니다. 토큰 값은 읽거나 검사하지 않습니다.")

    if "instagram" in channels:
        if not image:
            errors.append("Instagram 발행에는 이미지가 필수입니다.")
        elif image.get("width") and image.get("height"):
            ratio = image["width"] / image["height"]
            if not 0.8 <= ratio <= 1.91:
                errors.append("Instagram 이미지 비율이 4:5~1.91:1 범위를 벗어납니다.")
        if not post.get("instagram_token_configured", False):
            warnings.append("Instagram 토큰 설정 여부가 입력되지 않았습니다. 토큰 값은 읽거나 검사하지 않습니다.")

    due = mode == "immediate" or (scheduled_at is not None and scheduled_at <= now)
    return {
        "ok": not errors,
        "would_publish": bool(not errors and due),
        "mode": mode,
        "due_now": due,
        "channels": channels,
        "nickname": nickname.strip() if isinstance(nickname, str) else None,
        "content_characters": len(content),
        "scheduled_at_utc": scheduled_at.isoformat() if scheduled_at else None,
        "image": image,
        "errors": errors,
        "warnings": warnings,
        "safety": "SIMULATION ONLY: no token loading, network requests, database writes, or publishing.",
    }


def main() -> int:
    parser = argparse.ArgumentParser(
        description="SNS 발행 시나리오를 검증하는 읽기 전용 모의 실행기(실제 게시하지 않음)."
    )
    parser.add_argument("scenario", type=Path, help="검증할 JSON 시나리오 파일")
    parser.add_argument(
        "--now",
        help="예약 판단 기준 시각(ISO 8601, 기본값은 현재 UTC)",
    )
    args = parser.parse_args()

    try:
        raw = json.loads(args.scenario.read_text(encoding="utf-8"))
    except OSError as exc:
        print(json.dumps({"ok": False, "error": f"시나리오 파일을 읽지 못했습니다: {exc}"}, ensure_ascii=False, indent=2))
        return 2
    except json.JSONDecodeError as exc:
        print(json.dumps({"ok": False, "error": f"JSON 형식 오류: {exc}"}, ensure_ascii=False, indent=2))
        return 2

    now = datetime.now(timezone.utc)
    if args.now:
        parsed_now = parse_datetime(args.now, "--now", [])
        if parsed_now is None:
            print(json.dumps({"ok": False, "error": "--now는 시간대가 포함된 ISO 8601 형식이어야 합니다."}, ensure_ascii=False, indent=2))
            return 2
        now = parsed_now

    report = simulate_post(raw, now)
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())