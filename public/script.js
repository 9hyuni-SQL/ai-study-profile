// Smoothly scroll to internal sections while respecting accessibility preferences.
document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener("click", (event) => {
    const target = document.querySelector(link.getAttribute("href"));
    if (!target) return;
    event.preventDefault();
    target.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "start",
    });
  });
});

const postForm = document.getElementById("post-form");
const questionForm = document.getElementById("question-form");
const postAuthorHeader = document.getElementById("post-author-header");
const postAuthorLabel = document.getElementById("post-author-label");
const contentField = document.getElementById("post-content");
const postList = document.getElementById("post-list");
const postCount = document.getElementById("post-count");
const boardStatus = document.getElementById("board-status");
const submitPost = document.getElementById("submit-post");
const refreshPosts = document.getElementById("refresh-posts");
const commentStatus = document.getElementById("comment-status");
const questionAuthorHeader = document.getElementById("question-author-header");
const questionAuthorLabel = document.getElementById("question-author-label");
const questionAiToolField = document.getElementById("question-ai-tool");
const questionTitleField = document.getElementById("question-title");
const questionContentField = document.getElementById("question-content");
const questionAnswerField = document.getElementById("question-answer");
const questionCheckField = document.getElementById("question-check");
const postContentCount = document.getElementById("post-content-count");
const questionTotalCount = document.getElementById("question-total-count");
const questionList = document.getElementById("question-list");
const questionCount = document.getElementById("question-count");
const questionStatus = document.getElementById("question-status");
const submitQuestion = document.getElementById("submit-question");
const refreshQuestions = document.getElementById("refresh-questions");
const authOpen = document.getElementById("auth-open");
const authMenu = document.getElementById("auth-menu");
const authUser = document.getElementById("auth-user");
const authPanel = document.getElementById("auth-panel");
const authTitle = document.getElementById("auth-title");
const authForm = document.getElementById("auth-form");
const authEmail = document.getElementById("auth-email");
const authPassword = document.getElementById("auth-password");
const authNickname = document.getElementById("auth-nickname");
const authNicknameField = document.getElementById("auth-nickname-field");
const authSubmit = document.getElementById("auth-submit");
const authNotice = document.getElementById("auth-notice");
const authSwitchButton = document.getElementById("auth-switch-button");
const authSwitch = document.getElementById("auth-switch");
const authLogout = document.getElementById("auth-logout");
const postAuthHint = document.getElementById("post-auth-hint");
const questionAuthHint = document.getElementById("question-auth-hint");
const viewMyPosts = document.getElementById("view-my-posts");
const fieldNotesInput = document.getElementById("field-notes-input");
const converterStatus = document.getElementById("converter-status");
const sopResultWrap = document.getElementById("sop-result-wrap");
const sopOutput = document.getElementById("sop-output");
const convertNotesButton = document.getElementById("convert-notes");
const sendToVerificationButton = document.getElementById("send-to-verification");

let currentUser = null;
let authMode = "register";
let showingMyPosts = false;
let currentFieldNoteTitle = "현장 노하우 정리";
const GREETING_PAGE_SIZE = 10;
const QUESTION_PAGE_SIZE = 10;
let greetingPage = 1;
let greetingHasMore = false;
let greetingLoading = false;
let questionPage = 1;
let questionTotalPages = 1;
let questionLoading = false;
const CONVERTER_TOOL_NAME = "기호의 현장 수첩 AI 변환기";
const postPagination = document.getElementById("post-pagination");
const questionPagination = document.getElementById("question-pagination");
const analyticsConsentBanner = document.getElementById("analytics-consent");
const analyticsConsentAccept = document.getElementById("analytics-consent-accept");
const analyticsConsentReject = document.getElementById("analytics-consent-reject");
const analyticsConsentOpen = document.getElementById("privacy-settings-open");
const ANALYTICS_CONSENT_KEY = "ai-profile-analytics-consent-v1";
const GTM_CONTAINER_ID = "GTM-PQQFR7KV";
const GA4_MEASUREMENT_ID = "G-0HFX4KE2GH";

window.dataLayer = window.dataLayer || [];
window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
window.gtag("consent", "default", {
  analytics_storage: "denied",
  ad_storage: "denied",
  ad_user_data: "denied",
  ad_personalization: "denied",
  wait_for_update: 500,
});

const pushAnalyticsEvent = (event, parameters = {}) => {
  if (localStorage.getItem(ANALYTICS_CONSENT_KEY) !== "granted") return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event: "site_conversion", conversion_name: event, ...parameters });
};

const setAnalyticsConsent = (granted) => {
  const consent = granted ? "granted" : "denied";
  localStorage.setItem(ANALYTICS_CONSENT_KEY, consent);
  window.gtag("consent", "update", {
    analytics_storage: consent,
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });
  analyticsConsentBanner.hidden = true;
  if (granted) loadGoogleTagManager();
};

// GA4(GA4_MEASUREMENT_ID)는 GTM 컨테이너 내부 Google 태그 1개로만 전송 (직접 gtag 전송 제거 -> 중복 집계 방지)
const loadGoogleTagManager = () => {
  if (document.getElementById("google-tag-manager-script")) return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });
  const tagManagerScript = document.createElement("script");
  tagManagerScript.id = "google-tag-manager-script";
  tagManagerScript.async = true;
  tagManagerScript.src = `https://www.googletagmanager.com/gtm.js?id=${GTM_CONTAINER_ID}`;
  document.head.append(tagManagerScript);
};

const initializeAnalyticsConsent = () => {
  const consent = localStorage.getItem(ANALYTICS_CONSENT_KEY);
  if (consent === "granted") {
    window.gtag("consent", "update", {
      analytics_storage: "granted",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });
    loadGoogleTagManager();
  } else if (consent === "denied") {
    analyticsConsentBanner.hidden = true;
  } else {
    analyticsConsentBanner.hidden = false;
  }
};

analyticsConsentAccept.addEventListener("click", () => setAnalyticsConsent(true));
analyticsConsentReject.addEventListener("click", () => setAnalyticsConsent(false));
analyticsConsentOpen.addEventListener("click", () => {
  analyticsConsentBanner.hidden = false;
  analyticsConsentAccept.focus();
});
initializeAnalyticsConsent();

const buildVerificationContent = ({ aiTool, promptText, answerText, checkText }) =>
  `사용한 AI: ${aiTool}\n\n내 질문:\n${promptText}\n\nAI 답변:\n${answerText}\n\n함께 확인할 점:\n${checkText}`;

