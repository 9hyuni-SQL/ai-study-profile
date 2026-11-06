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
const nicknameField = document.getElementById("nickname");
const contentField = document.getElementById("post-content");
const postList = document.getElementById("post-list");
const postCount = document.getElementById("post-count");
const boardStatus = document.getElementById("board-status");
const submitPost = document.getElementById("submit-post");
const refreshPosts = document.getElementById("refresh-posts");
const commentStatus = document.getElementById("comment-status");
const questionNicknameField = document.getElementById("question-nickname");
const questionTitleField = document.getElementById("question-title");
const questionContentField = document.getElementById("question-content");
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

let currentUser = null;
let authMode = "register";
let showingMyPosts = false;

const setBoardStatus = (message = "", isError = false) => {
  boardStatus.textContent = message;
  boardStatus.classList.toggle("is-error", isError);
};

const setCommentStatus = (message = "", isError = false) => {
  commentStatus.textContent = message;
  commentStatus.classList.toggle("is-error", isError);
};

const setQuestionStatus = (message = "", isError = false) => {
  questionStatus.textContent = message;
  questionStatus.classList.toggle("is-error", isError);
};

const setAuthNotice = (message = "", isError = false) => {
  authNotice.textContent = message;
  authNotice.classList.toggle("is-error", isError);
};

const renderAuthState = () => {
  const loggedIn = Boolean(currentUser);
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

const editQuestion = async (question) => {
  const title = window.prompt("질문 제목을 수정해 주세요.", question.title);
  if (title === null) return;
  const content = window.prompt("질문 내용을 수정해 주세요.", question.body || "");
  if (content === null) return;
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
    await loadQuestions();
  } catch (error) {
    setQuestionStatus(error.message || "질문을 수정하지 못했어요.", true);
  }
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
    contentElement.textContent = content.trim();
    statusHandler("댓글을 수정했습니다.");
  } catch (error) {
  if (error.message || "댓글을 불러오지 못했어요.", true);
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

const loadComments = async (postId, commentsList, countLabel, statusHandler = setCommentStatus) => {
  try {
    const response = await fetch(`/api/posts/${postId}/comments`);
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "댓글을 불러오지 못했어요.");

    commentsList.replaceChildren();
    countLabel.textContent = `댓글 ${result.comments.length}개`;
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
      content.textContent = comment.content;
      meta.append(name, date);
      item.append(meta, content);
      if (currentUser) {
        const actions = document.createElement("div");
        actions.className = "comment-actions";
    const author = document.createElement("span");
    author.className = "owned-content-label";
    author.textContent = "내 질문";
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
        actions.append(reply);
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
  } catch (error) {
    statusHandler(error.message || "댓글을 불러오지 못했어요.", true);
  }

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
  const content = document.createElement("p");
  content.className = "post-content";
  content.textContent = question.body ?? question.content.split("\n").slice(1).join("\n");

  const commentsPanel = document.createElement("section");
  commentsPanel.className = "comments-panel";
  commentsPanel.setAttribute("aria-label", `${question.title} 답변`);
  const commentsHeading = document.createElement("div");
  commentsHeading.className = "comments-heading";
  const label = document.createElement("span");
  label.className = "comments-label";
  label.textContent = "답변 및 의견";
  const countLabel = document.createElement("span");
  countLabel.className = "comment-count";
  countLabel.textContent = "댓글 0개";
  commentsHeading.append(label, countLabel);
  const comments = document.createElement("ol");
  comments.className = "comment-list";
  const commentForm = createCommentForm(question.id, comments, countLabel, setQuestionStatus);
  commentsPanel.append(commentsHeading, comments, commentForm);

  meta.append(name, date);
  body.append(meta, title, content);
  if (currentUser && question.user_id === currentUser.id) {
    const actions = document.createElement("div");
    actions.className = "owned-content-actions";
        const edit = document.createElement("button");
    edit.type = "button";
    edit.textContent = "질문 수정";
    edit.addEventListener("click", () => editQuestion(question));
    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "질문 삭제";
    remove.addEventListener("click", () => deleteOwnedContent(`/api/posts/${question.id}`, item, setQuestionStatus));
    actions.append(author, edit, remove);
    body.append(actions);
  }
  body.append(commentsPanel);
  item.append(avatar, body);
  loadComments(question.id, comments, countLabel, setQuestionStatus);
  return item;
};

const loadQuestions = async () => {
  refreshQuestions.disabled = true;
  try {
    const response = await fetch(showingMyPosts ? "/api/me/posts?category=question" : "/api/questions", { credentials: "same-origin" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "질문을 불러오지 못했어요.");

    questionList.replaceChildren();
    questionCount.textContent = showingMyPosts ? `내 질문 ${result.posts.length}개` : `모두 ${result.posts.length}개의 질문`;
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
    setQuestionStatus();
  } catch (error) {
    setQuestionStatus(error.message || "질문을 불러오지 못했어요. 새로고침해 주세요.", true);
  } finally {
    refreshQuestions.disabled = false;
  }
};

const createCommentForm = (postId, commentsList, countLabel, statusHandler = setCommentStatus) => {
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
      statusHandler("댓글을 남겨주셔서 고마워요.");
      await loadComments(postId, commentsList, countLabel, statusHandler);
    } catch (error) {
      statusHandler(error.message || "댓글을 등록하지 못했어요.", true);
    } finally {
      button.disabled = false;
    }
  });
  return form;
};

