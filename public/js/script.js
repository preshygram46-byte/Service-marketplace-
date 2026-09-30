// Provider dashboard UI and API integration. No backend calls are made outside these fetch helpers.
const API_BASE_URL = window.API_BASE_URL || "http://localhost:5000/api";
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
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
}

function getAuthToken() {
  const directToken = localStorage.getItem("token");
  if (directToken) return directToken;
  try {
    return JSON.parse(localStorage.getItem("auth"))?.token || "";
  } catch (error) {
    return "";
  }
}

async function apiRequest(path, options = {}) {
  const token = getAuthToken();
  if (!token) throw new Error("Please log in as a provider to continue.");
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  const payload = await response.json().catch(() => null);
  if (!payload || typeof payload.success !== "boolean" || !("message" in payload) || !("data" in payload)) {
    throw new Error("The API returned an invalid response format.");
  }
  if (!response.ok || !payload.success) throw new Error(payload.message || "Request failed.");
  return payload.data;
}

function ensureAuthenticated() {
  if (getAuthToken()) return true;
  showToast("Please log in as a provider to load dashboard data.");
  return false;
}

function formatRequestedDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return date.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function renderProviderStats() {
  const activeCount = PROVIDER_SERVICES.length;
  const pendingCount = PROVIDER_REQUESTS.filter((request) => request.status === "pending").length;
  document.getElementById("statActiveServices")?.replaceChildren(String(activeCount));
  document.getElementById("statPendingRequests")?.replaceChildren(String(pendingCount));
  document.getElementById("statCompletedJobs")?.replaceChildren(String(PROVIDER_STATS.completedJobs));
  document.getElementById("statAverageRating")?.replaceChildren(`${PROVIDER_STATS.averageRating} / 5.0`);
}

function renderIncomingRequests() {
  const body = document.getElementById("incomingRequestsBody");
  if (!body) return;
  const openRequests = PROVIDER_REQUESTS.filter((request) => request.status === "pending");
  document.getElementById("requestCount")?.replaceChildren(`${openRequests.length} open`);
  if (openRequests.length === 0) {
    body.innerHTML = `<div class="empty-state"><span>✓</span><strong>You’re all caught up</strong><p>No incoming requests right now.</p></div>`;
    return;
  }
  body.innerHTML = openRequests.map((request) => {
    const customerName = request.customerId?.name || request.customerId || "Customer";
    const serviceName = request.serviceId?.name || request.serviceId || "Service";
    const price = request.serviceId?.price ?? 0;
    const initials = customerName.split(" ").map((part) => part[0]).join("").slice(0, 2);
    return `
      <article class="request-item" data-request-id="${request._id}">
        <div class="request-avatar">${initials}</div>
        <div class="request-details"><div class="request-title"><strong>${customerName}</strong><span class="badge badge-pending">${request.status}</span></div><strong>${serviceName}</strong><span class="muted request-meta">${formatRequestedDate(request.requestedDate)} · ${request.notes || "No notes"}</span></div>
        <div class="request-price"><strong>₦${Number(price).toLocaleString()}</strong><span class="muted">estimated</span></div>
        <div class="table-actions"><button class="btn btn-accept btn-sm" data-accept="${request._id}">Accept</button><button class="btn btn-decline btn-sm" data-decline="${request._id}">Decline</button></div>
      </article>`;
  }).join("");
  body.querySelectorAll("[data-accept]").forEach((button) => button.addEventListener("click", () => updateBookingStatus(button.dataset.accept, "accepted")));
  body.querySelectorAll("[data-decline]").forEach((button) => button.addEventListener("click", () => updateBookingStatus(button.dataset.decline, "declined")));
}

async function loadBookingRequests() {
  if (!ensureAuthenticated()) return;
  try {
    PROVIDER_REQUESTS = await apiRequest("/bookings");
    renderIncomingRequests();
    renderProviderStats();
  } catch (error) {
    showToast(error.message);
  }
}