const updateCharacterCount = (field, counter, limit, { threshold = 0.8, prefix = "" } = {}) => {
  if (!field || !counter) return;
  const count = field.value.length;
  counter.textContent = `${prefix}${count.toLocaleString("ko-KR")}/${limit.toLocaleString("ko-KR")}자`;
  counter.classList.toggle("is-near-limit", count >= Math.ceil(limit * threshold) && count < limit);
  counter.classList.toggle("is-at-limit", count >= limit);
};

function bindCharacterCount(field, counter, limit, options) {
  if (!field || !counter) return;
  const update = () => updateCharacterCount(field, counter, limit, options);
  field.addEventListener("input", update);
  field.addEventListener("compositionend", update);
  update();
}

bindCharacterCount(contentField, postContentCount, 1000);
bindCharacterCount(questionTitleField, document.getElementById("question-title-count"), 120);
bindCharacterCount(questionContentField, document.getElementById("question-content-count"), 450);
bindCharacterCount(questionAnswerField, document.getElementById("question-answer-count"), 1000);
bindCharacterCount(questionCheckField, document.getElementById("question-check-count"), 350);

const updateQuestionTotalCount = () => {
  if (!questionTotalCount) return;
  const values = [questionAiToolField.value.trim(), questionContentField.value.trim(), questionAnswerField.value.trim(), questionCheckField.value.trim()];
  const count = values.every(Boolean) ? buildVerificationContent({
    aiTool: values[0],
    promptText: values[1],
    answerText: values[2],
    checkText: values[3],
  }).length : values.reduce((total, value) => total + value.length, 0);
  questionTotalCount.textContent = `${count.toLocaleString("ko-KR")}/2,000자`;
  questionTotalCount.classList.toggle("is-near-limit", count >= 1600 && count < 2000);
  questionTotalCount.classList.toggle("is-at-limit", count >= 2000);
};

[questionAiToolField, questionContentField, questionAnswerField, questionCheckField].forEach((field) => {
  field.addEventListener("input", updateQuestionTotalCount);
  field.addEventListener("change", updateQuestionTotalCount);
  field.addEventListener("compositionend", updateQuestionTotalCount);
});
updateQuestionTotalCount();

const fieldNotePresets = {
  quality: {
    title: "동절기 표면 크랙 방지",
    text: "겨울철 소재가 차가우면 바로 강하게 가공하지 않는다. 작업 전 소재 온도와 표면 상태를 확인한다. 이상 징후가 보이면 공정을 멈추고 품질 담당자와 기준을 확인한다.",
  },
  sales: {
    title: "납품 단가 협상 준비",
    text: "협상 전에 원가와 납기 조건을 확인한다. 고객이 중요하게 보는 품질과 일정을 먼저 듣는다. 가격 조정은 수량과 납기 등 조건을 함께 검토하고 합의 내용을 문서로 남긴다.",
  },
  team: {
    title: "후배 작업자와 안전 대화",
    text: "작업 시작 전에 오늘 공정의 위험 요소를 함께 확인한다. 작업자가 이해한 내용을 자기 말로 설명하도록 돕는다. 모르는 점이나 위험을 발견하면 작업을 멈추고 담당자와 함께 확인한다.",
  },
};

document.querySelectorAll(".note-preset").forEach((button) => {
  button.addEventListener("click", () => {
    const preset = fieldNotePresets[button.dataset.preset];
    if (!preset) return;
    currentFieldNoteTitle = preset.title;
    fieldNotesInput.value = preset.text;
    document.querySelectorAll(".note-preset").forEach((item) => item.classList.toggle("is-active", item === button));
    sopResultWrap.hidden = true;
    converterStatus.textContent = `${preset.title} 예시를 불러왔어요. 실제 현장에 맞게 수정해 주세요.`;
    fieldNotesInput.focus();
  });
});

convertNotesButton.addEventListener("click", () => {
  const rawNotes = fieldNotesInput.value.trim();
  if (!rawNotes) {
    converterStatus.textContent = "현장 메모를 입력하거나 예시를 선택해 주세요.";
    fieldNotesInput.focus();
    return;
  }
  const steps = rawNotes.split(/[\n;]+/).map((line) => line.trim().replace(/^[•·\-–\d.)\s]+/, "")).filter(Boolean).slice(0, 5);
  const procedure = steps.length ? steps.map((step, index) => `${index + 1}. ${step}`).join("\n") : `1. ${rawNotes}`;
  const draft = [
    "[표준작업절차(SOP) 초안 · 검토 전]",
    `작업명: ${currentFieldNoteTitle}`,
    "",
    "1. 목적과 적용 상황",
    `- ${rawNotes.slice(0, 150)}`,
    "",
    "2. 작업 전 확인",
    "- 작업 대상, 설비 상태, 보호구와 현행 사내 기준을 담당자와 함께 확인합니다.",
    "",
    "3. 현장 메모 기반 작업 순서",
    procedure,
    "",
    "4. 품질·안전 및 이상 대응",
    "- 현행 작업표준과 안전수칙을 대조합니다. 이상 징후가 있으면 작업을 멈추고 담당자에게 보고합니다.",
    "",
    "5. 검토 전 확인사항",
    "- 수치, 설비 조건, 책임자와 비상 절차를 현장 기준으로 확인하고 승인받으세요.",
  ].join("\n");
  if (draft.length > 1000) {
    converterStatus.textContent = "초안이 1,000자를 넘었어요. 핵심 단계만 남겨 간결하게 정리해 주세요.";
    return;
  }
  sopOutput.textContent = draft;
  sopResultWrap.hidden = false;
  converterStatus.textContent = "메모를 SOP 양식으로 정리했어요. 실제 AI 분석이나 안전 검증은 아니므로 현장 기준을 확인해 주세요.";
});

sendToVerificationButton.addEventListener("click", () => {
  const notes = fieldNotesInput.value.trim();
  const draft = sopOutput.textContent.trim();
  if (!notes || !draft) {
    converterStatus.textContent = "먼저 현장 메모를 입력하고 SOP 초안을 만들어 주세요.";
    return;
  }
  const toolName = CONVERTER_TOOL_NAME;
  questionAiToolField.value = [...questionAiToolField.options].some((option) => option.value === toolName) ? toolName : "기타 / 잘 모르겠어요";
  questionTitleField.value = `${currentFieldNoteTitle} · 현장 지혜 검증 요청`;
  questionContentField.value = notes.slice(0, 450);
  questionAnswerField.value = draft;
  questionCheckField.value = "사내 작업표준·안전수칙과 맞는지, 빠진 위험요인이 없는지 확인해 주세요.";
  setQuestionStatus("초안을 검증 양식에 옮겼어요. 내용을 검토하고 직접 등록해 주세요.");
  questionForm.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  questionTitleField.focus({ preventScroll: true });
});

