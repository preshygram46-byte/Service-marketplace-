// Provider dashboard UI logic
const state = { currentScreen: "landing", currentProviderView: "dashboard" };

function goToScreen(screenName) {
  document.querySelectorAll(".screen").forEach((screen) => screen.classList.remove("active"));
  document.querySelectorAll(".dev-tab").forEach((tab) => tab.classList.remove("active"));
  const target = document.getElementById(`screen-${screenName}`);
  if (!target) return;
  target.classList.remove("screen-fade-in");
  target.classList.add("active");
  void target.offsetWidth;
  target.classList.add("screen-fade-in");
  document.querySelector(`.dev-tab[data-screen="${screenName}"]`)?.classList.add("active");
  state.currentScreen = screenName;
  window.scrollTo({ top: 0, behavior: "instant" });
}

function initDevSwitcher() {
  document.querySelectorAll(".dev-tab").forEach((button) => {
    button.addEventListener("click", () => goToScreen(button.dataset.screen));
  });
}

let toastTimer = null;
function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2200);
}

function renderProviderStats() {
  const activeCount = PROVIDER_SERVICES.filter((service) => service.status === "active").length;
  const pendingCount = PROVIDER_REQUESTS.filter((request) => request.status === "pending").length;
  
  if (document.getElementById("statActiveServices")) document.getElementById("statActiveServices").textContent = activeCount;
  if (document.getElementById("statPendingRequests")) document.getElementById("statPendingRequests").textContent = pendingCount;
  if (document.getElementById("statCompletedJobs")) document.getElementById("statCompletedJobs").textContent = PROVIDER_STATS.completedJobs;
  if (document.getElementById("statAverageRating")) document.getElementById("statAverageRating").textContent = `${PROVIDER_STATS.averageRating} / 5.0`;
}

function renderIncomingRequests() {
  const body = document.getElementById("incomingRequestsBody");
  if (!body) return;
  const openRequests = PROVIDER_REQUESTS.filter((request) => request.status === "pending");
  const countEl = document.getElementById("requestCount");
  if (countEl) countEl.textContent = `${openRequests.length} open`;
  
  if (openRequests.length === 0) {
    body.innerHTML = `<div class="empty-state"><span>✓</span><strong>You’re all caught up</strong><p>No incoming requests right now.</p></div>`;
    return;
  }
  body.innerHTML = openRequests.map((request) => `
    <article class="request-item" data-request-id="${request.id}">
      <div class="request-avatar">${request.customer.split(" ").map((part) => part[0]).join("")}</div>
      <div class="request-details"><div class="request-title"><strong>${request.customer}</strong><span class="badge badge-pending">Pending</span></div><strong>${request.service}</strong><span class="muted request-meta">${request.date} · ${request.notes}</span></div>
      <div class="request-price"><strong>₦${request.price.toLocaleString()}</strong><span class="muted">estimated</span></div>
      <div class="table-actions"><button class="btn btn-accept btn-sm" data-accept="${request.id}">Accept</button><button class="btn btn-decline btn-sm" data-decline="${request.id}">Decline</button></div>
    </article>`).join("");
  body.querySelectorAll("[data-accept]").forEach((button) => button.addEventListener("click", () => resolveProviderRequest(button.dataset.accept, true)));
  body.querySelectorAll("[data-decline]").forEach((button) => button.addEventListener("click", () => resolveProviderRequest(button.dataset.decline, false)));
}

function resolveProviderRequest(requestId, accepted) {
  const request = PROVIDER_REQUESTS.find((item) => item.id === requestId);
  if (!request) return;
  request.status = accepted ? "accepted" : "declined";
  showToast(`${request.customer}'s request ${accepted ? "accepted" : "declined"}.`);
  renderIncomingRequests();
  renderProviderStats();
}

function renderMyServices() {
  const body = document.getElementById("myServicesBody");
  if (!body) return;
  body.innerHTML = PROVIDER_SERVICES.map((service) => `
    <article class="managed-service" data-service-row="${service.id}">
      <div class="service-symbol">${service.name.includes("Clean") ? "✦" : "⌁"}</div><div class="managed-service-info"><strong>${service.name}</strong><span class="muted">${service.bookings} completed bookings</span></div>
      <label class="price-editor"><span class="muted">Price / session</span><span><b>₦</b><input type="number" value="${service.price}" min="0" data-price-for="${service.id}" aria-label="Price for ${service.name}" /></span></label>
      <span class="badge badge-${service.status}">${service.status === "active" ? "Available" : "Paused"}</span><button class="availability-toggle ${service.status === "active" ? "is-on" : ""}" data-toggle-status="${service.id}" aria-label="Toggle ${service.name} availability"><span></span></button>
    </article>`).join("");
  body.querySelectorAll("[data-toggle-status]").forEach((button) => button.addEventListener("click", () => {
    const service = PROVIDER_SERVICES.find((item) => item.id === button.dataset.toggleStatus);
    service.status = service.status === "active" ? "paused" : "active";
    showToast(`${service.name} is now ${service.status}.`);
    renderMyServices();
    renderProviderStats();
  }));
  body.querySelectorAll("[data-price-for]").forEach((input) => input.addEventListener("change", () => {
    const service = PROVIDER_SERVICES.find((item) => item.id === input.dataset.priceFor);
    service.price = Math.max(0, Number(input.value) || 0);
    showToast(`${service.name} price updated.`);
  }));
}

