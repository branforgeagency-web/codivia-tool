const USER_LIMITS = Object.freeze({ name: 100, email: 254, phone: 20, organization: 120 });
// Contact number: Indian mobile only — 10 digits starting 6–9, optionally after +91, 91 or 0.
// Spaces, dashes and brackets are allowed while typing and removed. Stored as "+91 98765 43210".
const PHONE_INDIA = /^(?:\+91|91|0)?([6-9]\d{9})$/;
const USER_SORT_FIELDS = Object.freeze(['name', 'email', 'role', 'createdAt', 'lastLoginAt']);

module.exports = { USER_LIMITS, USER_SORT_FIELDS, PHONE_INDIA };
