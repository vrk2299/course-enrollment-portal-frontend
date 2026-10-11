"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const API_BASE = "/api";

    // Support common field names and IDs.
    const findField = (form, selectors) =>
        form.querySelector(selectors);

    const forms = Array.from(document.querySelectorAll("form"));

    const form = forms.find((candidate) => {
        const name = findField(
            candidate,
            '[name="name"], #name, #fullName, #studentName'
        );
        const email = findField(
            candidate,
            '[name="email"], #email'
        );
        const course = findField(
            candidate,
            '[name="course"], #course'
        );

        return name && email && course;
    });

    if (!form) {
        console.error(
            "Enrollment form not found. Check the name, email, and course field IDs."
        );
        return;
    }

    const nameField = findField(
        form,
        '[name="name"], #name, #fullName, #studentName'
    );

    const emailField = findField(
        form,
        '[name="email"], #email'
    );

    const courseField = findField(
        form,
        '[name="course"], #course'
    );

    // Create an accessible status message without requiring HTML changes.
    const status = document.createElement("div");
    status.className = "form-status";
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    status.style.marginTop = "16px";
    status.style.padding = "12px";
    status.style.borderRadius = "8px";
    status.style.display = "none";
    form.appendChild(status);

    function showStatus(message, type) {
        status.textContent = message;
        status.style.display = "block";
        status.style.color = type === "success" ? "#166534" : "#991b1b";
        status.style.background =
            type === "success" ? "#dcfce7" : "#fee2e2";
        status.style.border =
            type === "success"
                ? "1px solid #86efac"
                : "1px solid #fca5a5";
    }

    // Populate the course dropdown using the real backend response.
    async function loadCourses() {
        if (courseField.tagName !== "SELECT") {
            return;
        }

        try {
            const response = await fetch(`${API_BASE}/courses`);

            if (!response.ok) {
                throw new Error("Could not load courses.");
            }

            const data = await response.json();

            if (!Array.isArray(data.courses)) {
                throw new Error("Unexpected course-list response.");
            }

            const previousValue = courseField.value;
            const placeholder = document.createElement("option");

            placeholder.value = "";
            placeholder.textContent = "Select a course";

            courseField.replaceChildren(placeholder);

            data.courses.forEach((course) => {
                const option = document.createElement("option");
                option.value = course.name;
                option.textContent = course.name;
                courseField.appendChild(option);
            });

            if (
                Array.from(courseField.options).some(
                    (option) => option.value === previousValue
                )
            ) {
                courseField.value = previousValue;
            }

        } catch (error) {
            console.error("Course loading error:", error);
            showStatus(
                "We couldn't load courses. Please refresh the page and try again.",
                "error"
            );
        }
    }

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const name = nameField.value.trim();
        const email = emailField.value.trim();
        const course = courseField.value.trim();

        if (!name || !email || !course) {
            showStatus(
                "Please enter your name, email, and select a course.",
                "error"
            );
            return;
        }

        const submitButtons = Array.from(
            form.querySelectorAll(
                'button[type="submit"], input[type="submit"], button:not([type])'
            )
        );

        const originalLabels = submitButtons.map((button) =>
            button.tagName === "INPUT" ? button.value : button.textContent
        );

        submitButtons.forEach((button) => {
            button.disabled = true;

            if (button.tagName === "INPUT") {
                button.value = "Submitting...";
            } else {
                button.textContent = "Submitting...";
            }
        });

        status.style.display = "none";

        try {
            const response = await fetch(`${API_BASE}/enrollments`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ name, email, course })
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(
                    data.error || "Enrollment failed. Please try again."
                );
            }

            const enrollmentId = data.enrollment?.id;

            showStatus(
                `Enrollment successful! ${
                    enrollmentId
                        ? `Your enrollment ID is ${enrollmentId}.`
                        : "Thank you for registering."
                }`,
                "success"
            );

            form.reset();

        } catch (error) {
            console.error("Enrollment error:", error);

            showStatus(
                error.message ||
                    "Unable to submit your enrollment. Please try again.",
                "error"
            );

        } finally {
            submitButtons.forEach((button, index) => {
                button.disabled = false;

                if (button.tagName === "INPUT") {
                    button.value = originalLabels[index];
                } else {
                    button.textContent = originalLabels[index];
                }
            });
        }
    });

    loadCourses();
});
