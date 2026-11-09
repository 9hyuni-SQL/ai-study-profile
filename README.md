# SENIOR AI 2.0 · AI 인생동행

**배포된 서비스는 [ai-study-profile.9hyuni.workers.dev](https://ai-study-profile.9hyuni.workers.dev)에서 확인할 수 있고, 로컬 개발·테스트는 Cloudflare Wrangler로 실행합니다.** 이 프로젝트는 시니어의 현장 경험을 기록하고 세대 간 학습과 협업을 돕는 한국어 웹 플랫폼입니다.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Cloudflare%20Workers-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)](https://ai-study-profile.9hyuni.workers.dev)
[![GitHub License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

## 개발 방법

**배포 환경과 같은 Cloudflare Worker·D1 구성을 로컬에서 시험하려면 Wrangler를 사용합니다.** 프로젝트 루트에서 Node.js 20 이상과 npm을 준비하세요.

```powershell
npm install --global wrangler
npx wrangler d1 migrations apply ai-study-profile-db --local --config .\wrangler.jsonc
$secret = node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
Set-Content -Path .dev.vars -Value "SESSION_SECRET=$secret" -Encoding ascii
npx wrangler dev
```

로컬 사이트는 기본적으로 `http://localhost:8787/`에서 열립니다. `.dev.vars`는 개발용 비밀값 파일이며 Git에 커밋하지 마세요. 서버를 종료하려면 `Ctrl+C`를 누르세요.

## 배포 방법

**Cloudflare 배포는 먼저 원격 D1 마이그레이션을 적용하고, 세션 비밀값을 Secret으로 등록한 뒤 Wrangler로 배포합니다.** `wrangler.jsonc`의 D1 바인딩과 Cloudflare 계정 접근 권한을 확인하세요.

```powershell
npx wrangler d1 migrations apply ai-study-profile-db --remote --config .\wrangler.jsonc
npx wrangler secret put SESSION_SECRET
npx wrangler deploy
```

Secret 프롬프트에는 예측하기 어려운 긴 임의 문자열을 입력하세요. 실제 비밀값을 채팅, 소스 코드, README 또는 Git에 기록하지 마세요. 배포 후 [라이브 사이트](https://ai-study-profile.9hyuni.workers.dev)를 확인하세요.

## 배포 파일 구성

**Cloudflare Workers는 `wrangler.jsonc`의 `assets.directory`에 지정된 `public/`을 정적 자산 정본으로 배포합니다.** 프런트엔드는 `public/index.html`, `public/style.css`, `public/script.js` 및 `public/images/`의 자산으로 구성됩니다. Worker API는 `src/worker.js`, D1 스키마는 `migrations/`에 있습니다.

과거 로컬 프런트엔드와 실행기 `server.py`, `serve.ps1`은 변경 이력 보존을 위해 `legacy/`에 있습니다. 이 파일들은 현재 개발·배포에 사용하지 않습니다. 정적 자산의 중복 루트 사본은 제거했습니다.

## 핵심 기능

**이 서비스는 시니어의 경험을 정리하고 세대 간 학습과 현장 지혜 검토를 돕습니다.**

- 영화 「인턴」에서 영감을 얻은 시니어·청년 협업 소개와 6단계 AI 학습 로드맵
- 현장 메모를 SOP 형식으로 정리하는 브라우저 기반 변환 시뮬레이터
- 경험 공유 커뮤니티와 현장 지혜 검증소
- Cloudflare Worker와 D1 기반 로그인, 게시글 및 댓글 기능

SOP 변환기는 브라우저에서 입력을 구조화하는 시뮬레이터이며 실제 생성형 AI API를 호출하지 않습니다. 결과는 검토용 초안이므로 실제 작업 전 사내 기준을 확인해야 합니다.

## 기술 스택

**프런트엔드는 바닐라 웹 기술로, 서버와 데이터는 Cloudflare Workers와 D1으로 구성했습니다.**

- HTML5, CSS3, Vanilla JavaScript
- Cloudflare Workers, Workers Static Assets, Cloudflare D1
- Wrangler CLI, D1 SQL migrations, Node.js 20 이상

## 분석 및 전환 측정

**Google Analytics 4와 Google Tag Manager는 분석 동의 후에만 로드됩니다.** 동의 전에는 Consent Mode v2의 `analytics_storage`, 광고 관련 동의(`ad_storage`, `ad_user_data`, `ad_personalization`)를 `denied`로 설정하고 GTM/GA 태그를 로드하지 않습니다. 방문자는 하단 배너에서 동의하거나 거부할 수 있으며, 푸터의 개인정보·분석 설정에서 선택을 변경할 수 있습니다.

- GA4 Measurement ID: `G-0HFX4KE2GH`
- GTM Container ID: `GTM-PQQFR7KV`
- GTM Custom Event: `site_conversion`; 변수 `conversion_name` 값은 `sign_up`, `login`, `greeting_submit`, `question_submit`입니다.
- GA4에는 동일한 이름의 표준 이벤트가 동의 후 직접 전송됩니다. GTM에서 GA4 이벤트 태그를 추가한다면 같은 이벤트를 다시 전송하지 않아 중복 집계를 피하세요.
- 이벤트에는 이메일, 닉네임, 질문·게시글 내용 등 개인정보를 넣지 않습니다.

Google Tag Manager 컨테이너에는 `site_conversion` Custom Event Trigger를 만들어 필요한 추가 태그에 연결할 수 있습니다. GA4 전환으로 보고 싶은 이벤트는 Analytics 관리 화면에서 해당 이벤트를 key event로 표시하세요. 개인정보 처리방침에 Google Analytics 사용, 처리 목적, 동의 철회 방법을 반영한 뒤 배포해야 합니다.

## 기여 및 라이선스

**버그 제보와 개선 제안은 [GitHub Issues](https://github.com/9hyuni-SQL/ai-study-profile/issues)에 남겨 주세요.** 이 저장소는 MIT License로 배포되며 자세한 내용은 [`LICENSE`](LICENSE)를 확인하세요.