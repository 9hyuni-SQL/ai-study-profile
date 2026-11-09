# SENIOR AI 2.0 · AI 인생동행

**배포된 서비스는 [ai-study-profile.9hyuni.workers.dev](https://ai-study-profile.9hyuni.workers.dev)에서 확인할 수 있고, 로컬 개발·테스트는 Cloudflare Wrangler로 실행합니다.** 이 프로젝트는 시니어의 현장 경험을 기록하고 세대 간 학습과 협업을 돕는 한국어 웹 플랫폼입니다.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Cloudflare%20Workers-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)](https://ai-study-profile.9hyuni.workers.dev)
[![GitHub License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

## 개발 방법

**배포 환경과 같은 Cloudflare Worker·D1 구성을 로컬에서 시험하려면 Wrangler를 사용합니다.** 프로젝트 루트에서 Node.js 20 이상과 npm을 준비한 뒤 다음 순서로 실행하세요.

```powershell
npm install --global wrangler
npx wrangler d1 migrations apply ai-study-profile-db --local --config .\wrangler.jsonc
```

PowerShell에서 개발용 세션 비밀값 파일을 만들고 로컬 서버를 시작합니다. `.dev.vars`는 로컬 전용이며 커밋하지 마세요.

```powershell
$secret = node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
Set-Content -Path .dev.vars -Value "SESSION_SECRET=$secret" -Encoding ascii
npx wrangler dev
```

로컬 사이트는 기본적으로 `http://localhost:8787/`에서 열립니다. Wrangler가 실행 중인 터미널에서 `Ctrl+C`를 누르면 서버가 종료됩니다.

## 배포 방법

**Cloudflare 배포는 먼저 원격 D1 마이그레이션을 적용하고, 세션 비밀값을 Secret으로 등록한 뒤 Wrangler로 배포합니다.** `wrangler.jsonc`의 `ai-study-profile-db` D1 바인딩과 Cloudflare 계정 접근 권한을 확인하고, 프로젝트 루트에서 실행하세요.

```powershell
npx wrangler d1 migrations apply ai-study-profile-db --remote --config .\wrangler.jsonc
npx wrangler secret put SESSION_SECRET
npx wrangler deploy
```

`SESSION_SECRET`을 입력하라는 프롬프트에는 예측하기 어려운 긴 임의 문자열을 사용합니다. 실제 비밀값은 채팅·소스·README·Git에 기록하지 마세요. 배포 후 `https://ai-study-profile.9hyuni.workers.dev`를 열어 화면과 로그인 흐름을 직접 확인하세요.

## 배포 파일과 로컬 작업 파일

**Cloudflare Workers는 `wrangler.jsonc`의 `assets.directory` 설정에 따라 `public/`만 정적 자산으로 배포합니다.** 배포할 프런트엔드는 `public/index.html`, `public/style.css`, `public/script.js`와 그 안에서 참조하는 `public/images/` 및 관련 자산입니다. Worker API는 `src/worker.js`, D1 스키마는 `migrations/`에 있습니다.

정적 배포 에셋의 정본은 `public/`입니다. 루트의 동일 이미지·음악·회사 소개 페이지·오디오 스크립트 사본은 제거했습니다. 이전 로컬 프런트엔드인 `index.html`, `style.css`, `script.js`와 이전 실행기 `server.py`, `serve.ps1`은 변경 이력을 보존하기 위해 `legacy/`로 옮겼습니다. `legacy/`는 배포되지 않으며 현재 개발·배포에서는 사용하지 마세요.

## 핵심 기능

**이 서비스는 AI 사용법 설명에 그치지 않고, 경험을 정리해 공유하고 검토하는 실무 학습 흐름을 제공합니다.** 주요 화면은 다음과 같습니다.

- 영화 「인턴」에서 영감을 얻은 시니어·청년 세대 협업 소개
- 현장 경험을 SOP 초안 형식으로 정리하는 브라우저 기반 변환 시뮬레이터
- 경험과 다음 도전을 나누는 커뮤니티 및 현장 지혜 검증소
- 로그인, 사용자 게시글 관리, 댓글 기능 (Cloudflare Worker와 D1 사용)

변환기는 현재 브라우저에서 입력을 구조화하는 시뮬레이터이며 실제 생성형 AI API를 호출하지 않습니다. SOP 결과는 검토용 초안으로, 실제 작업 전 사내 안전·품질 기준을 확인해야 합니다.

## 기술 스택

**프런트엔드는 별도 프레임워크 없이 작성했고, 서버와 데이터 저장은 Cloudflare Workers와 D1을 사용합니다.**

- HTML5, CSS3, Vanilla JavaScript
- Cloudflare Workers, Workers Static Assets, Cloudflare D1
- Wrangler CLI, D1 SQL migrations
- Node.js 20 이상 (Wrangler 실행용)

## 기여 및 라이선스

**버그 제보와 개선 제안은 [GitHub Issues](https://github.com/9hyuni-SQL/ai-study-profile/issues)에 남겨 주세요.** 이 저장소는 MIT License로 배포되며 자세한 조건은 [`LICENSE`](LICENSE)를 확인하세요.
