/* CODIVIA — contact number rule (sign-up): Indian mobile only.
   10 digits starting with 6, 7, 8 or 9, optionally after +91, 91 or 0. Spaces, dashes and brackets are ignored.
   Same rule as the server (backend/src/validations/custom.validation.js → phoneNumber). */

// While typing: keep digits, spaces, dashes and brackets; a + only as the first character.
export const cleanPhoneInput = (v) => {
  const s = String(v || '').replace(/[^\d+ ()-]/g, '');
  return (s.startsWith('+') ? '+' : '') + s.replace(/\+/g, '');
};

// '' when the number is valid, otherwise the message to show under the field.
export const phoneError = (v) => {
  const compact = String(v || '').replace(/[\s()-]/g, '');
  if (!compact) return 'Enter your contact number.';
  let local = compact;
  if (local.startsWith('+')) {
    if (!local.startsWith('+91')) return 'Only Indian mobile numbers (+91) are accepted.';
    local = local.slice(3);
  } else if (local.length === 12 && local.startsWith('91')) local = local.slice(2);
  else if (local.length === 11 && local.startsWith('0')) local = local.slice(1);
  if (!/^\d+$/.test(local)) return 'Use digits only.';
  if (local.length !== 10) return `Mobile number must have 10 digits (you entered ${local.length}).`;
  if (!/^[6-9]/.test(local)) return 'Indian mobile numbers start with 6, 7, 8 or 9.';
  return '';
};