const setBoardStatus = (message = "", isError = false) => {
  boardStatus.setAttribute("role", "status");
  boardStatus.setAttribute("aria-live", "polite");
  boardStatus.setAttribute("aria-atomic", "true");
  boardStatus.textContent = message;
  boardStatus.classList.toggle("is-error", isError);
};

const setCommentStatus = (message = "", isError = false) => {
  commentStatus.setAttribute("role", "status");
  commentStatus.setAttribute("aria-live", "polite");
  commentStatus.setAttribute("aria-atomic", "true");
  commentStatus.textContent = message;
  commentStatus.classList.toggle("is-error", isError);
};

const setQuestionStatus = (message = "", isError = false) => {
  questionStatus.setAttribute("role", "status");
  questionStatus.setAttribute("aria-live", "polite");
  questionStatus.setAttribute("aria-atomic", "true");
  questionStatus.textContent = message;
  questionStatus.classList.toggle("is-error", isError);
};

document.querySelectorAll(".manual-verify-button").forEach((button) => {
  button.addEventListener("click", () => {
    questionTitleField.value = button.dataset.verifyTitle || "";
    questionContentField.value = button.dataset.verifyPrompt || "";
    questionAnswerField.value = button.dataset.verifyAnswer || "";
    questionCheckField.value = button.dataset.verifyCheck || "";
    const requestedTool = button.dataset.verifyTool || "ChatGPT";
    questionAiToolField.value = [...questionAiToolField.options].some((option) => option.value === requestedTool)
      ? requestedTool
      : "기타 / 잘 모르겠어요";
    setQuestionStatus("예시 질문과 답변을 옮겼어요. 내용을 확인하고 자유롭게 수정한 뒤 직접 등록해 주세요.");
    questionForm.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
    questionTitleField.focus({ preventScroll: true });
  });
});

const setAuthNotice = (message = "", isError = false) => {
  authNotice.setAttribute("role", "status");
  authNotice.setAttribute("aria-live", "polite");
  authNotice.setAttribute("aria-atomic", "true");
  authNotice.textContent = message;
  authNotice.classList.toggle("is-error", isError);
};

const renderAuthState = () => {
  const loggedIn = Boolean(currentUser);
  document.body.classList.toggle("is-logged-in", loggedIn);
  const header = document.querySelector(".site-header");
  if (header) header.classList.toggle("is-logged-in", loggedIn);
  authOpen.textContent = loggedIn ? `${currentUser.nickname} 님` : "로그인 / 회원가입";
  authOpen.classList.toggle("is-signed-in", loggedIn);
  authUser.textContent = loggedIn ? `${currentUser.nickname} · ${currentUser.email}` : "";
  document.getElementById("auth-signup").hidden = loggedIn;
  document.getElementById("auth-login").hidden = loggedIn;
  authLogout.hidden = !loggedIn;
  viewMyPosts.hidden = !loggedIn;
  if (!loggedIn) showingMyPosts = false;
  viewMyPosts.textContent = showingMyPosts ? "전체 글 보기" : "내가 쓴 글";
  postAuthHint.textContent = loggedIn
    ? `${currentUser.nickname} 님, 반가운 인사를 남겨주세요.`
    : "로그인하면 가입인사를 남길 수 있어요.";
  questionAuthHint.textContent = loggedIn
    ? `${currentUser.nickname} 님, 궁금한 점을 질문해 주세요.`
    : "로그인 후 질문을 남길 수 있어요.";
  submitPost.disabled = !loggedIn;
  submitQuestion.disabled = !loggedIn;
  if (postAuthorHeader && postAuthorLabel) {
    postAuthorHeader.hidden = !loggedIn;
    postAuthorLabel.textContent = loggedIn ? `${currentUser.nickname} 님으로 작성` : "";
  }
  if (questionAuthorHeader && questionAuthorLabel) {
    questionAuthorHeader.hidden = !loggedIn;
    questionAuthorLabel.textContent = loggedIn ? `${currentUser.nickname} 님으로 작성` : "";
  }
  if (loggedIn && !authNicknameField.hidden) authNicknameField.hidden = true;
};

const openAuthPanel = (mode = "register") => {
  authMode = mode;
  authPanel.hidden = false;
  authMenu.hidden = true;
  authPanel.dataset.mode = mode;
  authTitle.textContent = mode === "login" ? "다시 만나 반가워요" : "AI 학습 공간에 가입하기";
  authSubmit.textContent = mode === "login" ? "로그인" : "회원가입";
  authNicknameField.hidden = mode === "login";
  authNickname.required = mode !== "login";
  authPassword.autocomplete = mode === "login" ? "current-password" : "new-password";
  authPassword.placeholder = mode === "login" ? "비밀번호를 입력해 주세요" : "8자 이상 입력해 주세요";
  authSwitchButton.textContent = mode === "login" ? "처음 오셨나요? 회원가입" : "이미 가입했다면 로그인";
  authSwitch.textContent = mode === "login"
    ? "가입할 때 사용한 이메일과 비밀번호로 로그인해 주세요."
    : "가입 후 바로 게시글과 댓글을 작성할 수 있어요.";
  setAuthNotice();
  authPanel.scrollIntoView({ behavior: "smooth", block: "center" });
  (mode === "login" ? authEmail : authNickname).focus({ preventScroll: true });
};

const loadCurrentUser = async () => {
  try {
    const response = await fetch("/api/auth/me", { credentials: "same-origin" });
    const result = await response.json();
    currentUser = response.ok ? result.user : null;
  } catch {
    currentUser = null;
  }
  renderAuthState();
  await Promise.all([loadPosts(), loadQuestions()]);
};

const openAuthMenu = () => {
  authMenu.hidden = !authMenu.hidden;
};

const closeAuthPanel = () => {
  authPanel.hidden = true;
  authForm.reset();
  setAuthNotice();
};

const showAuthMessage = (message, isError = false) => setAuthNotice(message, isError);

const showLoginRequired = () => {
  openAuthPanel("login");
  showAuthMessage("게시글을 작성하려면 로그인해 주세요.");
};