const loadPosts = async () => {
  refreshPosts.disabled = true;
  try {
    const endpoint = showingMyPosts ? "/api/me/posts?category=greeting" : "/api/posts";
    const response = await fetch(endpoint, { credentials: "same-origin" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "게시글을 불러오지 못했어요.");

    postList.replaceChildren();
    postCount.textContent = showingMyPosts ? `내 가입인사 ${result.posts.length}개` : `${result.posts.length}개의 가입인사`;
    if (result.posts.length === 0) {
      const emptyItem = document.createElement("li");
      emptyItem.className = "empty-posts";
      emptyItem.textContent = "아직 가입인사가 없어요. 첫 번째 인사를 남겨주세요.";
      postList.append(emptyItem);
    } else {
      for (const post of result.posts) {
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
        countLabel.textContent = "댓글 0개";
        commentsHeading.append(commentsLabel, countLabel);
        const commentsList = document.createElement("ol");
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
        commentsList.className = "comment-list";
        const commentForm = createCommentForm(post.id, commentsList, countLabel, setBoardStatus);
        commentsPanel.append(commentsHeading, commentsList, commentForm);
        body.append(commentsPanel);
        item.append(avatar, body);
        postList.append(item);
        loadComments(post.id, commentsList, countLabel);
      }
    }
    setBoardStatus();
  } catch (error) {
    setBoardStatus(error.message || "게시글을 불러오지 못했어요. 잠시 후 새로고침해 주세요.", true);
  } finally {
    refreshPosts.disabled = false;
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
  const content = questionContentField.value.trim();
  if (!currentUser) {
    showLoginRequired();
    return;
  }
  if (!title || !content) {
    setQuestionStatus("질문 제목과 내용을 모두 입력해 주세요.", true);
    (!title ? questionTitleField : questionContentField).focus();
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
    setQuestionStatus("질문을 등록했습니다. 함께 답을 찾아봐요.");
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
    setBoardStatus(`${currentUser.nickname} 님, 환영합니다.`);
    await Promise.all([loadPosts(), loadQuestions()]);
  } catch (error) {
    setAuthNotice(error.message || "가입 또는 로그인에 실패했습니다.", true);
  } finally {
    authSubmit.disabled = false;
  }
});

loadCurrentUser();
loadPosts();
loadQuestions();
