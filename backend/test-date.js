const bookingDate = new Date(); // Today
bookingDate.setDate(bookingDate.getDate() - 1); // Yesterday

const nextDate = new Date(bookingDate);
nextDate.setDate(nextDate.getDate() + 1);
nextDate.setHours(23, 59, 59, 999);

const now = new Date();

console.log("Booking Date:", bookingDate.toLocaleString());
console.log("Next Date Cutoff:", nextDate.toLocaleString());
console.log("Now:", now.toLocaleString());
console.log("Is Locked?", now > nextDate);
