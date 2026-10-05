import { api } from "./api.js";
import { showToast } from "./ui.js";
import {
  requireAuth,
  formatDate,
  formatTime,
  formatPrice,
  statusLabel,
  escapeHtml,
  showError,
} from "./utils.js";

const user = requireAuth("bookings.html");

const canManageRequests =
  user?.role === "admin" ||
  user?.role === "provider";

let currentBookings = [];
let bookingToCancel = null;
let activeStatus = "all";

const stream =
  document.getElementById("bookings-stream");

const emptyState =
  document.getElementById("bookings-empty");

if (canManageRequests) {
  const pageTitle = document.querySelector("main h1");

  if (pageTitle) {
    pageTitle.textContent =
      user.role === "admin"
        ? "All Service Requests"
        : "Customer Requests";

    const pageDescription =
      pageTitle.parentElement?.querySelector("p");

    if (pageDescription) {
      pageDescription.textContent =
        "View customers requesting services and manage their request status.";
    }
  }
}

function renderSkeletons(number = 4) {
  emptyState.classList.add("hidden");

  stream.innerHTML = Array.from({
    length: number,
  })
    .map(
      () =>
        '<div class="skeleton-card booking-card-skeleton"></div>'
    )
    .join("");
}

async function loadBookings() {
  renderSkeletons();

  try {
    currentBookings = await api.getBookings();
    renderList();
  } catch (error) {
    stream.innerHTML = "";
    emptyState.classList.add("hidden");

    showError(
      stream,
      error.message || "Could not load bookings",
      {
        ctaText: "Retry",
        onCta: loadBookings,
      }
    );
  }
}

function renderList() {
  const filtered =
    activeStatus === "all"
      ? currentBookings
      : currentBookings.filter(
          (booking) =>
            booking.status === activeStatus
        );

  if (filtered.length === 0) {
    stream.innerHTML = "";
    emptyState.classList.remove("hidden");
    return;
  }

  emptyState.classList.add("hidden");

  stream.innerHTML = filtered
    .map((booking) => {
      const status =
        booking.status || "pending";

      const dateText =
        booking.requestedDate
          ? formatDate(booking.requestedDate)
          : "-";

      const timeText =
        booking.requestedDate
          ? formatTime(booking.requestedDate)
          : "";

      const priceText =
        booking.price !== undefined &&
        booking.price !== null
          ? formatPrice(booking.price)
          : "";

      const title = escapeHtml(
        booking.serviceTitle ||
          "Service request"
      );

      const personName = canManageRequests
        ? booking.customerName ||
          "Customer"
        : booking.providerName ||
          "Provider";

      const personLabel = canManageRequests
        ? "Customer"
        : "Provider";

      const personLine = escapeHtml(
        `${personLabel}: ${personName}`
      );

      const notes = booking.notes
        ? escapeHtml(booking.notes)
        : "";

      return `
        <article class="booking-card">
          <div class="booking-card-ref">
            <div class="booking-ref-group">
              <span class="badge badge-${escapeHtml(
                status
              )}">
                ${statusLabel(status)}
              </span>

              ${
                booking.id
                  ? `<span class="ref-number">
                      REF #${escapeHtml(
                        booking.id
                      )}
                    </span>`
                  : ""
              }
            </div>
          </div>

          <div class="booking-card-main">
            <div class="booking-info">
              <h2>${title}</h2>

              <div class="booking-details-grid">
                <div class="detail-row">
                  <span class="material-symbols-outlined">
                    person
                  </span>
                  <span>${personLine}</span>
                </div>

                <div class="detail-row">
                  <span class="material-symbols-outlined">
                    calendar_today
                  </span>
                  <span>${dateText}</span>
                </div>

                ${
                  timeText
                    ? `<div class="detail-row">
                        <span class="material-symbols-outlined">
                          schedule
                        </span>
                        <span>${timeText}</span>
                      </div>`
                    : ""
                }

                ${
                  priceText
                    ? `<div class="detail-row">
                        <span class="material-symbols-outlined">
                          payments
                        </span>
                        <span>${priceText}</span>
                      </div>`
                    : ""
                }
              </div>

              ${
                notes
                  ? `<div class="booking-notes-callout">
                      Note: "${notes}"
                    </div>`
                  : ""
              }
            </div>

            <div class="booking-actions">
              ${getActionButtons(booking)}
            </div>
          </div>
        </article>
      `;
    })
    .join("");

  attachActionListeners();
}