async function updateBookingStatus(bookingId, status) {
  try {
    const updatedBooking = await apiRequest(`/bookings/${bookingId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    const index = PROVIDER_REQUESTS.findIndex((request) => request._id === updatedBooking._id);
    if (index !== -1) PROVIDER_REQUESTS[index] = updatedBooking;
    showToast(`Request ${status}.`);
    renderIncomingRequests();
    renderProviderStats();
  } catch (error) {
    showToast(error.message);
  }
}

function renderMyServices() {
  const body = document.getElementById("myServicesBody");
  if (!body) return;
  body.innerHTML = PROVIDER_SERVICES.map((service) => `
    <article class="managed-service" data-service-row="${service._id}">
      <div class="service-symbol">✦</div><div class="managed-service-info"><strong>${service.name}</strong><span class="muted">${service.category}</span></div>
      <label class="price-editor"><span class="muted">Price / session</span><span><b>₦</b><input type="number" value="${service.price}" min="0" data-price-for="${service._id}" aria-label="Price for ${service.name}" /></span></label>
      <span class="badge badge-active">Available</span>
    </article>`).join("");
  body.querySelectorAll("[data-price-for]").forEach((input) => input.addEventListener("change", () => updateServicePrice(input.dataset.priceFor, input.value)));
}

async function loadServices() {
  if (!ensureAuthenticated()) return;
  try {
    PROVIDER_SERVICES = await apiRequest("/services");
    renderMyServices();
    renderProviderStats();
  } catch (error) {
    showToast(error.message);
  }
}

async function updateServicePrice(serviceId, price) {
  try {
    const service = await apiRequest(`/services/${serviceId}`, {
      method: "PUT",
      body: JSON.stringify({ price: Number(price) }),
    });
    const index = PROVIDER_SERVICES.findIndex((item) => item._id === service._id);
    if (index !== -1) PROVIDER_SERVICES[index] = service;
    renderMyServices();
    showToast("Service price updated.");
  } catch (error) {
    showToast(error.message);
    renderMyServices();
  }
}

async function createService() {
  const name = prompt("Service name:");
  if (!name) return;
  const description = prompt("Service description:");
  if (!description) return;
  const category = prompt("Service category:");
  if (!category) return;
  const price = Number(prompt("Price in Naira:") || 0);
  if (!price || price < 0) return showToast("Enter a valid price.");
  try {
    const service = await apiRequest("/services", { method: "POST", body: JSON.stringify({ name, description, price, category }) });
    PROVIDER_SERVICES.unshift(service);
    renderMyServices();
    renderProviderStats();
    showToast("Service created successfully.");
  } catch (error) {
    showToast(error.message);
  }
}

function switchProviderView(viewName) {
  state.currentProviderView = viewName;
  document.querySelectorAll(".sidebar-nav a").forEach((link) => link.classList.toggle("active", link.dataset.view === viewName));
  const mainTitle = document.getElementById("dashboardMainTitle");
  const statsContainer = document.getElementById("providerStatsContainer");
  const dynamicContent = document.getElementById("dashboardDynamicContent");
  if (!dynamicContent) return;
  if (viewName === "dashboard") {
    if (mainTitle) mainTitle.textContent = "Provider Dashboard";
    if (statsContainer) statsContainer.style.display = "grid";
    dynamicContent.innerHTML = `<section class="dashboard-panel requests-panel full-width-panel"><div class="panel-heading"><div><span class="section-kicker">Action needed</span><h2>Incoming requests</h2></div><span class="request-count" id="requestCount">0 open</span></div><div class="request-list" id="incomingRequestsBody"></div></section><div class="section-heading" style="margin-top: 2rem;"><div><span class="section-kicker">Your storefront</span><h2>Active services</h2></div><button class="btn btn-primary" id="addServiceBtn">+ Add service</button></div><div class="service-management-list" id="myServicesBody"></div>`;
    initDashboardActions();
    renderIncomingRequests();
    renderMyServices();
  } else if (viewName === "services") {
    if (mainTitle) mainTitle.textContent = "My Services";
    if (statsContainer) statsContainer.style.display = "none";
    dynamicContent.innerHTML = `<div class="section-heading"><div><span class="section-kicker">Storefront Management</span><h2>All Services</h2></div><button class="btn btn-primary" id="addServiceBtn">+ Add service</button></div><div class="service-management-list" id="myServicesBody"></div>`;
    initDashboardActions();
    renderMyServices();
  } else if (viewName === "requests") {
    if (mainTitle) mainTitle.textContent = "Customer Requests";
    if (statsContainer) statsContainer.style.display = "none";
    dynamicContent.innerHTML = `<section class="dashboard-panel requests-panel full-width-panel"><div class="panel-heading"><div><span class="section-kicker">Queue</span><h2>Incoming & Managed Requests</h2></div><span class="request-count" id="requestCount">0 open</span></div><div class="request-list" id="incomingRequestsBody"></div></section>`;
    renderIncomingRequests();
  } else if (viewName === "reviews") {
    if (mainTitle) mainTitle.textContent = "Client Reviews";
    if (statsContainer) statsContainer.style.display = "none";
    dynamicContent.innerHTML = `<div class="dashboard-panel full-width-panel"><div class="panel-heading"><div><span class="section-kicker">Feedback</span><h2>Overall Rating & Reviews</h2></div><span class="request-count">${PROVIDER_STATS.averageRating} / 5.0</span></div><div class="empty-state"><span>★</span><strong>Client feedback is looking great</strong><p>You maintain a stellar rating across completed jobs.</p></div></div>`;
  } else if (viewName === "profile") {
    if (mainTitle) mainTitle.textContent = "Provider Profile";
    if (statsContainer) statsContainer.style.display = "none";
    dynamicContent.innerHTML = `<div class="dashboard-panel full-width-panel"><div class="panel-heading"><div><span class="section-kicker">Account</span><h2>Adaeze Okafor</h2></div><span class="badge badge-active">Verified Provider</span></div><p class="muted" style="margin-top: 10px; font-size: 14px;">Professional service provider on Handled. Managing home care, cleaning, and specialized appointments seamlessly.</p></div>`;
  }
}

function initDashboardActions() {
  document.getElementById("addServiceBtn")?.addEventListener("click", createService);
}

function initProviderDashboard() {
  document.querySelectorAll(".sidebar-link").forEach((link) => link.addEventListener("click", (event) => {
    event.preventDefault();
    switchProviderView(link.dataset.view);
  }));
  initDashboardActions();
}

document.addEventListener("DOMContentLoaded", async () => {
  initDevSwitcher();
  initProviderDashboard();
  renderProviderStats();
  renderIncomingRequests();
  renderMyServices();
  goToScreen("landing");
  await Promise.all([loadServices(), loadBookingRequests()]);
});
