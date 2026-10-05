import { api } from "./api.js";
import { showToast } from "./ui.js";
import {
  requireRole,
  formatDate,
  statusLabel,
  escapeHtml,
  showLoading,
} from "./utils.js";

requireRole(["admin"], "index.html");

const createAdminForm = document.getElementById(
  "create-admin-form"
);

const createServiceForm = document.getElementById(
  "create-service-form"
);

const createCategoryForm = document.getElementById(
  "create-category-form"
);

async function loadAdminData() {
  showLoading(
    document.getElementById("users-tbody"),
    3,
    "skeleton-card"
  );

  showLoading(
    document.getElementById("bookings-tbody"),
    3,
    "skeleton-card"
  );

  let users = [];
  let bookings = [];

  try {
    users = await api.getAdminUsers();
  } catch (error) {
    showToast(
      error.message || "Could not load users.",
      true
    );
  }

  try {
    bookings = await api.getBookings();
  } catch (error) {
    document.getElementById(
      "bookings-status-summary"
    ).textContent = "Could not load bookings.";

    showToast(
      error.message || "Could not load bookings.",
      true
    );
  }

  renderStats(users, bookings);
  renderStatusSummary(bookings);
  renderUsersTable(users);
  renderBookingsTable(bookings);
}

async function loadCategories() {
  const select = document.getElementById(
    "service-category"
  );

  if (!select) return [];

  try {
    const categories = await api.getCategories();

    if (!categories.length) {
      select.innerHTML = `
        <option value="">
          No categories available
        </option>
      `;

      select.disabled = true;
      return [];
    }

    select.disabled = false;

    select.innerHTML = `
      <option value="">Select a category</option>
      ${categories
        .map(
          (category) => `
            <option value="${escapeHtml(
              category.id || ""
            )}">
              ${escapeHtml(
                category.name || "Unnamed category"
              )}
            </option>
          `
        )
        .join("")}
    `;

    return categories;
  } catch (error) {
    select.innerHTML = `
      <option value="">
        Could not load categories
      </option>
    `;

    select.disabled = true;

    showToast(
      error.message || "Could not load categories.",
      true
    );

    return [];
  }
}

function setButtonLoading(
  button,
  isLoading,
  normalText,
  loadingText
) {
  if (!button) return;

  button.disabled = isLoading;
  button.textContent = isLoading
    ? loadingText
    : normalText;
}

createAdminForm?.addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();

    const button = document.getElementById(
      "create-admin-button"
    );

    const formData = new FormData(
      createAdminForm
    );

    const name =
      formData.get("name")?.trim() || "";

    const email =
      formData.get("email")?.trim() || "";

    const phone =
      formData.get("phone")?.trim() || "";

    const password =
      formData.get("password") || "";

    setButtonLoading(
      button,
      true,
      "Create Admin",
      "Creating..."
    );

    try {
      await api.createAdmin({
        name,
        email,
        phone,
        password,
      });

      createAdminForm.reset();

      showToast(
        "Administrator account created successfully."
      );

      await loadAdminData();
    } catch (error) {
      showToast(
        error.message ||
          "Could not create administrator.",
        true
      );
    } finally {
      setButtonLoading(
        button,
        false,
        "Create Admin",
        "Creating..."
      );
    }
  }
);

createCategoryForm?.addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();

    const button = document.getElementById(
      "create-category-button"
    );

    const formData = new FormData(
      createCategoryForm
    );

    const name =
      formData.get("name")?.trim() || "";

    setButtonLoading(
      button,
      true,
      "Create Category",
      "Creating..."
    );

    try {
      const category =
        await api.createCategory({ name });

      createCategoryForm.reset();

      await loadCategories();

      const categorySelect =
        document.getElementById(
          "service-category"
        );

      if (categorySelect && category?.id) {
        categorySelect.value = category.id;
      }

      showToast(
        "Category created successfully."
      );
    } catch (error) {
      showToast(
        error.message ||
          "Could not create category.",
        true
      );
    } finally {
      setButtonLoading(
        button,
        false,
        "Create Category",
        "Creating..."
      );
    }
  }
);