function getActionButtons(booking) {
  const bookingId = escapeHtml(
    booking.id || ""
  );

  if (canManageRequests) {
    if (booking.status === "pending") {
      return `
        <button
          type="button"
          class="btn btn-primary booking-status-btn"
          data-id="${bookingId}"
          data-status="accepted"
        >
          Accept
        </button>

        <button
          type="button"
          class="btn btn-secondary booking-status-btn"
          data-id="${bookingId}"
          data-status="declined"
        >
          Decline
        </button>
      `;
    }

    if (booking.status === "accepted") {
      return `
        <button
          type="button"
          class="btn btn-primary booking-status-btn"
          data-id="${bookingId}"
          data-status="completed"
        >
          Mark Completed
        </button>
      `;
    }

    return "";
  }

  if (
    booking.status === "pending" ||
    booking.status === "accepted"
  ) {
    return `
      <button
        type="button"
        class="btn btn-secondary cancel-trigger-btn"
        data-id="${bookingId}"
      >
        Cancel Request
      </button>
    `;
  }

  if (
    booking.status === "completed" ||
    booking.status === "declined" ||
    booking.status === "cancelled"
  ) {
    return `
      <a
        href="services.html"
        class="btn btn-secondary"
      >
        Browse More
      </a>
    `;
  }

  return "";
}

function attachActionListeners() {
  document
    .querySelectorAll(".booking-status-btn")
    .forEach((button) => {
      button.addEventListener(
        "click",
        async () => {
          const bookingId =
            button.dataset.id;

          const nextStatus =
            button.dataset.status;

          button.disabled = true;

          try {
            await api.updateBookingStatus(
              bookingId,
              nextStatus
            );

            showToast(
              `Request ${statusLabel(
                nextStatus
              ).toLowerCase()} successfully.`
            );

            await loadBookings();
          } catch (error) {
            showToast(
              error.message ||
                "Could not update request.",
              true
            );

            button.disabled = false;
          }
        }
      );
    });

  document
    .querySelectorAll(".cancel-trigger-btn")
    .forEach((button) => {
      button.addEventListener("click", () => {
        bookingToCancel =
          button.dataset.id;

        document
          .getElementById("cancel-modal")
          ?.classList.add("open");
      });
    });
}

document
  .querySelectorAll(".status-tab")
  .forEach((tab) => {
    tab.addEventListener("click", () => {
      document
        .querySelectorAll(".status-tab")
        .forEach((item) =>
          item.classList.remove("active")
        );

      tab.classList.add("active");
      activeStatus = tab.dataset.status;
      renderList();
    });
  });

document
  .querySelectorAll(".close-modal")
  .forEach((button) => {
    button.addEventListener(
      "click",
      (event) => {
        event.target
          .closest(".modal-backdrop")
          ?.classList.remove("open");
      }
    );
  });

document
  .getElementById("confirm-cancel-btn")
  ?.addEventListener("click", async () => {
    if (!bookingToCancel) return;

    try {
      await api.updateBookingStatus(
        bookingToCancel,
        "cancelled"
      );

      document
        .getElementById("cancel-modal")
        ?.classList.remove("open");

      showToast(
        "Service request cancelled."
      );

      await loadBookings();
    } catch (error) {
      showToast(
        error.message ||
          "Could not cancel request.",
        true
      );
    } finally {
      bookingToCancel = null;
    }
  });

loadBookings();