// public/javascripts/register.js
document.addEventListener("DOMContentLoaded", () => {
    const step1Form = document.getElementById("step1");
    const step2Form = document.getElementById("step2");
    const clientError = document.getElementById("clientError");
    const btnBack = document.getElementById("btnBack");

    function showClientError(message) {
        if (!clientError) return alert(message);
        clientError.textContent = message;
        clientError.classList.remove("d-none");
    }

    function clearClientError() {
        if (!clientError) return;
        clientError.textContent = "";
        clientError.classList.add("d-none");
    }

    function showStep(stepNum) {
        if (step1Form) step1Form.classList.toggle("d-none", stepNum !== 1);
        if (step2Form) step2Form.classList.toggle("d-none", stepNum !== 2);
    }

    async function postForm(action, fields = {}) {
        const formData = new URLSearchParams();
        formData.append("action", action);

        Object.entries(fields).forEach(([k, v]) => {
            formData.append(k, String(v ?? ""));
        });

        const response = await fetch("/users/register", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: formData.toString(),
        });

        // Try read JSON (server returns JSON for checkEmail/checkDraft)
        let data = {};
        try {
            data = await response.json();
        } catch {
            data = {};
        }

        if (!response.ok) {
            const msg = data?.error || `Request failed (${response.status})`;
            throw new Error(msg);
        }

        return data;
    }

    // simple validation: letters only (a-z). (same spirit as your assignment)
    function isLettersOnly(value) {
        return /^[A-Za-z]+$/.test(value);
    }

    // --- Step 1 Submit ---
    if (step1Form) {
        step1Form.addEventListener("submit", async (e) => {
            e.preventDefault();
            clearClientError();

            const firstName = String(document.getElementById("firstName")?.value || "").trim();
            const lastName = String(document.getElementById("lastName")?.value || "").trim();
            const email = String(document.getElementById("email")?.value || "").trim().toLowerCase();

            if (!firstName || !lastName || !email) {
                showClientError("Missing required fields.");
                return;
            }

            // Optional: keep the same rules you had in HTML (a-z only, 3-32)
            if (firstName.length < 3 || lastName.length < 3) {
                showClientError("First name and last name must be at least 3 letters.");
                return;
            }
            if (firstName.length > 32 || lastName.length > 32) {
                showClientError("First name and last name must be at most 32 letters.");
                return;
            }
            if (!isLettersOnly(firstName) || !isLettersOnly(lastName)) {
                showClientError("First name and last name must contain letters a-z only.");
                return;
            }

            try {
                const data = await postForm("checkEmail", { firstName, lastName, email });
                if (data.success) showStep(2);
            } catch (err) {
                showClientError(err.message);
            }
        });
    }

    // --- Step 2 Submit (client-side validation only) ---
    if (step2Form) {
        step2Form.addEventListener("submit", (e) => {
            clearClientError();

            const p1 = String(step2Form.querySelector('input[name="password1"]')?.value || "").trim();
            const p2 = String(step2Form.querySelector('input[name="password2"]')?.value || "").trim();

            if (!p1 || !p2) {
                e.preventDefault();
                showClientError("Please enter password in both fields.");
                return;
            }

            if (p1 !== p2) {
                e.preventDefault();
                showClientError("Passwords do not match.");
            }
        });
    }

    // --- Back Button ---
    if (btnBack) {
        btnBack.addEventListener("click", async () => {
            clearClientError();

            try {
                const data = await postForm("checkDraft");

                // Always go back to step 1 UI
                showStep(1);

                if (!data.valid) {
                    const firstNameEl = document.getElementById("firstName");
                    const lastNameEl = document.getElementById("lastName");
                    const emailEl = document.getElementById("email");

                    if (firstNameEl) firstNameEl.value = "";
                    if (lastNameEl) lastNameEl.value = "";
                    if (emailEl) emailEl.value = "";

                    showClientError(data.error || "Register step expired. Please start again.");
                }
            } catch (err) {
                showStep(1);
                showClientError(err.message || "Network error. Please try again.");
            }
        });
    }
});
