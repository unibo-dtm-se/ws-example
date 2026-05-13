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

const {
    buildAuthHeader,
    checkUserCredentials,
    formatTimestamp,
    loadQuestionsPage,
    setStatus,
    updateQuestionListState,
} = window.AnonBoardCommon;

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

function updatePublicQuestionsState() {
    updateQuestionListState(publicList, publicEmpty, publicLoadMoreButton, publicHasMoreQuestions);
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
    const questions = await loadQuestionsPage(nextPage, publicQuestionsLimit);

    publicQuestionsPage = nextPage;
    publicHasMoreQuestions = questions.length === publicQuestionsLimit;
    renderPublicQuestions(questions, { append });
}

registerForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(registerForm);
    const nickname = String(formData.get("nickname") || "").trim();
    const password = String(formData.get("password") || "");

    const response = await fetch("/api/register", {
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
        const { response: authResponse, payload: authPayload } = await checkUserCredentials(nickname, password);
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

    if (!response.ok) {
        setStatus(registerStatus, payload.error || "Registration failed.", "error");
        return;
    }
});

questionForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!loggedInStudent) {
        setStatus(questionStatus, "Register or log in before posting a question.", "error");
        return;
    }

    const formData = new FormData(questionForm);
    const text = String(formData.get("text") || "").trim();

    const response = await fetch("/api/questions", {
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