/**
 * NoteLagbe Enterprise Form & Identity Validation Suite
 * Strict Domain Enforcement: @seu.edu.bd (and subdomains) or @gmail.com
 * Strict Bangladeshi Mobile Validation: 11-digit 01[3-9]XXXXXXXX
 */

export const ALLOWED_EMAIL_HINT = "Only @seu.edu.bd or @gmail.com";
export const ALLOWED_EMAIL_HINT_BN = "শুধুমাত্র @seu.edu.bd অথবা @gmail.com";

export const EMAIL_DOMAIN_ERROR =
  "Only Southeast University (@seu.edu.bd) or Google (@gmail.com) email addresses are allowed.";
export const EMAIL_DOMAIN_ERROR_BN =
  "শুধুমাত্র Southeast University (@seu.edu.bd) অথবা Google (@gmail.com) ইমেইল গ্রহণযোগ্য।";

export const PHONE_FORMAT_ERROR =
  "Please enter a valid 11-digit Bangladeshi mobile number starting with 01 (e.g. 01712345678).";
export const PHONE_FORMAT_ERROR_BN =
  "অনুগ্রহ করে ০১ দিয়ে শুরু হওয়া ১১ ডিজিটের সঠিক মোবাইল নম্বর দিন (যেমন: 01712345678)।";

const BASIC_EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const SEU_DOMAIN_REGEX = /^[a-zA-Z0-9._%+-]+@([a-zA-Z0-9-]+\.)*seu\.edu\.bd$/i;
const GMAIL_DOMAIN_REGEX = /^[a-zA-Z0-9._%+-]+@gmail\.com$/i;

// Bangladeshi Operators: 013 (Grameenphone/Skitto), 014 (Banglalink), 015 (Teletalk), 016 (Airtel), 017 (Grameenphone), 018 (Robi), 019 (Banglalink)
const BD_PHONE_CANONICAL_REGEX = /^01[3-9]\d{8}$/;

/**
 * Validates that an email is well-formed AND strictly from an authorized domain (@gmail.com or @seu.edu.bd).
 */
export function isValidAllowedEmail(rawEmail?: string | null): boolean {
  if (!rawEmail) return false;
  const clean = rawEmail.trim().toLowerCase();
  if (clean.length < 5 || clean.length > 100) return false;
  if (!BASIC_EMAIL_REGEX.test(clean)) return false;

  return GMAIL_DOMAIN_REGEX.test(clean) || SEU_DOMAIN_REGEX.test(clean);
}

/**
 * Returns trimmed lowercase email.
 */
export function normalizeAllowedEmail(rawEmail: string): string {
  return (rawEmail || "").trim().toLowerCase();
}

/**
 * Normalizes any Bangladeshi phone representation (+88017..., 88017..., 017...)
 * into canonical 11-digit string (017...).
 */
export function normalizeBdPhone(rawPhone?: string | null): string {
  if (!rawPhone) return "";
  let digits = rawPhone.trim().replace(/\D/g, "");
  if (digits.startsWith("880") && digits.length >= 13) {
    digits = digits.slice(2);
  } else if (digits.startsWith("88") && digits.length >= 13) {
    digits = digits.slice(2);
  }
  return digits;
}

/**
 * Checks whether the phone number is a valid 11-digit Bangladeshi mobile number.
 */
export function isValidBdPhone(rawPhone?: string | null): boolean {
  if (!rawPhone) return false;
  const normalized = normalizeBdPhone(rawPhone);
  return BD_PHONE_CANONICAL_REGEX.test(normalized);
}
