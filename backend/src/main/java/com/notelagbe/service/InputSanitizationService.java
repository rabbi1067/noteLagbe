package com.notelagbe.service;

import com.notelagbe.exception.ApiException;
import org.springframework.stereotype.Service;

import java.util.HashSet;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * Enterprise Input Sanitization & Threat Shield Service
 * Defends against:
 * 1. XSS & HTML tag injections (<script>, <iframe>, onerror=, onload=, etc.)
 * 2. Rapid keyboard mashing & gibberish (12+ consecutive consonants, zero vowels)
 * 3. Repetitive character spamming (5+ identical consecutive characters)
 * 4. Toxic & vulgar profanity in English and Bengali
 * 5. Malformed mobile banking transaction IDs and Bangladeshi phone numbers
 */
@Service
public class InputSanitizationService {

    private final ProfanityFilterService profanityFilterService;

    // Fast pre-compiled security patterns
    private static final Pattern SCRIPT_OR_HTML_PATTERN = Pattern.compile(
            "(?i)<\\s*(script|iframe|style|object|embed|applet|svg|link|meta|img|a|body|html|form)[^>]*>|(?i)<\\s*/\\s*(script|iframe|style|object|embed|applet|svg|link|meta|img|a|body|html|form)[^>]*>|(?i)(javascript:|vbscript:|data:text/html|onerror\\s*=|onload\\s*=|onclick\\s*=|onmouseover\\s*=)"
    );

    private static final Pattern GENERIC_HTML_TAGS = Pattern.compile("<[^>]+>");
    private static final Pattern REPEATING_CHARS_STRICT = Pattern.compile("(?i)(.)\\1{4,}"); // 5+ repeating (e.g. aaaaa)
    private static final Pattern REPEATING_CHARS_CHAT = Pattern.compile("(?i)(.)\\1{6,}"); // 7+ repeating for chat
    private static final Pattern CONSONANT_MASH = Pattern.compile("(?i)\\b[bcdfghjklmnpqrstvwxyz]{12,}\\b");
    private static final Pattern MULTI_WHITESPACE = Pattern.compile("\\s{2,}");
    private static final Pattern BD_PHONE_REGEX = Pattern.compile("^01[3-9]\\d{8}$");
    private static final Pattern TRX_ID_REGEX = Pattern.compile("^[A-Z0-9]{6,25}$");
    private static final Pattern STUDENT_ID_REGEX = Pattern.compile("^[A-Za-z0-9\\-]{5,20}$");

    public InputSanitizationService(ProfanityFilterService profanityFilterService) {
        this.profanityFilterService = profanityFilterService;
    }

    /**
     * Strips all dangerous HTML, scripts, null bytes, and normalizes excess whitespace.
     */
    public String sanitizePlainText(String input) {
        if (input == null) return "";
        String text = input.replace("\0", "");
        text = SCRIPT_OR_HTML_PATTERN.matcher(text).replaceAll("");
        text = GENERIC_HTML_TAGS.matcher(text).replaceAll("");
        text = MULTI_WHITESPACE.matcher(text).replaceAll(" ").trim();
        return text;
    }

    /**
     * Comprehensive validation of user-submitted text content.
     * Enforces genuine length, rejects script injections, rejects gibberish keyboard mashes,
     * rejects repetitive spam, and validates against abusive profanity.
     */
    public String validateGenuineText(String text, String fieldName, int minLen, int maxLen, boolean checkProfanity) {
        if (text == null || text.trim().isEmpty()) {
            throw new ApiException(fieldName + " cannot be empty.");
        }

        // 1. Detect direct HTML/script/XSS injection attempts
        if (SCRIPT_OR_HTML_PATTERN.matcher(text).find() || text.contains("<") || text.contains(">")) {
            throw new ApiException(
                    "HTML tags, scripts, and code snippets are not allowed in " + fieldName + "."
            );
        }

        // 2. Sanitize and normalize
        String clean = sanitizePlainText(text);

        // 3. Length boundaries
        if (clean.length() < minLen) {
            throw new ApiException(
                    fieldName + " must be at least " + minLen + " characters long."
            );
        }
        if (clean.length() > maxLen) {
            throw new ApiException(
                    fieldName + " cannot exceed " + maxLen + " characters."
            );
        }

        // 4. Excessive repeating characters spam check (e.g. "aaaaaaa", "zzzzzzz", "111111")
        if (REPEATING_CHARS_STRICT.matcher(clean).find()) {
            throw new ApiException(
                    fieldName + " contains excessive repetitive spam characters."
            );
        }

        // 5. Gibberish consonant keyboard mash check (e.g. "asdfghjklzxcvbnm", "qwrtsdfg")
        if (CONSONANT_MASH.matcher(clean).find()) {
            throw new ApiException(
                    fieldName + " contains unrecognized gibberish. Please write meaningful words."
            );
        }

        // 6. Character entropy / minimum distinct characters check
        if (clean.length() >= 10) {
            Set<Character> uniqueChars = new HashSet<>();
            for (char c : clean.toLowerCase().toCharArray()) {
                if (Character.isLetterOrDigit(c)) {
                    uniqueChars.add(c);
                }
            }
            if (uniqueChars.size() < 4) {
                throw new ApiException(
                        fieldName + " does not appear to be meaningful text. Please provide genuine content."
                );
            }
        }

        // 7. Profanity & abusive language check
        if (checkProfanity && profanityFilterService.containsProfanity(clean)) {
            throw new ApiException(
                    fieldName + " contains inappropriate or abusive language. Please keep your submission respectful."
            );
        }

        return clean;
    }

