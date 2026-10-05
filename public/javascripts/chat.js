// public/javascripts/chat.js
document.addEventListener("DOMContentLoaded", () => {
    const messagesList = document.getElementById("messagesList");
    const chatForm = document.getElementById("chatForm");
    const msgInput = document.getElementById("msgInput");
    const sendBtn = document.getElementById("sendBtn");
    const currentUser = document.getElementById("currentUser")?.value || "";

    // Search input
    const searchInput = document.getElementById("searchInput");
    let currentSearch = "";
    let searchTimer = null;

    const serverTabId = document.getElementById("serverTabId")?.value || "";

    // ---- TAB ID (per-tab) ----
    let tabId = serverTabId || sessionStorage.getItem("tabId") || "";
    if (!tabId) {
        tabId =
            (crypto?.randomUUID?.() ||
                "client_" + Date.now() + "_" + Math.random().toString(16).slice(2));
    }
    sessionStorage.setItem("tabId", tabId);

    // Bootstrap modal setup
    const modalEl = document.getElementById("appModal");
    const modal = modalEl ? new bootstrap.Modal(modalEl) : null;
    const modalTitle = document.getElementById("appModalTitle");
    const modalBody = document.getElementById("appModalBody");
    const modalFooter = document.getElementById("appModalFooter");

    let lastMessages = [];

    // IMPORTANT: avoid TDZ bug (handleUnauthorized uses pollId)
    let pollId = null;

    // ---------------- Helpers ----------------
    function toggleSendBtn() {
        if (!sendBtn || !msgInput) return;
        sendBtn.disabled = msgInput.value.trim().length === 0;
    }

    function autoGrow() {
        if (!msgInput) return;
        msgInput.style.height = "auto";
        msgInput.style.height = Math.min(msgInput.scrollHeight, 120) + "px";
    }

    function escapeHtml(str) {
        return String(str)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function formatTime(dateValue) {
        return new Date(dateValue).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }

    function scrollBottom() {
        if (!messagesList) return;
        messagesList.scrollTop = messagesList.scrollHeight;
    }

    function isNearBottom() {
        if (!messagesList) return true;
        const distance = messagesList.scrollHeight - messagesList.scrollTop - messagesList.clientHeight;
        return distance < 140;
    }

    function getScrollState() {
        if (!messagesList) return null;
        return { top: messagesList.scrollTop, height: messagesList.scrollHeight, nearBottom: isNearBottom() };
    }

    function restoreScrollState(state) {
        if (!messagesList || !state) return;

        if (state.nearBottom) {
            scrollBottom();
            return;
        }

        const newHeight = messagesList.scrollHeight;
        const delta = newHeight - state.height;
        messagesList.scrollTop = state.top + delta;
    }

    // Redirect helper on 401/session ended
    function handleUnauthorized() {
        if (pollId) clearInterval(pollId);
        window.location.href = "/?error=session";
    }

    // ---------------- Modal helpers ----------------
    function openInfoModal(title, msg) {
        if (!modal) return alert(`${title}\n${msg}`);

        modalTitle.textContent = title;

        modalBody.innerHTML = `
      <div class="d-flex gap-2 align-items-start">
        <div class="rounded-circle bg-success bg-opacity-25 d-flex align-items-center justify-content-center"
             style="width:36px;height:36px;">
          <span class="text-success fw-bold">i</span>
        </div>
        <div class="text-white">${escapeHtml(msg)}</div>
      </div>
    `;

        modalFooter.innerHTML = `
      <button type="button" class="btn btn-success rounded-pill px-4" data-bs-dismiss="modal">
        OK
      </button>
    `;

        modal.show();
    }

    function openConfirmModal(title, msg, confirmText, onConfirm) {
        if (!modal) {
            const ok = confirm(`${title}\n${msg}`);
            if (ok) onConfirm();
            return;
        }

        modalTitle.textContent = title;

        modalBody.innerHTML = `
      <div class="d-flex gap-2 align-items-start">
        <div class="rounded-circle bg-danger bg-opacity-25 d-flex align-items-center justify-content-center"
             style="width:36px;height:36px;">
          <span class="text-danger fw-bold">!</span>
        </div>
        <div class="text-white">${escapeHtml(msg)}</div>
      </div>
    `;

        modalFooter.innerHTML = `
      <button type="button" class="btn btn-outline-light rounded-pill px-4" data-bs-dismiss="modal">
        Cancel
      </button>
      <button type="button" class="btn btn-danger rounded-pill px-4" id="confirmBtn">
        ${escapeHtml(confirmText)}
      </button>
    `;

        modal.show();

        document.getElementById("confirmBtn").addEventListener(
            "click",
            async () => {
                try {
                    await onConfirm();
                    modal.hide();
                } catch (e) {
                    openInfoModal("Error", "Operation failed.");
                }
            },
            { once: true }
        );
    }

    function openEditModal(oldText, onSave) {
        if (!modal) {
            const newText = prompt("Edit message:", oldText);
            if (newText == null) return;
            const trimmed = newText.trim();
            if (!trimmed) return alert("Message cannot be empty.");
            onSave(trimmed);
            return;
        }

        modalTitle.textContent = "Edit message";

        modalBody.innerHTML = `
      <label class="form-label fw-semibold text-white">Message</label>
      <textarea id="editInput" class="form-control bg-dark text-white border-secondary" rows="3"
                style="border-radius: 14px; resize:none;"></textarea>
      <div class="form-text text-white-50">Edit your message and press Save.</div>
    `;

        modalFooter.innerHTML = `
      <button type="button" class="btn btn-outline-light rounded-pill px-4" data-bs-dismiss="modal">
        Cancel
      </button>
      <button type="button" class="btn btn-success rounded-pill px-4" id="saveBtn">
        Save
      </button>
    `;

        modal.show();

        const editInput = document.getElementById("editInput");
        editInput.value = oldText;

        document.getElementById("saveBtn").addEventListener(
            "click",
            async () => {
                const newText = editInput.value.trim();
                if (!newText) return openInfoModal("Error", "Message cannot be empty.");

                try {
                    await onSave(newText);
                    modal.hide();
                } catch (e) {
                    openInfoModal("Error", "Failed to edit message.");
                }
            },
            { once: true }
        );
    }

    // ====== submit delete as FORM (no fetch) ======
    function submitDeleteForm(messageId) {
        const form = document.createElement("form");
        form.method = "POST";
        form.action = `/chat/messages/${messageId}/delete`;
        document.body.appendChild(form);
        form.submit();
    }

    // ---------------- Unified API fetch (NO swallowed responses) ----------------
    async function apiFetch(url, options = {}) {
        const res = await fetch(url, {
            ...options,
            headers: {
                ...(options.headers || {}),
                Accept: "application/json",
                "x-tab-id": tabId,
            },
        });

        if (res.status === 401) {
            // Try to read error, then redirect
            try {
                await res.json();
            } catch {}
            handleUnauthorized();
            return null;
        }

        if (!res.ok) {
            let payload = null;
            try {
                payload = await res.json();
            } catch {}
            openInfoModal("Error", payload?.error || `Request failed (${res.status})`);
            return null;
        }

        try {
            return await res.json();
        } catch {
            return null;
        }
    }

    // ---------------- Search ----------------
    if (searchInput) {
        searchInput.addEventListener("input", () => {
            currentSearch = searchInput.value;

            clearTimeout(searchTimer);
            searchTimer = setTimeout(() => {
                fetchMessages();
            }, 300);
        });
    }

    // ---------------- Input events ----------------
    if (msgInput) {
        msgInput.addEventListener("input", () => {
            toggleSendBtn();
            autoGrow();
        });

        msgInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (sendBtn && !sendBtn.disabled) chatForm.requestSubmit();
            }
        });

        toggleSendBtn();
        autoGrow();
    }

    // ---------------- Fetch loop ----------------
    const POLLING = 10 * 1000; // requirement
    fetchMessages();
    pollId = setInterval(fetchMessages, POLLING);

    async function fetchMessages() {
        const scrollState = getScrollState();

        const q = String(currentSearch || "").trim();
        const url = q ? `/chat/messages?search=${encodeURIComponent(q)}` : `/chat/messages`;

        const payload = await apiFetch(url);
        if (!payload) return;

        const messages = Array.isArray(payload.messages) ? payload.messages : [];
        lastMessages = messages;

        renderMessages(lastMessages);

        const loading = document.getElementById("loadingState");
        if (loading) loading.classList.add("d-none");

        restoreScrollState(scrollState);
    }

    // ---------------- Render ----------------
    function isSystemMessage(msg) {
        return msg?.type === "system" || msg?.senderEmail === "system@chat.com" || msg?.senderName === "System";
    }

    function renderSystemMessage(msg) {
        const text = escapeHtml(msg.text || "");
        return `
      <div class="d-flex justify-content-center my-2">
        <div class="px-3 py-1 rounded-pill shadow-sm bg-white bg-opacity-75" style="font-size:0.85rem;">
          <span class="text-dark">${text}</span>
        </div>
      </div>
    `;
    }

    function renderUserMessage(msg) {
        const isMine = msg.senderEmail === currentUser;
        const alignClass = isMine ? "justify-content-end" : "justify-content-start";

        const bubbleBg = isMine ? "#d9fdd3" : "rgba(255,255,255,0.92)";
        const bubbleBorder = "rgba(0,0,0,0.06)";

        const safeText = escapeHtml(msg.text || "");

        const isArabic = /[\u0600-\u06FF]/.test(msg.text || "");
        const dir = isArabic ? "rtl" : "ltr";
        const textAlign = isArabic ? "right" : "left";

        const senderLine = !isMine
            ? `<div class="fw-semibold mb-1" style="font-size:0.72rem; color:#0a7c62; opacity:.85;">
           ${escapeHtml(msg.senderName || msg.senderEmail)}
         </div>`
            : "";

        const editedLabel = msg.isEdited
            ? `<span class="text-muted fst-italic" style="font-size:0.72rem;">Edited</span>`
            : "";

        const menuBtn = isMine
            ? `
        <div class="dropdown dropup ms-1">
          <button class="btn btn-sm btn-link text-muted p-0 text-decoration-none"
                  type="button"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                  title="Options">
            <span style="font-size:16px; line-height:1;">⋯</span>
          </button>

          <ul class="dropdown-menu dropdown-menu-end shadow-sm border-0"
              style="min-width: 160px; border-radius: 12px; padding: 6px;">
            <li>
              <button class="dropdown-item d-flex align-items-center gap-2 rounded-3 py-2"
                      type="button" data-action="edit" data-id="${msg.id}">
                <i class="bi bi-pencil-square"></i>
                <span>Edit</span>
              </button>
            </li>
            <li>
              <button class="dropdown-item d-flex align-items-center gap-2 rounded-3 py-2 text-danger"
                      type="button" data-action="delete" data-id="${msg.id}">
                <i class="bi bi-trash3"></i>
                <span>Delete</span>
              </button>
            </li>
          </ul>
        </div>
      `
            : "";

        const tailSide = isMine ? "right" : "left";
        const tail = `
      <span style="
        position:absolute;
        top: 12px;
        ${tailSide}: -9px;
        width:0; height:0;
        border-top:8px solid transparent;
        border-bottom:8px solid transparent;
        ${isMine ? `border-left: 11px solid ${bubbleBg};` : `border-right: 11px solid ${bubbleBg};`}
      "></span>
    `;

        return `
      <div class="d-flex ${alignClass} mb-2">
        <div style="max-width: 70%; min-width: 120px;">
          <div class="position-relative shadow-sm"
               style="
                  background:${bubbleBg};
                  border:1px solid ${bubbleBorder};
                  border-radius: 14px;
                  padding: 8px 10px 6px 10px;
               ">
            ${tail}
            ${senderLine}

            <div style="
              white-space: pre-wrap;
              line-height: 1.4;
              direction:${dir};
              text-align:${textAlign};
            ">${safeText}</div>

            <div class="d-flex align-items-center justify-content-end gap-2 mt-1">
              ${editedLabel}
              <small class="text-muted opacity-75" style="font-size:0.72rem;">
                ${formatTime(msg.date)}
              </small>
              ${menuBtn}
            </div>
          </div>
        </div>
      </div>
    `;
    }

    function renderMessages(messages) {
        if (!messagesList) return;

        if (!messages || messages.length === 0) {
            messagesList.innerHTML = `<div class="text-center text-white-50 mt-5">No messages yet.</div>`;
            return;
        }

        messagesList.innerHTML = messages
            .map((msg) => (isSystemMessage(msg) ? renderSystemMessage(msg) : renderUserMessage(msg)))
            .join("");
    }

    // ---------------- Send message (FORM submit - no fetch) ----------------
    if (chatForm) {
        chatForm.addEventListener("submit", (e) => {
            const text = msgInput.value.trim();

            // prevent empty submit only
            if (!text) {
                e.preventDefault();
                return;
            }

            // allow normal submit -> server redirects back to /chat
        });
    }

    // ---------------- Actions (event delegation) ----------------
    if (messagesList) {
        messagesList.addEventListener("click", (e) => {
            const btn = e.target.closest("button");
            if (!btn) return;

            const action = btn.dataset.action;
            const id = btn.dataset.id;
            if (!action || !id) return;

            if (action === "delete") {
                const msg = lastMessages.find((m) => String(m.id) === String(id));
                const preview = msg ? `"${msg.text}"` : "";

                openConfirmModal(
                    "Delete message",
                    `Are you sure? Deleting a message cannot be undone.\n\n${preview}`,
                    "Delete",
                    async () => {
                        // submit normal form (no fetch)
                        submitDeleteForm(id);
                    }
                );
            }

            if (action === "edit") {
                const msg = lastMessages.find((m) => String(m.id) === String(id));
                if (!msg) return openInfoModal("Error", "Message not found.");

                openEditModal(msg.text, async (newText) => {
                    const payload = await apiFetch(`/chat/messages/${id}/edit`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ id, text: newText }),
                    });

                    if (!payload) return;
                    await fetchMessages();
                });
            }
        });
    }
});