createServiceForm?.addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();

    const button = document.getElementById(
      "create-service-button"
    );

    const formData = new FormData(
      createServiceForm
    );

    const title =
      formData.get("title")?.trim() || "";

    const categoryId =
      formData.get("categoryId") || "";

    const price = Number(
      formData.get("price")
    );

    const description =
      formData.get("description")?.trim() || "";

    if (!Number.isFinite(price) || price < 0) {
      showToast(
        "Please enter a valid service price.",
        true
      );
      return;
    }

    setButtonLoading(
      button,
      true,
      "Create Service",
      "Creating..."
    );

    try {
      await api.createService({
        title,
        categoryId,
        price,
        description,
      });

      createServiceForm.reset();

      showToast(
        "Service created successfully."
      );
    } catch (error) {
      showToast(
        error.message ||
          "Could not create service.",
        true
      );
    } finally {
      setButtonLoading(
        button,
        false,
        "Create Service",
        "Creating..."
      );
    }
  }
);

function renderStats(users, bookings) {
  document.getElementById(
    "stat-users"
  ).textContent = users.length;

  document.getElementById(
    "stat-providers"
  ).textContent = users.filter(
    (user) => user.role === "provider"
  ).length;

  document.getElementById(
    "stat-bookings"
  ).textContent = bookings.length;

  document.getElementById(
    "stat-completed"
  ).textContent = bookings.filter(
    (booking) => booking.status === "completed"
  ).length;
}

function renderStatusSummary(bookings) {
  const statuses = [
    "pending",
    "accepted",
    "completed",
    "declined",
    "cancelled",
  ];

  const counts = statuses.reduce(
    (accumulator, status) => {
      accumulator[status] = bookings.filter(
        (booking) => booking.status === status
      ).length;

      return accumulator;
    },
    {}
  );

  const element = document.getElementById(
    "bookings-status-summary"
  );

  element.innerHTML = `
    Pending <strong>${counts.pending}</strong>
    &middot;
    Accepted <strong>${counts.accepted}</strong>
    &middot;
    Completed <strong>${counts.completed}</strong>
    &middot;
    Declined <strong>${counts.declined}</strong>
    &middot;
    Cancelled <strong>${counts.cancelled}</strong>
  `;
}

function renderUsersTable(users) {
  const tbody =
    document.getElementById("users-tbody");

  const empty =
    document.getElementById("users-empty");

  tbody.innerHTML = "";

  if (!users || !users.length) {
    empty.classList.remove("hidden");

    empty.querySelector(
      ".empty-message"
    ).textContent = "No users found.";

    return;
  }

  empty.classList.add("hidden");

  tbody.innerHTML = users
    .map(
      (user) => `
        <tr>
          <td>
            ${escapeHtml(user.name || "-")}
          </td>

          <td>
            ${escapeHtml(user.email || "-")}
          </td>

          <td>
            <span class="badge badge-role">
              ${escapeHtml(
                user.role || "customer"
              )}
            </span>
          </td>

          <td>
            ${
              user.joinedAt || user.createdAt
                ? formatDate(
                    user.joinedAt ||
                      user.createdAt
                  )
                : "-"
            }
          </td>
        </tr>
      `
    )
    .join("");
}

function renderBookingsTable(bookings) {
  const tbody =
    document.getElementById("bookings-tbody");

  const empty =
    document.getElementById("bookings-empty");

  tbody.innerHTML = "";

  if (!bookings || !bookings.length) {
    empty.classList.remove("hidden");
    return;
  }

  empty.classList.add("hidden");

  tbody.innerHTML = bookings
    .map(
      (booking) => `
        <tr>
          <td>
            ${escapeHtml(
              booking.serviceId?.title ||
                booking.serviceTitle ||
                "-"
            )}
          </td>

          <td>
            ${escapeHtml(
              booking.customerId?.name ||
                booking.customerName ||
                "-"
            )}
          </td>

          <td>
            ${escapeHtml(
              booking.providerId?.name ||
                booking.providerName ||
                "-"
            )}
          </td>

          <td>
            <span class="badge badge-${escapeHtml(
              booking.status || "pending"
            )}">
              ${statusLabel(
                booking.status || "pending"
              )}
            </span>
          </td>

          <td>
            ${
              booking.requestedDate
                ? formatDate(
                    booking.requestedDate
                  )
                : "-"
            }
          </td>
        </tr>
      `
    )
    .join("");
}

Promise.all([
  loadAdminData(),
  loadCategories(),
]).catch((error) => {
  showToast(
    error.message ||
      "Failed to load admin data.",
    true
  );
});