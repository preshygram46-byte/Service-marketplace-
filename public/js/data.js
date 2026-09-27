// Provider dashboard mock data
let PROVIDER_REQUESTS = [
  { id: "req-1", customer: "Chidinma A.", service: "Full Home Deep Clean", date: "Sept 24, 10:00 AM", price: 8000, notes: "Focus on kitchen + 2 bathrooms", status: "pending" },
  { id: "req-2", customer: "Emeka O.", service: "Full Home Deep Clean", date: "Sept 26, 1:00 PM", price: 8000, notes: "Studio apartment, 1 bathroom", status: "pending" },
  { id: "req-3", customer: "Bisi K.", service: "Post-Event Cleanup", date: "Sept 28, 9:00 AM", price: 12000, notes: "Three-bedroom flat in Lekki", status: "pending" },
];

let PROVIDER_SERVICES = [
  { id: "psvc-1", name: "Full Home Deep Clean", price: 8000, bookings: 52, status: "active" },
  { id: "psvc-2", name: "Post-Event Cleanup", price: 12000, bookings: 21, status: "active" },
  { id: "psvc-3", name: "Move-out Deep Clean", price: 15000, bookings: 4, status: "paused" },
];

let PROVIDER_STATS = {
  completedJobs: 86,
  averageRating: 4.9,
  weeklyEarnings: 18500,
  monthlyEarnings: 72000,
  availableEarnings: 45000,
};
