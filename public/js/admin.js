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
  } catch (err) {
    showToast(
      err.message || "Could not load users.",
      true
    );
  }

  try {
    bookings = await api.getBookings();
  } catch (err) {
    document.getElementById(
      "bookings-status-summary"
    ).textContent = "Could not load bookings.";

    showToast(
      err.message || "Could not load bookings.",
      true
    );
  }

  renderStats(users, bookings);
  renderStatusSummary(bookings);
  renderUsersTable(users);
  renderBookingsTable(bookings);
}

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
    Pending <strong>${counts.pending}</strong> ·
    Accepted <strong>${counts.accepted}</strong> ·
    Completed <strong>${counts.completed}</strong> ·
    Declined <strong>${counts.declined}</strong> ·
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
          <td>${escapeHtml(
            user.name || "-"
          )}</td>

          <td>${escapeHtml(
            user.email || "-"
          )}</td>

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

loadAdminData().catch((err) => {
  showToast(
    err.message ||
      "Failed to load admin data.",
    true
  );
});