const teacherAuthForm = document.querySelector("#teacher-auth-form");
const teacherAuthCard = document.querySelector("#teacher-auth-card");
const teacherStatus = document.querySelector("#teacher-auth-status");
const teacherLogoutButton = document.querySelector("#teacher-logout");
const questionsList = document.querySelector("#questions-list");
const questionsEmpty = document.querySelector("#questions-empty");
const refreshButton = document.querySelector("#refresh-questions");

let teacherLoggedIn = false;

function readTeacherCredentials() {
    return {
        nickname: localStorage.getItem("anonboard.teacher.nickname") || "",
        password: localStorage.getItem("anonboard.teacher.password") || "",
    };
}

function saveTeacherCredentials(nickname, password) {
    localStorage.setItem("anonboard.teacher.nickname", nickname);
    localStorage.setItem("anonboard.teacher.password", password);
}

function clearTeacherCredentials() {
    localStorage.removeItem("anonboard.teacher.nickname");
    localStorage.removeItem("anonboard.teacher.password");
}

function setTeacherStatus(message, kind = "") {
    teacherStatus.textContent = message;
    teacherStatus.className = `status-text ${kind}`.trim();
}

function buildAuthHeader(nickname, password) {
    return `Basic ${btoa(`${nickname}:${password}`)}`;
}

function setTeacherLoggedIn(nextState) {
    teacherLoggedIn = nextState;
    teacherAuthCard?.classList.toggle("hidden", nextState);
    teacherLogoutButton?.classList.toggle("hidden", !nextState);
}

function formatTimestamp(timestamp) {
    return new Date(timestamp).toLocaleString();
}

function renderQuestions(questions) {
    questionsList.innerHTML = "";
    questionsEmpty.classList.toggle("hidden", questions.length > 0);

    for (const question of questions) {
        const item = document.createElement("li");
        item.className = "question-item";

        const header = document.createElement("div");
        header.className = "question-header";

        const meta = document.createElement("div");
        meta.className = "question-meta";
        meta.innerHTML = `<strong>${question.author}</strong><span>${formatTimestamp(question.timestamp)}</span>`;

        const mark = document.createElement("span");
        mark.className = `mark ${question.answered ? "mark-answered" : "mark-pending"}`;
        mark.textContent = question.answered ? "Answered" : "Pending";

        header.append(meta, mark);

        const text = document.createElement("p");
        text.className = "question-text";
        text.textContent = question.text;

        const footer = document.createElement("div");
        footer.className = "question-footer";

        const toggle = document.createElement("button");
        toggle.type = "button";
        toggle.textContent = question.answered ? "Mark as pending" : "Mark as answered";
        toggle.disabled = !teacherLoggedIn;
        toggle.addEventListener("click", () => updateQuestionMark(question.id, !question.answered));

        footer.append(toggle);
        item.append(header, text, footer);
        questionsList.append(item);
    }
}

async function loadQuestions() {
    const response = await fetch("/api/questions");
    const questions = await response.json();
    renderQuestions(questions);
}

async function updateQuestionMark(questionId, answered) {
    if (!teacherLoggedIn) {
        setTeacherStatus("Log in as teacher before changing question state.", "error");
        return;
    }

    const credentials = readTeacherCredentials();
    if (!credentials.nickname || !credentials.password) {
        setTeacherLoggedIn(false);
        setTeacherStatus("Log in as teacher before changing question state.", "error");
        return;
    }

    const response = await fetch(`/api/questions/${questionId}`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
            "Authorization": buildAuthHeader(credentials.nickname, credentials.password),
        },
        body: JSON.stringify({ answered }),
    });

    if (!response.ok) {
        const payload = await response.json();
        setTeacherStatus(payload.error || "Failed to update question.", "error");
        return;
    }

    setTeacherStatus("Question state updated.", "success");
    await loadQuestions();
}

teacherAuthForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(teacherAuthForm);
    const nickname = String(formData.get("nickname") || "").trim();
    const password = String(formData.get("password") || "");

    saveTeacherCredentials(nickname, password);
    setTeacherLoggedIn(true);
    setTeacherStatus("Teacher credentials saved in local storage.", "success");
    await loadQuestions();
});

teacherLogoutButton?.addEventListener("click", async () => {
    clearTeacherCredentials();
    setTeacherLoggedIn(false);
    setTeacherStatus("Teacher logged out.", "success");
    await loadQuestions();
});

refreshButton?.addEventListener("click", () => {
    loadQuestions().catch(() => {
        setTeacherStatus("Unable to refresh questions right now.", "error");
    });
});

const initialCredentials = readTeacherCredentials();
const nicknameField = document.querySelector("#teacher-nickname");
const passwordField = document.querySelector("#teacher-password");
if (nicknameField && passwordField) {
    nicknameField.value = initialCredentials.nickname;
    passwordField.value = initialCredentials.password;
}

async function initializeTeacherView() {
    setTeacherLoggedIn(Boolean(initialCredentials.nickname && initialCredentials.password));

    if (teacherLoggedIn) {
        setTeacherStatus("Teacher credentials restored from local storage.", "success");
    }

    await loadQuestions();
}

initializeTeacherView().catch(() => {
    setTeacherStatus("Unable to load questions right now.", "error");
});