const editGreeting = async (post) => {
  const content = window.prompt("가입인사를 수정해 주세요.", post.content);
  if (content === null) return;
  try {
    const response = await fetch(`/api/posts/${post.id}`, {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "가입인사를 수정하지 못했어요.");
    setBoardStatus("가입인사를 수정했습니다.");
    await loadPosts();
  } catch (error) {
    setBoardStatus(error.message || "가입인사를 수정하지 못했어요.", true);
  }
};

const deleteOwnedContent = async (path, element, statusHandler) => {
  if (!window.confirm("이 콘텐츠를 삭제할까요? 삭제하면 복구할 수 없습니다.")) return;
  try {
    const response = await fetch(path, { method: "DELETE", credentials: "same-origin" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "삭제하지 못했어요.");
    element.remove();
    statusHandler("내 콘텐츠를 삭제했습니다.");
    await Promise.all([loadPosts(), loadQuestions()]);
  } catch (error) {
    statusHandler(error.message || "삭제하지 못했어요. 다시 시도해 주세요.", true);
  }
};

const parseVerificationBody = (bodyText = "") => {
  const match = String(bodyText).match(/^사용한 AI: ([^\n]+)\n\n내 질문:\n([\s\S]*?)\n\nAI 답변:\n([\s\S]*?)\n\n함께 확인할 점:\n([\s\S]*)$/);
  if (!match) return null;
  return {
    aiTool: match[1],
    promptText: match[2],
    answerText: match[3],
    checkText: match[4],
  };
};

const editQuestion = (question, cardElement) => {
  if (!cardElement) return;
  const existingForm = cardElement.querySelector(".inline-question-edit-form");
  if (existingForm) {
    existingForm.querySelector("input, textarea, select")?.focus();
    return;
  }

  const questionBody = question.body ?? question.content.split("\n").slice(1).join("\n");
  const parsed = parseVerificationBody(questionBody);
  const detailsContainer = cardElement.querySelector(".question-details");
  const actionsContainer = cardElement.querySelector(".owned-content-actions");

  const form = document.createElement("form");
  form.className = "inline-question-edit-form";

  const makeField = (labelText, control) => {
    const wrapper = document.createElement("label");
    wrapper.className = "inline-edit-field";
    const span = document.createElement("span");
    span.className = "inline-edit-label";
    span.textContent = labelText;
    wrapper.append(span, control);
    return wrapper;
  };

  const titleInput = document.createElement("input");
  titleInput.type = "text";
  titleInput.name = "title";
  titleInput.maxLength = 120;
  titleInput.required = true;
  titleInput.value = question.title || "";
  form.append(makeField("검증할 작업·주제", titleInput));

  let aiToolSelect = null;
  let promptInput = null;
  let answerInput = null;
  let checkInput = null;
  let rawContentInput = null;

  if (parsed) {
    aiToolSelect = document.createElement("select");
    aiToolSelect.name = "ai-tool";
    aiToolSelect.required = true;
    const toolOptions = ["기호의 현장 수첩 AI 변환기", "ChatGPT", "Gemini", "Microsoft Copilot", "Claude", "기타 / 잘 모르겠어요"];
    if (!toolOptions.includes(parsed.aiTool)) toolOptions.unshift(parsed.aiTool);
    for (const optText of toolOptions) {
      const opt = document.createElement("option");
      opt.value = optText;
      opt.textContent = optText;
      if (optText === parsed.aiTool) opt.selected = true;
      aiToolSelect.append(opt);
    }

    promptInput = document.createElement("textarea");
    promptInput.name = "prompt";
    promptInput.rows = 3;
    promptInput.maxLength = 450;
    promptInput.required = true;
    promptInput.value = parsed.promptText;

    answerInput = document.createElement("textarea");
    answerInput.name = "answer";
    answerInput.rows = 4;
    answerInput.maxLength = 1000;
    answerInput.required = true;
    answerInput.value = parsed.answerText;

    checkInput = document.createElement("textarea");
    checkInput.name = "check";
    checkInput.rows = 3;
    checkInput.maxLength = 350;
    checkInput.required = true;
    checkInput.value = parsed.checkText;

    form.append(
      makeField("사용한 AI (초안 출처)", aiToolSelect),
      makeField("내 질문 (현장 상황과 원래 메모)", promptInput),
      makeField("AI 답변 (AI가 정리한 SOP 초안)", answerInput),
      makeField("함께 확인할 점", checkInput),
    );
  } else {
    rawContentInput = document.createElement("textarea");
    rawContentInput.name = "content";
    rawContentInput.rows = 6;
    rawContentInput.maxLength = 2000;
    rawContentInput.required = true;
    rawContentInput.value = questionBody;
    form.append(makeField("질문 내용", rawContentInput));
  }

  const buttonRow = document.createElement("div");
  buttonRow.className = "inline-edit-actions";
  const saveButton = document.createElement("button");
  saveButton.type = "submit";
  saveButton.className = "submit-post inline-save-button";
  saveButton.textContent = "수정 저장";
  const cancelButton = document.createElement("button");
  cancelButton.type = "button";
  cancelButton.className = "cancel-reply inline-cancel-button";
  cancelButton.textContent = "취소";

  const closeEditor = () => {
    form.remove();
    if (detailsContainer) detailsContainer.hidden = false;
    if (actionsContainer) actionsContainer.hidden = false;
  };

  cancelButton.addEventListener("click", closeEditor);
  buttonRow.append(saveButton, cancelButton);
  form.append(buttonRow);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const title = titleInput.value.replace(/[\r\n]+/g, " ").trim();
    const content = parsed
      ? buildVerificationContent({
          aiTool: aiToolSelect.value.trim(),
          promptText: promptInput.value.trim(),
          answerText: answerInput.value.trim(),
          checkText: checkInput.value.trim(),
        })
      : rawContentInput.value.trim();

    if (!title || !content) {
      setQuestionStatus("제목과 내용을 모두 입력해 주세요.", true);
      return;
    }
    if (content.length > 2000) {
      setQuestionStatus("전체 내용을 2,000자 이내로 줄여주세요.", true);
      return;
    }

    saveButton.disabled = true;
    cancelButton.disabled = true;
    try {
      const response = await fetch(`/api/questions/${question.id}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "질문을 수정하지 못했어요.");
      setQuestionStatus("질문을 수정했습니다.");
      await loadQuestions({ reset: false });
    } catch (error) {
      setQuestionStatus(error.message || "질문을 수정하지 못했어요.", true);
      saveButton.disabled = false;
      cancelButton.disabled = false;
    }
  });

  if (detailsContainer) detailsContainer.hidden = true;
  if (actionsContainer) actionsContainer.hidden = true;
  if (actionsContainer) {
    actionsContainer.after(form);
  } else if (detailsContainer) {
    detailsContainer.after(form);
  } else {
    cardElement.querySelector(".post-body")?.append(form);
  }
  titleInput.focus();
};

const editComment = async (comment, contentElement, statusHandler) => {
  const content = window.prompt("댓글을 수정해 주세요.", comment.content);
  if (content === null) return;
  try {
    const response = await fetch(`/api/comments/${comment.id}`, {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "댓글을 수정하지 못했어요.");
    comment.content = content.trim();
    contentElement.textContent = comment.content;
    statusHandler("댓글을 수정했습니다.");
  } catch (error) {
    statusHandler(error.message || "댓글을 수정하지 못했어요.", true);
  }
};

const formatPostDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "방금";
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
};

const renderListSkeleton = (list, kind) => {
  list.replaceChildren();
  for (let index = 0; index < 3; index += 1) {
    const item = document.createElement("li");
    item.className = `post-skeleton ${kind}-skeleton`;
    item.setAttribute("aria-hidden", "true");
    item.innerHTML = '<span class="skeleton-avatar"></span><span class="skeleton-lines"><i></i><i></i><i></i></span>';
    list.append(item);
  }
};

const renderQuestionPagination = () => {
  if (!questionPagination) return;
  questionPagination.replaceChildren();
  questionPagination.hidden = questionTotalPages <= 1 || showingMyPosts;
  if (questionPagination.hidden) return;

  for (let page = 1; page <= questionTotalPages; page += 1) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "page-button";
    button.textContent = String(page);
    button.setAttribute("aria-label", `검증 요청 ${page}페이지`);
    button.setAttribute("aria-current", page === questionPage ? "page" : "false");
    button.disabled = page === questionPage || questionLoading;
    button.addEventListener("click", () => {
      if (page === questionPage || questionLoading) return;
      questionPage = page;
      loadQuestions({ reset: false });
    });
    questionPagination.append(button);
  }
};

const loadComments = async (postId, commentsList, countLabel, statusHandler = setCommentStatus, countName = "댓글") => {
  try {
    const response = await fetch(`/api/posts/${postId}/comments`);
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "댓글을 불러오지 못했어요.");

    commentsList.replaceChildren();
    countLabel.textContent = `${countName} ${result.comments.length}개`;
    const commentById = new Map(result.comments.map((entry) => [entry.id, entry]));
    for (const comment of result.comments) {
      const item = document.createElement("li");
      item.className = "comment-item";
      if (comment.parent_comment_id) {
        item.classList.add("comment-reply");
        item.style.marginInlineStart = "18px";
        item.style.borderInlineStart = "2px solid #406383";
      }
      if (comment.parent_comment_id) item.classList.add("comment-reply");
      const meta = document.createElement("div");
      meta.className = "comment-meta";
      const name = document.createElement("strong");
      name.className = "post-nickname";
      name.textContent = comment.nickname;
      const date = document.createElement("time");
      date.className = "post-date";
      date.dateTime = comment.created_at;
      date.textContent = formatPostDate(comment.created_at);
      const content = document.createElement("p");
      content.className = "comment-content";
      if (comment.parent_comment_id) {
        const parent = commentById.get(comment.parent_comment_id);
        const mention = parent ? `@${parent.nickname} ` : "";
        content.textContent = mention && !comment.content.startsWith(mention) ? `${mention}${comment.content}` : comment.content;
      } else {
        content.textContent = comment.content;
      }
      meta.append(name, date);
      item.append(meta, content);
      if (currentUser) {
        const actions = document.createElement("div");
        actions.className = "comment-actions";
        const reply = document.createElement("button");
        reply.type = "button";
        reply.className = "reply-comment";
        reply.textContent = "답글 달기";
        reply.dataset.commentId = String(comment.id);
        reply.dataset.nickname = comment.nickname;
        reply.addEventListener("click", () => {
          const form = commentsList.parentElement?.querySelector(".comment-form");
          if (!form) return;
          const replyInput = form.querySelector('[name="parent_comment_id"]');
          const contentInput = form.querySelector('[name="content"]');
          const replyLabel = form.querySelector(".reply-target-label");
          const cancel = form.querySelector(".cancel-reply");
          replyInput.value = String(comment.id);
          replyLabel.textContent = `${comment.nickname} 님에게 답글`;
          replyLabel.hidden = false;
          cancel.hidden = false;
          contentInput.placeholder = "답글을 작성해 주세요";
          contentInput.focus();
        });
        if (!comment.parent_comment_id) {
          actions.append(reply);
        }
        if (comment.user_id === currentUser.id) {
          const edit = document.createElement("button");
          edit.type = "button";
          edit.textContent = "수정";
          edit.addEventListener("click", () => editComment(comment, content, statusHandler));
          const remove = document.createElement("button");
          remove.type = "button";
          remove.textContent = "삭제";
          remove.addEventListener("click", () => deleteOwnedContent(`/api/comments/${comment.id}`, item, statusHandler));
          actions.append(edit, remove);
        }
        item.append(actions);
      }
      commentsList.append(item);
    }
    return true;
  } catch (error) {
    statusHandler(error.message || "댓글을 불러오지 못했어요.", true);
    countLabel.textContent = "불러오지 못함";
    return false;
  }

};

const bindLazyComments = ({ button, list, form, countLabel, load, noun }) => {
  let loaded = false;
  let loading = false;
  list.hidden = true;
  form.hidden = true;

  button.addEventListener("click", async () => {
    const expanded = button.getAttribute("aria-expanded") === "true";
    if (expanded) {
      list.hidden = true;
      form.hidden = true;
      button.setAttribute("aria-expanded", "false");
      button.textContent = `${noun} 보기`;
      return;
    }

    list.hidden = false;
    form.hidden = false;
    button.setAttribute("aria-expanded", "true");
    button.textContent = `${noun} 접기`;
    if (loaded || loading) return;

    loading = true;
    countLabel.textContent = "불러오는 중…";
    button.disabled = true;
    loaded = await load();
    loading = false;
    button.disabled = false;
    if (!loaded) button.textContent = `${noun} 다시 불러오기`;
  });
};

const createQuestionCard = (question) => {
  const item = document.createElement("li");
  item.className = "post-item question-item";

  const avatar = document.createElement("span");
  avatar.className = "post-avatar question-avatar";
  avatar.setAttribute("aria-hidden", "true");
  avatar.innerHTML = '<svg viewBox="0 0 24 24"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5h-5L7 20v-4H6.5A2.5 2.5 0 0 1 4 13.5z"/><path d="M9.3 8.5a2.8 2.8 0 1 1 4.8 2c-.8.8-2.1 1.2-2.1 2.5m0 2v.1"/></svg>';

  const body = document.createElement("div");
  body.className = "post-body";
  const meta = document.createElement("div");
  meta.className = "post-meta";
  const name = document.createElement("strong");
  name.className = "post-nickname";
  name.textContent = question.nickname;
  const date = document.createElement("time");
  date.className = "post-date";
  date.dateTime = question.created_at;
  date.textContent = formatPostDate(question.created_at);

  const title = document.createElement("h3");
  title.className = "question-title";
  title.textContent = question.title;
  const questionBody = question.body ?? question.content.split("\n").slice(1).join("\n");
  const content = document.createElement("div");
  content.className = "question-details";
  const verificationMatch = questionBody.match(/^사용한 AI: ([^\n]+)\n\n내 질문:\n([\s\S]*?)\n\nAI 답변:\n([\s\S]*?)\n\n함께 확인할 점:\n([\s\S]*)$/);
  if (verificationMatch) {
    const fields = [
      ["사용한 AI", verificationMatch[1], "verification-tool"],
      ["내 질문", verificationMatch[2], ""],
      ["AI 답변", verificationMatch[3], "verification-answer"],
      ["함께 확인할 점", verificationMatch[4], ""],
    ];
    for (const [labelText, value, modifier] of fields) {
      const section = document.createElement("div");
      section.className = `verification-field ${modifier}`.trim();
      const label = document.createElement("strong");
      label.textContent = labelText;
      const text = document.createElement("p");
      text.className = "post-content";
      text.textContent = value;
      section.append(label, text);
      content.append(section);
    }
  } else {
    content.className = "post-content question-details";
    content.textContent = questionBody;
  }

  const commentsPanel = document.createElement("section");
  commentsPanel.className = "comments-panel";
  commentsPanel.setAttribute("aria-label", `${question.title} 검증 의견`);
  const commentsHeading = document.createElement("div");
  commentsHeading.className = "comments-heading";
  const label = document.createElement("span");
  label.className = "comments-label";
  label.textContent = "함께 검증한 의견";
  const countLabel = document.createElement("span");
  countLabel.className = "comment-count";
  countLabel.textContent = "아직 불러오지 않음";
  const toggleComments = document.createElement("button");
  toggleComments.className = "toggle-comments";
  toggleComments.type = "button";
  toggleComments.textContent = "검증 의견 보기";
  toggleComments.setAttribute("aria-expanded", "false");
  toggleComments.setAttribute("aria-controls", `question-comments-${question.id}`);
  commentsHeading.append(label, countLabel, toggleComments);
  const comments = document.createElement("ol");
  comments.className = "comment-list";
  comments.id = `question-comments-${question.id}`;
  const commentForm = createCommentForm(question.id, comments, countLabel, setQuestionStatus, "검증 의견");
  bindLazyComments({
    button: toggleComments,
    list: comments,
    form: commentForm,
    countLabel,
    noun: "검증 의견",
    load: () => loadComments(question.id, comments, countLabel, setQuestionStatus, "검증 의견"),
  });
  commentsPanel.append(commentsHeading, comments, commentForm);

  meta.append(name, date);
  body.append(meta, title, content);
  if (currentUser && question.user_id === currentUser.id) {
    const actions = document.createElement("div");
    actions.className = "owned-content-actions";
    const author = document.createElement("span");
    author.className = "owned-content-label";
    author.textContent = "내 질문";
    const edit = document.createElement("button");
    edit.type = "button";
    edit.textContent = "질문 수정";
    edit.addEventListener("click", () => editQuestion(question, item));
    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "질문 삭제";
    remove.addEventListener("click", () => deleteOwnedContent(`/api/questions/${question.id}`, item, setQuestionStatus));
    actions.append(author, edit, remove);
    body.append(actions);
  }
  body.append(commentsPanel);
  item.append(avatar, body);
  return item;
};

const loadQuestions = async ({ reset = true } = {}) => {
  if (questionLoading) return;
  if (reset) questionPage = 1;
  questionLoading = true;
  refreshQuestions.disabled = true;
  renderQuestionPagination();
  renderListSkeleton(questionList, "question");
  setQuestionStatus("검증 요청을 불러오는 중입니다.");
  try {
    const endpoint = showingMyPosts ? "/api/me/posts?category=question" : "/api/questions";
    const url = new URL(endpoint, location.origin);
    url.searchParams.set("page", String(questionPage));
    url.searchParams.set("limit", String(QUESTION_PAGE_SIZE));
    const response = await fetch(url, { credentials: "same-origin" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "질문을 불러오지 못했어요.");

    questionList.replaceChildren();
    questionPage = result.page || questionPage;
    questionTotalPages = Math.max(1, result.totalPages || 1);
    questionPage = Math.min(questionPage, questionTotalPages);
    questionCount.textContent = showingMyPosts
      ? `내 질문 ${result.total ?? result.posts.length}개`
      : `전체 ${result.total ?? result.posts.length}개 중 ${result.posts.length}개 · ${questionPage}/${questionTotalPages}페이지`;
    if (result.posts.length === 0) {
      const emptyItem = document.createElement("li");
      emptyItem.className = "empty-posts";
      emptyItem.textContent = "아직 질문이 없어요. 첫 번째 질문을 남겨주세요.";
      questionList.append(emptyItem);
    } else {
      for (const question of result.posts) {
        questionList.append(createQuestionCard(question));
      }
    }
    renderQuestionPagination();
    setQuestionStatus();
  } catch (error) {
    setQuestionStatus(error.message || "질문을 불러오지 못했어요. 새로고침해 주세요.", true);
    questionList.replaceChildren();
  } finally {
    questionLoading = false;
    refreshQuestions.disabled = false;
    renderQuestionPagination();
  }
};

const createCommentForm = (postId, commentsList, countLabel, statusHandler = setCommentStatus, countName = "댓글") => {
  if (!currentUser) {
    const prompt = document.createElement("button");
    prompt.className = "comment-login-prompt";
    prompt.type = "button";
    prompt.textContent = "로그인하고 댓글 남기기 →";
    prompt.addEventListener("click", () => openAuthPanel("login"));
    return prompt;
  }

  const form = document.createElement("form");
  form.className = "comment-form";

  const content = document.createElement("input");
  content.name = "content";
  content.type = "text";
  content.maxLength = 500;
  content.placeholder = "답글이나 댓글을 남겨주세요";
  content.setAttribute("aria-label", "댓글 내용");
  content.required = true;

  const replyTo = document.createElement("input");
  replyTo.name = "parent_comment_id";
  replyTo.type = "hidden";

  const button = document.createElement("button");
  button.className = "submit-comment";
  button.type = "submit";
  button.textContent = "등록";

  const formHeader = document.createElement("div");
  formHeader.className = "comment-form-header";
  const signedIn = document.createElement("span");
  signedIn.className = "comment-author-label";
  signedIn.textContent = `${currentUser.nickname} 님으로 작성`;
  formHeader.append(signedIn);

  const replyLabel = document.createElement("span");
  replyLabel.className = "reply-target-label";
  replyLabel.hidden = true;

  const cancelReply = document.createElement("button");
  cancelReply.className = "cancel-reply";
  cancelReply.type = "button";
  cancelReply.textContent = "취소";
  cancelReply.hidden = true;
  cancelReply.addEventListener("click", () => {
    replyTo.value = "";
    replyLabel.textContent = "";
    replyLabel.hidden = true;
    cancelReply.hidden = true;
    content.placeholder = "댓글을 남겨주세요";
  });

  const replyButtons = Array.from(commentsList.querySelectorAll(".reply-comment"));
  for (const replyButton of replyButtons) {
    replyButton.addEventListener("click", () => {
      replyTo.value = replyButton.dataset.commentId;
      replyLabel.textContent = `${replyButton.dataset.nickname} 님에게 답글`;
      replyLabel.hidden = false;
      cancelReply.hidden = false;
      content.placeholder = "답글을 작성해 주세요";
      content.focus();
    });
  }

  form.append(formHeader, replyLabel, cancelReply, content, replyTo, button);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const message = content.value.trim();
    if (!message) return;

    button.disabled = true;
    try {
      const response = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          content: message,
          ...(replyTo.value ? { parent_comment_id: Number(replyTo.value) } : {}),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "댓글을 등록하지 못했어요.");
      content.value = "";
      cancelReply.click();
      statusHandler("댓글을 남겨주셔서 고마워요.");
      await loadComments(postId, commentsList, countLabel, statusHandler, countName);
    } catch (error) {
      statusHandler(error.message || "댓글을 등록하지 못했어요.", true);
    } finally {
      button.disabled = false;
    }
  });
  return form;
};

const createPostCard = (post) => {
  const item = document.createElement("li");
  item.className = "post-item";

  const avatar = document.createElement("span");
  avatar.className = "post-avatar";
  avatar.setAttribute("aria-hidden", "true");
  avatar.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 3v3m0 12v3M3 12h3m12 0h3M5.64 5.64l2.12 2.12m8.48 8.48 2.12 2.12m0-12.72-2.12 2.12m-8.48 8.48-2.12 2.12"/><circle cx="12" cy="12" r="4"/></svg>';

        const body = document.createElement("div");
        body.className = "post-body";
        const meta = document.createElement("div");
        meta.className = "post-meta";
        const name = document.createElement("strong");
        name.className = "post-nickname";
        name.textContent = post.nickname;
        const date = document.createElement("time");
        date.className = "post-date";
        date.dateTime = post.created_at;
        date.textContent = formatPostDate(post.created_at);
        const content = document.createElement("p");
        content.className = "post-content";
        content.textContent = post.content;

        const commentsPanel = document.createElement("section");
        commentsPanel.className = "comments-panel";
        commentsPanel.setAttribute("aria-label", `${post.nickname}님의 게시글 댓글`);
        const commentsHeading = document.createElement("div");
        commentsHeading.className = "comments-heading";
        const commentsLabel = document.createElement("span");
        commentsLabel.className = "comments-label";
        commentsLabel.textContent = "댓글";
        const countLabel = document.createElement("span");
        countLabel.className = "comment-count";
        countLabel.textContent = "아직 불러오지 않음";
        const toggleComments = document.createElement("button");
        toggleComments.className = "toggle-comments";
        toggleComments.type = "button";
        toggleComments.textContent = "댓글 보기";
        toggleComments.setAttribute("aria-expanded", "false");
        toggleComments.setAttribute("aria-controls", `post-comments-${post.id}`);
        commentsHeading.append(commentsLabel, countLabel, toggleComments);
        const commentsList = document.createElement("ol");
        commentsList.className = "comment-list";
        commentsList.id = `post-comments-${post.id}`;
        commentsList.hidden = true;
        let commentsLoaded = false;
        let commentsLoading = false;
        meta.append(name, date);
        if (currentUser && post.user_id === currentUser.id) {
          const actions = document.createElement("div");
          actions.className = "owned-content-actions";
          const author = document.createElement("span");
          author.className = "owned-content-label";
          author.textContent = "내 가입인사";
          const edit = document.createElement("button");
          edit.type = "button";
          edit.textContent = "수정";
          edit.addEventListener("click", () => editGreeting(post));
          const remove = document.createElement("button");
          remove.type = "button";
          remove.textContent = "삭제";
          remove.addEventListener("click", () => deleteOwnedContent(`/api/posts/${post.id}`, item, setBoardStatus));
          actions.append(author, edit, remove);
          body.append(meta, content, actions);
        } else {
          body.append(meta, content);
        }
        const commentForm = createCommentForm(post.id, commentsList, countLabel, setBoardStatus);
        bindLazyComments({
          button: toggleComments,
          list: commentsList,
          form: commentForm,
          countLabel,
          noun: "댓글",
          load: () => loadComments(post.id, commentsList, countLabel),
        });
        commentsPanel.append(commentsHeading, commentsList, commentForm);
        body.append(commentsPanel);
        item.append(avatar, body);
  return item;
};

const renderGreetingPagination = () => {
  if (!postPagination) return;
  postPagination.replaceChildren();
  postPagination.hidden = showingMyPosts || !greetingHasMore;
  if (postPagination.hidden) return;
  const button = document.createElement("button");
  button.type = "button";
  button.className = "load-more-button";
  button.textContent = "인사 더보기";
  button.disabled = greetingLoading;
  button.addEventListener("click", loadMorePosts);
  postPagination.append(button);
};

const loadMorePosts = async () => {
  if (greetingLoading || !greetingHasMore || showingMyPosts) return;
  await loadPosts({ append: true });
};

const loadPosts = async ({ append = false } = {}) => {
  if (greetingLoading) return;
  if (!append) {
    greetingPage = 1;
    greetingHasMore = false;
  }
  greetingLoading = true;
  refreshPosts.disabled = true;
  if (append) renderGreetingPagination();
  else renderListSkeleton(postList, "greeting");
  setBoardStatus("가입인사를 불러오는 중입니다.");
  try {
    const endpoint = showingMyPosts ? "/api/me/posts?category=greeting" : "/api/posts";
    const url = new URL(endpoint, location.origin);
    url.searchParams.set("page", String(greetingPage));
    url.searchParams.set("limit", String(GREETING_PAGE_SIZE));
    const response = await fetch(url, { credentials: "same-origin" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "게시글을 불러오지 못했어요.");

    if (!append) postList.replaceChildren();
    if (result.posts.length === 0 && !append) {
      const emptyItem = document.createElement("li");
      emptyItem.className = "empty-posts";
      emptyItem.textContent = "아직 가입인사가 없어요. 첫 번째 인사를 남겨주세요.";
      postList.append(emptyItem);
    } else {
      for (const post of result.posts) postList.append(createPostCard(post));
    }
    greetingPage = result.page || greetingPage;
    greetingHasMore = Boolean(result.hasMore);
    const shown = showingMyPosts ? postList.querySelectorAll(":scope > .post-item").length : Math.min(greetingPage * GREETING_PAGE_SIZE, result.total ?? greetingPage * GREETING_PAGE_SIZE);
    postCount.textContent = showingMyPosts
      ? `내 가입인사 ${result.total ?? result.posts.length}개`
      : `${result.total ?? result.posts.length}개의 가입인사 중 ${shown}개`;
    setBoardStatus();
  } catch (error) {
    setBoardStatus(error.message || "게시글을 불러오지 못했어요. 잠시 후 새로고침해 주세요.", true);
    if (!append) postList.replaceChildren();
  } finally {
    greetingLoading = false;
    refreshPosts.disabled = false;
    renderGreetingPagination();
  }
};

postForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const content = contentField.value.trim();
  if (!currentUser) {
    showLoginRequired();
    return;
  }
  if (!content) {
    setBoardStatus("가입인사 내용을 입력해 주세요.", true);
    contentField.focus();
    return;
  }

  submitPost.disabled = true;
  setBoardStatus("소중한 인사를 남기는 중이에요…");
  try {
    const response = await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ content }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "게시글을 저장하지 못했어요.");
    postForm.reset();
    await loadPosts();
    pushAnalyticsEvent("greeting_submit", { content_category: "greeting" });
    setBoardStatus("소중한 인사를 남겨주셔서 고마워요.");
  } catch (error) {
    setBoardStatus(error.message || "글을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.", true);
  } finally {
    submitPost.disabled = false;
  }
});

refreshPosts.addEventListener("click", loadPosts);
questionForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const title = questionTitleField.value.trim();
  const aiTool = questionAiToolField.value.trim();
  const promptText = questionContentField.value.trim();
  const answerText = questionAnswerField.value.trim();
  const checkText = questionCheckField.value.trim();
  const content = buildVerificationContent({ aiTool, promptText, answerText, checkText });
  if (!currentUser) {
    showLoginRequired();
    return;
  }
  if (!title || !aiTool || !promptText || !answerText || !checkText) {
    setQuestionStatus("AI 도구, 내 질문, AI 답변, 함께 확인할 점을 모두 입력해 주세요.", true);
    (!title ? questionTitleField : !aiTool ? questionAiToolField : !promptText ? questionContentField : !answerText ? questionAnswerField : questionCheckField).focus();
    return;
  }
  if (content.length > 2000) {
    setQuestionStatus("입력한 내용이 길어요. 전체 내용을 2,000자 이내로 줄여주세요.", true);
    questionAnswerField.focus();
    return;
  }

  submitQuestion.disabled = true;
  setQuestionStatus("질문을 등록하고 있어요…");
  try {
    const response = await fetch("/api/questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ title, content }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "질문을 등록하지 못했어요.");
    questionForm.reset();
    await loadQuestions();
    pushAnalyticsEvent("question_submit", { content_category: "question" });
    setQuestionStatus("AI 답변 검증 요청을 등록했어요. 함께 확인해볼게요.");
  } catch (error) {
    setQuestionStatus(error.message || "질문을 등록하지 못했어요. 다시 시도해 주세요.", true);
  } finally {
    submitQuestion.disabled = false;
  }
});

refreshQuestions.addEventListener("click", loadQuestions);

authOpen.addEventListener("click", () => {
  if (currentUser) openAuthMenu();
  else openAuthPanel("register");
});

document.getElementById("auth-signup").addEventListener("click", () => openAuthPanel("register"));
document.getElementById("auth-login").addEventListener("click", () => openAuthPanel("login"));
document.getElementById("auth-close").addEventListener("click", closeAuthPanel);
authSwitchButton.addEventListener("click", () => openAuthPanel(authMode === "login" ? "register" : "login"));
viewMyPosts.addEventListener("click", async () => {
  showingMyPosts = !showingMyPosts;
  renderAuthState();
  await Promise.all([loadPosts(), loadQuestions()]);
});

authLogout.addEventListener("click", async () => {
  try {
    await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
    currentUser = null;
    showingMyPosts = false;
    authMenu.hidden = true;
    closeAuthPanel();
    renderAuthState();
    await Promise.all([loadPosts(), loadQuestions()]);
  } catch (error) {
    setAuthNotice(error.message || "로그아웃에 실패했습니다.", true);
  }
});

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = authEmail.value.trim();
  const password = authPassword.value;
  const payload = { email, password };
  const endpoint = authMode === "login" ? "/api/auth/login" : "/api/auth/register";
  if (authMode === "register") payload.nickname = authNickname.value.trim();

  authSubmit.disabled = true;
  setAuthNotice(authMode === "login" ? "로그인 중입니다…" : "계정을 만드는 중입니다…");
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "요청을 완료하지 못했습니다.");

    currentUser = result.user;
    showingMyPosts = false;
    authForm.reset();
    authMenu.hidden = true;
    closeAuthPanel();
    renderAuthState();
    pushAnalyticsEvent(authMode === "login" ? "login" : "sign_up", { method: "email" });
    setBoardStatus(`${currentUser.nickname} 님, 환영합니다.`);
    await Promise.all([loadPosts(), loadQuestions()]);
  } catch (error) {
    setAuthNotice(error.message || "가입 또는 로그인에 실패했습니다.", true);
  } finally {
    authSubmit.disabled = false;
  }
});

loadCurrentUser();

// Mobile Navigation Toggle
const navToggle = document.getElementById("nav-toggle");
const mainNav = document.getElementById("main-nav");
if (navToggle && mainNav) {
  navToggle.addEventListener("click", () => {
    const isOpen = mainNav.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
    navToggle.classList.toggle("is-active", isOpen);
  });
  mainNav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      if (window.innerWidth <= 1080) {
        mainNav.classList.remove("is-open");
        navToggle.setAttribute("aria-expanded", "false");
        navToggle.classList.remove("is-active");
      }
    });
  });
}
