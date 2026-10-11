(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const loginScreen = $("login-screen");
  const dashboardScreen = $("dashboard-screen");
  const loginForm = $("login-form");
  const loginMessage = $("login-message");
  const dashboardMessage = $("dashboard-message");
  const loginButton = $("login-button");
  const rowsElement = $("enrollment-rows");
  const courseFilter = $("course-filter");
  const searchInput = $("search-input");

  let courses = [];
  let enrollments = [];

  async function api(url, options = {}) {
    const response = await fetch(url, {
      credentials: "same-origin",
      ...options,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(options.headers || {})
      }
    });

    const data = await response.json().catch(() => ({}));
    if (response.status === 401) {
      showLogin("Your session has expired. Please sign in again.");
      throw new Error(data.error || "Please sign in again.");
    }
    if (!response.ok) {
      throw new Error(data.error || `Request failed (${response.status}).`);
    }
    return data;
  }

  function showLogin(message = "") {
    dashboardScreen.hidden = true;
    loginScreen.hidden = false;
    loginMessage.textContent = message;
    loginMessage.className = "message";
  }

  function showDashboard() {
    loginScreen.hidden = true;
    dashboardScreen.hidden = false;
    loadDashboard();
  }

  function showError(message) {
    dashboardMessage.textContent = message;
    dashboardMessage.className = "message";
  }

  function clearMessage() {
    dashboardMessage.textContent = "";
    dashboardMessage.className = "message";
  }

  async function loadDashboard() {
    clearMessage();
    try {
      const [stats, enrollmentData] = await Promise.all([
        api("/api/admin/stats"),
        api("/api/admin/enrollments")
      ]);

      courses = stats.courses || [];
      enrollments = enrollmentData.enrollments || [];

      $("total-count").textContent = stats.total_enrollments ?? 0;
      $("today-count").textContent = stats.today_enrollments ?? 0;
      $("course-count").textContent = courses.length;

      renderCourses();
      renderCourseFilter();
      renderEnrollments();
    } catch (error) {
      showError(error.message || "Unable to load dashboard.");
    }
  }

  function renderCourses() {
    const container = $("course-chart");
    container.replaceChildren();

    if (!courses.length) {
      container.textContent = "No course statistics available.";
      return;
    }

    const max = Math.max(1, ...courses.map(c => Number(c.enrollments) || 0));

    courses.forEach(course => {
      const count = Number(course.enrollments) || 0;
      const row = document.createElement("div");
      row.className = "course-row";

      const name = document.createElement("div");
      name.className = "course-name";
      name.textContent = course.name;

      const track = document.createElement("div");
      track.className = "bar-track";
      const fill = document.createElement("div");
      fill.className = "bar-fill";
      fill.style.width = `${count / max * 100}%`;
      track.appendChild(fill);

      const value = document.createElement("div");
      value.className = "course-value";
      value.textContent = count;

      row.append(name, track, value);
      container.appendChild(row);
    });
  }

  function renderCourseFilter() {
    const selected = courseFilter.value;
    courseFilter.replaceChildren();

    const all = document.createElement("option");
    all.value = "";
    all.textContent = "All courses";
    courseFilter.appendChild(all);

    courses.forEach(course => {
      const option = document.createElement("option");
      option.value = course.name;
      option.textContent = course.name;
      courseFilter.appendChild(option);
    });

    courseFilter.value = selected;
  }

  function makeCell(text, className = "") {
    const cell = document.createElement("td");
    cell.textContent = text || "—";
    if (className) cell.className = className;
    return cell;
  }

  function renderEnrollments() {
    const query = searchInput.value.trim().toLowerCase();
    const selectedCourse = courseFilter.value;

    const filtered = enrollments.filter(record => {
      const matchesCourse = !selectedCourse || record.course === selectedCourse;
      const searchable = [
        record.name, record.email, record.phone
      ].join(" ").toLowerCase();
      return matchesCourse && searchable.includes(query);
    });

    rowsElement.replaceChildren();
    $("record-count").textContent =
      `${filtered.length} record${filtered.length === 1 ? "" : "s"}`;

    if (!filtered.length) {
      const row = document.createElement("tr");
      const cell = document.createElement("td");
      cell.colSpan = 5;
      cell.className = "empty-state";
      cell.textContent = enrollments.length
        ? "No enrollments match your filters."
        : "No enrollments have been submitted yet.";
      row.appendChild(cell);
      rowsElement.appendChild(row);
      return;
    }

    filtered.forEach(record => {
      const row = document.createElement("tr");
      row.appendChild(makeCell(record.name));

      const contact = document.createElement("td");
      const email = document.createElement("div");
      email.textContent = record.email || "—";
      const phone = document.createElement("div");
      phone.textContent = record.phone || "Phone not provided";
      phone.style.cssText = "color:#929bad;font-size:10px;margin-top:5px";
      contact.append(email, phone);
      row.appendChild(contact);

      const courseCell = makeCell(record.course);
      const tag = document.createElement("span");
      tag.className = "course-tag";
      tag.textContent = record.course;
      courseCell.textContent = "";
      courseCell.appendChild(tag);
      row.appendChild(courseCell);

      row.appendChild(makeCell(record.created_at || "—"));
      const idCell = makeCell(`#${record.id}`, "id-tag");
      row.appendChild(idCell);
      rowsElement.appendChild(row);
    });
  }

  loginForm.addEventListener("submit", async event => {
    event.preventDefault();
    loginButton.disabled = true;
    loginButton.textContent = "Signing in…";
    loginMessage.textContent = "";
    loginMessage.className = "message";

    try {
      await api("/api/admin/login", {
        method: "POST",
        body: JSON.stringify({
          username: $("username").value.trim(),
          password: $("password").value
        })
      });
      $("password").value = "";
      showDashboard();
    } catch (error) {
      loginMessage.textContent = error.message || "Unable to sign in.";
      loginMessage.className = "message";
    } finally {
      loginButton.disabled = false;
      loginButton.innerHTML = 'Sign in to dashboard <span aria-hidden="true">→</span>';
    }
  });

  $("logout-button").addEventListener("click", async () => {
    try {
      await api("/api/admin/logout", { method: "POST" });
    } catch (_) {
      // Return to login even if the session already expired.
    }
    showLogin("You have signed out.");
    loginForm.reset();
  });

  $("refresh-button").addEventListener("click", loadDashboard);
  searchInput.addEventListener("input", renderEnrollments);
  courseFilter.addEventListener("change", renderEnrollments);
  $("clear-filters").addEventListener("click", () => {
    searchInput.value = "";
    courseFilter.value = "";
    renderEnrollments();
  });

  async function start() {
    try {
      const state = await api("/api/admin/me");
      if (state.authenticated) {
        showDashboard();
      } else {
        showLogin();
      }
    } catch (_) {
      showLogin();
    }
  }

  start();
})();
