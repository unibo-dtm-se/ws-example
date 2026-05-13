const registerForm = document.querySelector("#register-form");
const registerStatus = document.querySelector("#register-status");
const registerCard = document.querySelector("#register-card");
const questionCard = document.querySelector("#question-card");
const questionForm = document.querySelector("#question-form");
const questionStatus = document.querySelector("#question-status");
const publicList = document.querySelector("#public-questions-list");
const publicEmpty = document.querySelector("#public-questions-empty");
const publicRefreshButton = document.querySelector("#refresh-public-questions");
const publicLoadMoreButton = document.querySelector("#load-more-public-questions");
const questionNicknameInput = document.querySelector("#question-nickname");
const questionTextInput = document.querySelector("#question-text");

let loggedInStudent = null;
let publicQuestionsPage = 1;
let publicHasMoreQuestions = false;

const publicQuestionsLimit = 10;
const apiBaseUrl = String(window.__APP_CONFIG__?.BACKEND_API_URL || "http://127.0.0.1:5000");

function buildApiUrl(path) {
    return new URL(path, `${apiBaseUrl.replace(/\/$/, "")}/`).toString();
}

function setStatus(element, message, kind = "") {
    element.textContent = message;
    element.className = `status-text ${kind}`.trim();
}

function buildAuthHeader(nickname, password) {
    return `Basic ${btoa(`${nickname}:${password}`)}`;
}

function setLoggedInStudent(student) {
    loggedInStudent = student;
    registerCard?.classList.toggle("hidden", Boolean(student));
    questionCard?.classList.toggle("hidden", !student);
    questionNicknameInput.value = student?.nickname || "";
    if (!student) {
        questionForm?.reset();
        questionStatus.textContent = "";
        questionStatus.className = "status-text";
    }
}

async function authenticateStudent(nickname, password) {
    const response = await fetch(buildApiUrl("api/users/check"), {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ nickname, password }),
    });

    const payload = await response.json();
    return { response, payload };
}

function formatTimestamp(timestamp) {
    return new Date(timestamp).toLocaleString();
}

function updatePublicQuestionsState() {
    publicEmpty.classList.toggle("hidden", publicList.children.length > 0);
    publicLoadMoreButton?.classList.toggle("hidden", !publicHasMoreQuestions);
}

function renderPublicQuestions(questions, { append = false } = {}) {
    if (!append) {
        publicList.innerHTML = "";
    }

    for (const question of questions) {
        const item = document.createElement("li");
        item.className = "question-item";
        item.innerHTML = `
            <div class="question-header">
                <div class="question-meta">
                    <strong>${question.author}</strong>
                    <span>${formatTimestamp(question.timestamp)}</span>
                </div>
                <span class="mark ${question.answered ? "mark-answered" : "mark-pending"}">${question.answered ? "Answered" : "Pending"}</span>
            </div>
            <p class="question-text"></p>
        `;
        item.querySelector(".question-text").textContent = question.text;
        publicList.append(item);
    }

    updatePublicQuestionsState();
}

async function loadPublicQuestions({ append = false } = {}) {
    const nextPage = append ? publicQuestionsPage + 1 : 1;
    const response = await fetch(
        buildApiUrl(`api/questions?page=${nextPage}&limit=${publicQuestionsLimit}`)
    );
    const questions = await response.json();
    if (!response.ok) {
        throw new Error(questions.error || "Unable to load questions.");
    }

    publicQuestionsPage = nextPage;
    publicHasMoreQuestions = questions.length === publicQuestionsLimit;
    renderPublicQuestions(questions, { append });
}

registerForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(registerForm);
    const nickname = String(formData.get("nickname") || "").trim();
    const password = String(formData.get("password") || "");

    const response = await fetch(buildApiUrl("api/register"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname, password }),
    });

    const payload = await response.json();
    if (response.ok) {
        setLoggedInStudent({ nickname, password });
        setStatus(registerStatus, `Nickname ${payload.nickname} ready to post.`, "success");
        registerForm.reset();
        questionTextInput.focus();
        return;
    }

    if (response.status === 409) {
        const { response: authResponse, payload: authPayload } = await authenticateStudent(nickname, password);
        if (authResponse.ok) {
            setLoggedInStudent({ nickname, password });
            setStatus(registerStatus, `Welcome back, ${authPayload.nickname}.`, "success");
            registerForm.reset();
            questionTextInput.focus();
            return;
        }

        setStatus(registerStatus, authPayload.error || "Invalid credentials.", "error");
        return;
    }

    setStatus(registerStatus, payload.error || "Registration failed.", "error");
});

questionForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!loggedInStudent) {
        setStatus(questionStatus, "Register or log in before posting a question.", "error");
        return;
    }

    const formData = new FormData(questionForm);
    const text = String(formData.get("text") || "").trim();

    const response = await fetch(buildApiUrl("api/questions"), {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": buildAuthHeader(loggedInStudent.nickname, loggedInStudent.password),
        },
        body: JSON.stringify({ text }),
    });

    const payload = await response.json();
    if (!response.ok) {
        setStatus(questionStatus, payload.error || "Question submission failed.", "error");
        return;
    }

    setStatus(questionStatus, "Question sent successfully.", "success");
    questionTextInput.value = "";
    await loadPublicQuestions();
});

publicRefreshButton?.addEventListener("click", () => {
    loadPublicQuestions().catch(() => {
        setStatus(questionStatus, "Unable to refresh questions right now.", "error");
    });
});

publicLoadMoreButton?.addEventListener("click", () => {
    loadPublicQuestions({ append: true }).catch(() => {
        setStatus(questionStatus, "Unable to load more questions right now.", "error");
    });
});

loadPublicQuestions().catch(() => {
    setStatus(questionStatus, "Unable to load questions right now.", "error");
});