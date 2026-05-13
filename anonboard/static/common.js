(function () {
    async function fetchJson(url, options = {}) {
        const response = await fetch(url, options);
        const payload = await response.json();
        return { response, payload };
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

    async function checkUserCredentials(nickname, password) {
        return fetchJson("/api/users/check", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ nickname, password }),
        });
    }

    async function loadQuestionsPage(page, limit) {
        const { response, payload } = await fetchJson(`/api/questions?page=${page}&limit=${limit}`);
        if (!response.ok) {
            throw new Error(payload.error || "Unable to load questions.");
        }

        return payload;
    }

    function updateQuestionListState(listElement, emptyElement, loadMoreButton, hasMoreItems) {
        emptyElement?.classList.toggle("hidden", listElement.children.length > 0);
        loadMoreButton?.classList.toggle("hidden", !hasMoreItems);
    }

    window.AnonBoardCommon = {
        buildAuthHeader,
        checkUserCredentials,
        formatTimestamp,
        loadQuestionsPage,
        setStatus,
        updateQuestionListState,
    };
})();