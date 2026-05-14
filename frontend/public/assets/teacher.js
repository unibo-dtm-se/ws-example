const teacherAuthForm = document.querySelector("#teacher-auth-form");
const teacherAuthCard = document.querySelector("#teacher-auth-card");
const teacherStatus = document.querySelector("#teacher-auth-status");
const teacherLogoutButton = document.querySelector("#teacher-logout");
const questionsList = document.querySelector("#questions-list");
const questionsEmpty = document.querySelector("#questions-empty");
const refreshButton = document.querySelector("#refresh-questions");
const loadMoreButton = document.querySelector("#load-more-questions");

const {
    buildAuthHeader,
    createQuestionListItem,
    fetchJson,
    fetchQuestionsPage,
    setStatus,
} = window.AnonBoardCommon;

let teacherLoggedIn = false;
let questionsPage = 1;
let hasMoreQuestions = false;

const questionsLimit = 10;

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
    setStatus(teacherStatus, message, kind);
}

async function checkTeacherCredentials(nickname, password) {
    const { response, payload } = await fetchJson("api/users/check", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ nickname, password }),
    });

    if (!response.ok) {
        return { ok: false, message: payload.error || "Invalid credentials." };
    }

    if (!payload.is_admin) {
        return { ok: false, message: "Teacher credentials required." };
    }

    return { ok: true, payload };
}

function setTeacherLoggedIn(nextState) {
    teacherLoggedIn = nextState;
    teacherAuthCard?.classList.toggle("hidden", nextState);
    teacherLogoutButton?.classList.toggle("hidden", !nextState);
}

function updateQuestionListState() {
    questionsEmpty.classList.toggle("hidden", questionsList.children.length > 0);
    loadMoreButton?.classList.toggle("hidden", !hasMoreQuestions);
}

function renderQuestions(questions, { append = false } = {}) {
    if (!append) {
        questionsList.innerHTML = "";
    }

    for (const question of questions) {
        const footer = document.createElement("div");
        footer.className = "question-footer";

        const toggle = document.createElement("button");
        toggle.type = "button";
        toggle.textContent = question.answered ? "Mark as pending" : "Mark as answered";
        toggle.disabled = !teacherLoggedIn;
        toggle.addEventListener("click", () => updateQuestionMark(question.id, !question.answered));

        footer.append(toggle);
        questionsList.append(createQuestionListItem(question, footer));
    }

    updateQuestionListState();
}

async function loadQuestions({ append = false } = {}) {
    const nextPage = append ? questionsPage + 1 : 1;
    const questions = await fetchQuestionsPage(nextPage, questionsLimit);

    questionsPage = nextPage;
    hasMoreQuestions = questions.length === questionsLimit;
    renderQuestions(questions, { append });
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

    const { response, payload } = await fetchJson(`api/questions/${questionId}`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
            "Authorization": buildAuthHeader(credentials.nickname, credentials.password),
        },
        body: JSON.stringify({ answered }),
    });

    if (!response.ok) {
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

    const result = await checkTeacherCredentials(nickname, password);
    if (!result.ok) {
        clearTeacherCredentials();
        setTeacherLoggedIn(false);
        setTeacherStatus(result.message, "error");
        await loadQuestions();
        return;
    }

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

loadMoreButton?.addEventListener("click", () => {
    loadQuestions({ append: true }).catch(() => {
        setTeacherStatus("Unable to load more questions right now.", "error");
    });
});

loadQuestions().catch(() => {
    setTeacherStatus("Unable to load questions right now.", "error");
});