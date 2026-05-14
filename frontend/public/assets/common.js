(() => {
    const defaultApiBaseUrl = "http://127.0.0.1:5000";
    const apiBaseUrl = String(window.__APP_CONFIG__?.BACKEND_API_URL || defaultApiBaseUrl);

    function buildApiUrl(path) {
        return new URL(path, `${apiBaseUrl.replace(/\/$/, "")}/`).toString();
    }

    function setStatus(element, message, kind = "") {
        if (!element) {
            return;
        }

        element.textContent = message;
        element.className = `status-text ${kind}`.trim();
    }

    function buildAuthHeader(nickname, password) {
        return `Basic ${btoa(`${nickname}:${password}`)}`;
    }

    function formatTimestamp(timestamp) {
        return new Date(timestamp).toLocaleString();
    }

    async function fetchJson(path, options) {
        const response = await fetch(buildApiUrl(path), options);
        const payload = await response.json();
        return { response, payload };
    }

    async function fetchQuestionsPage(page, limit) {
        const { response, payload } = await fetchJson(`api/questions?page=${page}&limit=${limit}`);
        if (!response.ok) {
            throw new Error(payload.error || "Unable to load questions.");
        }

        return payload;
    }

    function createQuestionListItem(question, footerNode = null) {
        const item = document.createElement("li");
        item.className = "question-item";

        const header = document.createElement("div");
        header.className = "question-header";

        const meta = document.createElement("div");
        meta.className = "question-meta";

        const author = document.createElement("strong");
        author.textContent = question.author;

        const timestamp = document.createElement("span");
        timestamp.textContent = formatTimestamp(question.timestamp);

        meta.append(author, timestamp);

        const mark = document.createElement("span");
        mark.className = `mark ${question.answered ? "mark-answered" : "mark-pending"}`;
        mark.textContent = question.answered ? "Answered" : "Pending";

        header.append(meta, mark);

        const text = document.createElement("p");
        text.className = "question-text";
        text.textContent = question.text;

        item.append(header, text);

        if (footerNode) {
            item.append(footerNode);
        }

        return item;
    }

    window.AnonBoardCommon = {
        buildApiUrl,
        setStatus,
        buildAuthHeader,
        formatTimestamp,
        fetchJson,
        fetchQuestionsPage,
        createQuestionListItem,
    };
})();