function switchProviderView(viewName) {
  state.currentProviderView = viewName;
  document.querySelectorAll(".sidebar-nav a").forEach((link) => {
    link.classList.toggle("active", link.dataset.view === viewName);
  });

  const mainTitle = document.getElementById("dashboardMainTitle");
  const statsContainer = document.getElementById("providerStatsContainer");
  const dynamicContent = document.getElementById("dashboardDynamicContent");

  if (!dynamicContent) return;

  if (viewName === "dashboard") {
    if (mainTitle) mainTitle.textContent = "Provider Dashboard";
    if (statsContainer) statsContainer.style.display = "grid";
    dynamicContent.innerHTML = `
      <section class="dashboard-panel requests-panel full-width-panel">
          <div class="panel-heading">
              <div>
                  <span class="section-kicker">Action needed</span>
                  <h2>Incoming requests</h2>
              </div>
              <span class="request-count" id="requestCount">0 open</span>
          </div>
          <div class="request-list" id="incomingRequestsBody"></div>
      </section>
      <div class="section-heading" style="margin-top: 2rem;">
          <div>
              <span class="section-kicker">Your storefront</span>
              <h2>Active services</h2>
          </div>
          <button class="btn btn-primary" id="addServiceBtn">+ Add service</button>
      </div>
      <div class="service-management-list" id="myServicesBody"></div>
    `;
    initDashboardActions();
    renderIncomingRequests();
    renderMyServices();
  } else if (viewName === "services") {
    if (mainTitle) mainTitle.textContent = "My Services";
    if (statsContainer) statsContainer.style.display = "none";
    dynamicContent.innerHTML = `
      <div class="section-heading">
          <div>
              <span class="section-kicker">Storefront Management</span>
              <h2>All Services</h2>
          </div>
          <button class="btn btn-primary" id="addServiceBtn">+ Add service</button>
      </div>
      <div class="service-management-list" id="myServicesBody"></div>
    `;
    initDashboardActions();
    renderMyServices();
  } else if (viewName === "requests") {
    if (mainTitle) mainTitle.textContent = "Customer Requests";
    if (statsContainer) statsContainer.style.display = "none";
    dynamicContent.innerHTML = `
      <section class="dashboard-panel requests-panel full-width-panel">
          <div class="panel-heading">
              <div>
                  <span class="section-kicker">Queue</span>
                  <h2>Incoming & Managed Requests</h2>
              </div>
              <span class="request-count" id="requestCount">0 open</span>
          </div>
          <div class="request-list" id="incomingRequestsBody"></div>
      </section>
    `;
    renderIncomingRequests();
  } else if (viewName === "reviews") {
    if (mainTitle) mainTitle.textContent = "Client Reviews";
    if (statsContainer) statsContainer.style.display = "none";
    dynamicContent.innerHTML = `
      <div class="dashboard-panel full-width-panel">
          <div class="panel-heading">
              <div>
                  <span class="section-kicker">Feedback</span>
                  <h2>Overall Rating & Reviews</h2>
              </div>
              <span class="request-count">${PROVIDER_STATS.averageRating} / 5.0</span>
          </div>
          <div class="empty-state"><span>★</span><strong>Client feedback is looking great</strong><p>You maintain a stellar rating across completed jobs.</p></div>
      </div>
    `;
  } else if (viewName === "profile") {
    if (mainTitle) mainTitle.textContent = "Provider Profile";
    if (statsContainer) statsContainer.style.display = "none";
    dynamicContent.innerHTML = `
      <div class="dashboard-panel full-width-panel">
          <div class="panel-heading">
              <div>
                  <span class="section-kicker">Account</span>
                  <h2>Adaeze Okafor</h2>
              </div>
              <span class="badge badge-active">Verified Provider</span>
          </div>
          <p class="muted" style="margin-top: 10px; font-size: 14px;">Professional service provider on Handled. Managing home care, cleaning, and specialized appointments seamlessly.</p>
      </div>
    `;
  }
}

function initDashboardActions() {
  const addBtn = document.getElementById("addServiceBtn");
  if (addBtn) {
    addBtn.addEventListener("click", () => {
      const name = prompt("New service name:");
      if (!name) return;
      PROVIDER_SERVICES.push({ id: `psvc-${Date.now()}`, name, price: 5000, bookings: 0, status: "active" });
      showToast(`"${name}" added to your services.`);
      renderMyServices();
      renderProviderStats();
    });
  }
}

function initProviderDashboard() {
  document.querySelectorAll(".sidebar-link").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      switchProviderView(link.dataset.view);
    });
  });
  initDashboardActions();
}

document.addEventListener("DOMContentLoaded", () => {
  initDevSwitcher();
  initProviderDashboard();
  renderProviderStats();
  renderIncomingRequests();
  renderMyServices();
  goToScreen("landing");
});