# SENIOR AI 2.0 · AI 인생동행

배포된 서비스는 [ai-study-profile.9hyuni.workers.dev](https://ai-study-profile.9hyuni.workers.dev)에서 확인할 수 있습니다. 시니어의 현장 경험을 기록하고 세대 간 학습과 협업을 돕는 웹 플랫폼이며, 서버리스 엣지 환경에서 안정적으로 동작합니다.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Cloudflare%20Workers-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)](https://ai-study-profile.9hyuni.workers.dev)
[![GitHub License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

---

## 서비스 배포 링크

운영 중인 서비스 접속 주소는 다음과 같습니다. Cloudflare 글로벌 엣지 네트워크를 통해 SSL 암호화 및 무중단 서빙이 적용되어 있습니다.

- **프로덕션 서비스 주소**: [https://ai-study-profile.9hyuni.workers.dev](https://ai-study-profile.9hyuni.workers.dev)
- **API 및 정적 자산 경로**: Cloudflare Workers + Workers Static Assets (`public/`) 통합 서빙

---

## 로컬 개발 및 테스트 방법

로컬 개발 환경은 Cloudflare Wrangler CLI를 사용해 프로덕션과 동일한 Workers 및 D1 환경으로 구동합니다. Node.js 20 이상 버전이 필요합니다.

PowerShell 터미널에서 아래 명령을 차례대로 실행합니다.

```powershell
# 1. 로컬 D1 데이터베이스 마이그레이션 적용
npx wrangler d1 migrations apply ai-study-profile-db --local --config .\wrangler.jsonc

# 2. 로컬 테스트용 세션 비밀키 생성 및 .dev.vars 등록
$secret = node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
Set-Content -Path .dev.vars -Value "SESSION_SECRET=$secret" -Encoding ascii

# 3. 로컬 개발 서버 실행
npx wrangler dev
```

서버가 구동되면 브라우저에서 `http://localhost:8787/`로 접속합니다. 로컬 전용 설정 파일인 `.dev.vars`는 저장소에 커밋되지 않도록 주의합니다.

단위 및 E2E 무결성 검증은 아래 스크립트로 실행합니다.

```powershell
node tests/issue9-security-headers.test.js
node tests/issue8-pagination.test.js
node tests/lazy-comments.test.js
node tests/issue10-question-title.test.js
```

---

## 클라우드 배포 방법

배포는 Cloudflare D1 원격 스키마를 갱신한 뒤 Worker 코드를 프로덕션에 반영하는 순서로 진행합니다. `wrangler.jsonc`에 정의된 바인딩 정보와 Cloudflare 계정 권한을 먼저 점검합니다.

```powershell
# 1. 원격 프로덕션 D1 데이터베이스 마이그레이션 적용
npx wrangler d1 migrations apply ai-study-profile-db --remote --config .\wrangler.jsonc

# 2. 프로덕션 환경 세션 암호화 키 등록 (최초 1회 또는 키 갱신 시)
npx wrangler secret put SESSION_SECRET

# 3. 프로덕션 엣지 네트워크 배포
npx wrangler deploy
```

배포가 끝나면 [운영 사이트](https://ai-study-profile.9hyuni.workers.dev)에 접속해 HTTP 200 응답과 보안 헤더(HSTS, CSP, X-Frame-Options)가 정상 적용되었는지 확인합니다.

---

## 프로젝트 아키텍처 및 파일 구성

정적 자산은 `public/` 디렉터리를 단일 정본으로 관리하며, API와 비즈니스 로직은 `src/worker.js`에서 처리합니다.

- **`src/worker.js`**: 사용자 인증, 세션 쿠키 발급, D1 질의, 보안 헤더 및 댓글 일괄 처리 API
- **`public/`**: 프런트엔드 정적 웹 리소스 정본
  - `index.html`: 메인 마크업 및 시맨틱 레이아웃
  - `style.css`: 시니어 친화적 고대비 UI, 반응형 그리드 및 스켈레톤 로딩 애니메이션
  - `script.js`: 비동기 API 통신, 무한 스크롤 더보기 및 번호 페이지네이션 제어
  - `images/`: LCP 최적화된 시각 자료
- **`migrations/`**: D1 관계형 데이터베이스 스키마 및 데이터 마이그레이션 SQL
- **`tests/`**: 보안 헤더, 페이지네이션, 지연 로딩, 제목 분리 단위 테스트 스위트

---

## 주요 기능 및 UX 최적화

사용자 접근성과 응답 속도를 높이기 위해 다음과 같은 최적화 기법을 적용했습니다.

- **맞춤형 목록 탐색 방식 분리**:
  - **가입인사 게시판**: 피드 탐색 흐름을 유지할 수 있도록 10건 단위 '더보기(무한 스크롤형)' 방식 적용
  - **지혜 검증소 게시판**: 특정 글을 정확히 찾아갈 수 있도록 직관적인 '번호 페이지네이션' 방식 적용
- **로딩 스켈레톤 UI**: 네트워크 지연 구간에서 레이아웃 이동(CLS)을 방지하고 시각적 안정감을 주는 쉬머 애니메이션 적용
- **댓글 지연 로딩 (Lazy Load)**: 불필요한 초기 데이터 요청을 막고 사용자가 '댓글 열기'를 누를 때만 동적으로 로드
- **클라우드플레어 보안 가드레일**: 엄격한 Content Security Policy(CSP), HSTS, CSRF 방어용 HttpOnly 세션 쿠키 체계 구축

---

## 분석 및 전환 측정

**Google Analytics 4와 Google Tag Manager는 분석 동의 후에만 로드됩니다.** 동의 전에는 Consent Mode v2의 `analytics_storage`, 광고 관련 동의(`ad_storage`, `ad_user_data`, `ad_personalization`)를 `denied`로 설정하고 GTM/GA 태그를 로드하지 않습니다. 방문자는 하단 배너에서 동의하거나 거부할 수 있으며, 푸터의 개인정보·분석 설정에서 선택을 변경할 수 있습니다.

- GA4 Measurement ID: `G-0HFX4KE2GH`
- GTM Container ID: `GTM-PQQFR7KV`
- GTM Custom Event: `site_conversion`; 변수 `conversion_name` 값은 `sign_up`, `login`, `greeting_submit`, `question_submit`입니다.
- GA4에는 동일한 이름의 표준 이벤트가 동의 후 직접 전송됩니다. GTM에서 GA4 이벤트 태그를 추가한다면 같은 이벤트를 다시 전송하지 않아 중복 집계를 피하세요.
- 이벤트에는 이메일, 닉네임, 질문·게시글 내용 등 개인정보를 넣지 않습니다.

Google Tag Manager 컨테이너에는 `site_conversion` Custom Event Trigger를 만들어 필요한 추가 태그에 연결할 수 있습니다. GA4 전환으로 보고 싶은 이벤트는 Analytics 관리 화면에서 해당 이벤트를 key event로 표시하세요. 개인정보 처리방침에 Google Analytics 사용, 처리 목적, 동의 철회 방법을 반영한 뒤 배포해야 합니다.

## 기여 및 라이선스

버그 제보와 기술적인 개선 제안은 [GitHub Issues](https://github.com/9hyuni-SQL/ai-study-profile/issues)를 이용해 주시기 바랍니다. 이 프로젝트는 MIT 라이선스에 따라 자유롭게 수정 및 배포할 수 있습니다. 자세한 내용은 [`LICENSE`](LICENSE) 파일을 참조하세요.
