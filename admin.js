
document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");
  const loginSection = document.getElementById("loginSection");
  const dashboard = document.getElementById("dashboard");
  const message = document.getElementById("message");
  const applicationList = document.getElementById("applicationList");

  const adminEmail = document.getElementById("adminEmail");
  const adminPassword = document.getElementById("adminPassword");

  let applications = [];

  function showMessage(text, color = "red") {
    message.textContent = text;
    message.style.color = color;
  }

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);
  }

  async function checkSession() {
    const { data, error } = await supabaseClient.auth.getSession();

    if (error) {
      showMessage(error.message);
      return;
    }

    if (data.session) {
      await showDashboard(data.session.user);
    }
  }

  loginForm.addEventListener("submit", async event => {
    event.preventDefault();

    const loginBtn = document.getElementById("loginBtn");
    loginBtn.disabled = true;
    loginBtn.textContent = "Logging in...";

    const { data, error } =
      await supabaseClient.auth.signInWithPassword({
        email: adminEmail.value.trim(),
        password: adminPassword.value
      });

    loginBtn.disabled = false;
    loginBtn.textContent = "Login";

    if (error) {
      showMessage("Login failed: " + error.message);
      return;
    }

    if (data.user.email.toLowerCase() !==
        "abdullahiharuna180@gmail.com") {
      await supabaseClient.auth.signOut();
      showMessage("You are not authorized as administrator.");
      return;
    }

    await showDashboard(data.user);
  });

  async function showDashboard(user) {
    if (user.email.toLowerCase() !==
        "abdullahiharuna180@gmail.com") {
      await supabaseClient.auth.signOut();
      showMessage("Unauthorized administrator.");
      return;
    }

    loginSection.classList.add("hidden");
    dashboard.classList.remove("hidden");

    document.getElementById("adminWelcome").textContent =
      "Welcome, " + user.email;

    await loadApplications();
  }

  async function loadApplications() {
    showMessage("Loading applications...", "#173b70");
    applicationList.innerHTML = "";

    const { data, error } = await supabaseClient
      .from("applications")
      .select("*")
      .order("submitted_at", { ascending: false });

    if (error) {
      showMessage("Unable to load applications: " + error.message);
      return;
    }

    applications = data || [];
    renderApplications();

    showMessage(
      applications.length + " application(s) found.",
      "green"
    );
  }

  function renderApplications() {
    const search = document.getElementById("searchInput")
      .value.toLowerCase();

    const status = document.getElementById("statusFilter").value;

    const filtered = applications.filter(app => {
      const matchesSearch =
        app.full_name.toLowerCase().includes(search) ||
        app.application_number.toLowerCase().includes(search);

      const matchesStatus =
        !status || app.status === status;

      return matchesSearch && matchesStatus;
    });

    if (!filtered.length) {
      applicationList.innerHTML =
        "<p>No applications found.</p>";
      return;
    }

    applicationList.innerHTML = filtered.map(app => `
      <div class="application-card">
        <h3>${escapeHTML(app.full_name)}</h3>

        <p><b>Application No:</b>
          ${escapeHTML(app.application_number)}</p>

        <p><b>Gender:</b> ${escapeHTML(app.gender)}</p>
        <p><b>Age:</b> ${escapeHTML(app.age)}</p>
        <p><b>Town:</b> ${escapeHTML(app.town)}</p>
        <p><b>Phone:</b> ${escapeHTML(app.phone_number)}</p>
        <p><b>Guardian:</b> ${escapeHTML(app.guardian_name)}</p>
        <p><b>Education:</b>
          ${escapeHTML((app.education_level || []).join(", "))}</p>

        <p><b>Qur'anic Education:</b>
          ${escapeHTML(app.quran_education)}</p>

        <p><b>Payment:</b>
          ${escapeHTML(app.payment_option)}</p>

        <p><b>Submitted:</b>
          ${escapeHTML(app.submitted_at)}</p>

        <p><b>Status:</b> ${escapeHTML(app.status)}</p>

        <label>Update Application Status</label>

        <select class="status-update"
          data-id="${escapeHTML(app.id)}">
          <option value="Pending"
            ${app.status === "Pending" ? "selected" : ""}>
            Pending
          </option>
          <option value="Approved"
            ${app.status === "Approved" ? "selected" : ""}>
            Approved
          </option>
          <option value="Rejected"
            ${app.status === "Rejected" ? "selected" : ""}>
            Rejected
          </option>
        </select>

        ${app.payment_receipt_path ? `
          <button class="receipt-btn"
            data-path="${escapeHTML(app.payment_receipt_path)}">
            View Payment Receipt
          </button>
        ` : "<p>No payment receipt uploaded.</p>"}

        <hr>
      </div>
    `).join("");
  }

  applicationList.addEventListener("change", async event => {
    if (!event.target.classList.contains("status-update")) return;

    const id = event.target.dataset.id;
    const newStatus = event.target.value;

    const { error } = await supabaseClient
      .from("applications")
      .update({ status: newStatus })
      .eq("id", id);

    if (error) {
      showMessage("Status update failed: " + error.message);
      await loadApplications();
      return;
    }

    showMessage("Application status updated successfully.", "green");
    await loadApplications();
  });

  applicationList.addEventListener("click", async event => {
    const button = event.target.closest(".receipt-btn");
    if (!button) return;

    const path = button.dataset.path;

    const { data, error } = await supabaseClient.storage
      .from("payment-receipts")
      .createSignedUrl(path, 60);

    if (error) {
      showMessage("Unable to open receipt: " + error.message);
      return;
    }

    window.open(data.signedUrl, "_blank");
  });

  document.getElementById("refreshBtn")
    .addEventListener("click", loadApplications);

  document.getElementById("searchInput")
    .addEventListener("input", renderApplications);

  document.getElementById("statusFilter")
    .addEventListener("change", renderApplications);

  document.getElementById("logoutBtn")
    .addEventListener("click", async () => {
      await supabaseClient.auth.signOut();
      dashboard.classList.add("hidden");
      loginSection.classList.remove("hidden");
      applicationList.innerHTML = "";
      loginForm.reset();
      showMessage("You have logged out.", "green");
    });

  document.getElementById("exportBtn")
    .addEventListener("click", () => {
      if (!applications.length) {
        showMessage("No applications to export.");
        return;
      }

      const columns = [
        "application_number",
        "full_name",
        "gender",
        "age",
        "phone_number",
        "guardian_name",
        "guardian_phone",
        "town",
        "local_government",
        "state",
        "quran_education",
        "status"
      ];

      const csv = [
        columns.join(","),
        ...applications.map(app =>
          columns.map(key =>
            '"' + String(
              Array.isArray(app[key])
                ? app[key].join("; ")
                : app[key] ?? ""
            ).replace(/"/g, '""') + '"'
          ).join(",")
        )
      ].join("\n");

      const blob = new Blob(["\uFEFF" + csv], {
        type: "text/csv;charset=utf-8;"
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = "MIA-Applications.csv";
      link.click();

      URL.revokeObjectURL(url);
    });

  checkSession();
});