    /**
     * Sanitizes and validates course and faculty evaluations.
     */
    public String sanitizeAndValidateReview(String comment) {
        return validateGenuineText(comment, "Review comment", 10, 500, true);
    }

    /**
     * Sanitizes and validates community chat messages.
     * Strips HTML/XSS, detects extreme spam, and applies asterisks to profanity.
     */
    public String sanitizeAndValidateChatMessage(String text) {
        if (text == null || text.trim().isEmpty()) {
            throw new ApiException("Message text cannot be empty.");
        }

        if (SCRIPT_OR_HTML_PATTERN.matcher(text).find() || text.contains("<") || text.contains(">")) {
            throw new ApiException("HTML tags and script injections are not allowed in chat messages.");
        }

        String clean = sanitizePlainText(text);

        if (clean.length() > 2000) {
            throw new ApiException("Message cannot exceed 2000 characters.");
        }

        if (REPEATING_CHARS_CHAT.matcher(clean).find()) {
            throw new ApiException("Message contains repetitive spam characters.");
        }

        if (CONSONANT_MASH.matcher(clean).find()) {
            throw new ApiException("Message contains unrecognized gibberish. Please write meaningful text.");
        }

        // Automatically mask profanity with asterisks in chat
        return profanityFilterService.filterProfanity(clean);
    }

    /**
     * Sanitizes and validates financial aid waiver reasons.
     */
    public String sanitizeAndValidateWaiverReason(String reason) {
        return validateGenuineText(reason, "Waiver explanation reason", 20, 600, true);
    }

    /**
     * Validates and normalizes bKash / Nagad mobile banking Transaction IDs.
     */
    public String sanitizeAndValidateTransactionId(String trxId) {
        if (trxId == null || trxId.trim().isEmpty()) {
            throw new ApiException("Transaction ID is required.");
        }

        String clean = trxId.trim().replaceAll("\\s+", "").toUpperCase();

        if (!TRX_ID_REGEX.matcher(clean).matches()) {
            throw new ApiException(
                    "Invalid Transaction ID. Must be 6 to 25 uppercase alphanumeric characters (e.g. BL9A7XYZ89)."
            );
        }

        return clean;
    }

    /**
     * Validates and standardizes Bangladeshi mobile phone numbers (11 digits: 013-019).
     */
    public String sanitizeAndValidatePhoneNumber(String phone) {
        if (phone == null || phone.trim().isEmpty()) {
            throw new ApiException("Mobile phone number is required.");
        }

        String clean = phone.trim().replaceAll("[\\s\\-\\(\\)]", "");

        if (clean.startsWith("+8801")) {
            clean = clean.substring(3);
        } else if (clean.startsWith("8801")) {
            clean = clean.substring(2);
        }

        if (!BD_PHONE_REGEX.matcher(clean).matches()) {
            throw new ApiException(
                    "Invalid phone number. Please enter a valid 11-digit Bangladeshi mobile number (e.g. 01712345678)."
            );
        }

        return clean;
    }

    /**
     * Validates student ID format.
     */
    public String sanitizeAndValidateStudentId(String studentId) {
        if (studentId == null || studentId.trim().isEmpty()) {
            throw new ApiException("Student ID is required.");
        }

        String clean = studentId.trim();

        if (!STUDENT_ID_REGEX.matcher(clean).matches()) {
            throw new ApiException(
                    "Invalid Student ID format. Only alphanumeric characters and hyphens allowed (5-20 chars)."
            );
        }

        return clean;
    }
}
