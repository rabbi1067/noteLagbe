package com.notelagbe.util;

import com.notelagbe.exception.ApiException;
import com.notelagbe.repository.UserRepository;
import org.springframework.http.HttpStatus;

import java.util.Locale;
import java.util.regex.Pattern;

public final class UserValidationHelper {

    private UserValidationHelper() {}

    private static final Pattern BASIC_EMAIL_PATTERN =
            Pattern.compile("^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$");

    // Bangladeshi phone numbers: 013, 014, 015, 016, 017, 018, 019 followed by 8 digits (11 digits total)
    private static final Pattern BD_PHONE_CANONICAL_PATTERN =
            Pattern.compile("^01[3-9]\\d{8}$");

    /**
     * Validates that the email is valid and belongs strictly to @gmail.com or @seu.edu.bd (or SEU subdomains).
     * Returns canonicalized lowercase trimmed email.
     */
    public static String validateAndNormalizeEmail(String rawEmail) {
        if (rawEmail == null || rawEmail.trim().isEmpty()) {
            throw new ApiException("Email address is required.", HttpStatus.BAD_REQUEST);
        }
        String cleanEmail = rawEmail.trim().toLowerCase(Locale.ROOT);
        if (cleanEmail.length() > 100) {
            throw new ApiException("Email address cannot exceed 100 characters.", HttpStatus.BAD_REQUEST);
        }
        if (!BASIC_EMAIL_PATTERN.matcher(cleanEmail).matches()) {
            throw new ApiException("Please enter a valid email address.", HttpStatus.BAD_REQUEST);
        }

        // Strict domain restriction: must end with @gmail.com or @seu.edu.bd (or @*.seu.edu.bd)
        boolean isGmail = cleanEmail.endsWith("@gmail.com");
        boolean isSeu = cleanEmail.endsWith("@seu.edu.bd")
                || cleanEmail.matches("^[a-zA-Z0-9._%+-]+@([a-zA-Z0-9-]+\\.)*seu\\.edu\\.bd$");

        if (!isGmail && !isSeu) {
            throw new ApiException(
                    "Only Southeast University (@seu.edu.bd) or Google (@gmail.com) email addresses are allowed.",
                    HttpStatus.BAD_REQUEST
            );
        }
        return cleanEmail;
    }

    /**
     * Asserts that the email is not already registered by any user (case-insensitive).
     */
    public static void assertUniqueEmail(String cleanEmail, Long excludeUserId, UserRepository userRepository) {
        if (cleanEmail == null || cleanEmail.isBlank() || userRepository == null) {
            return;
        }
        userRepository.findByEmailIgnoreCase(cleanEmail).ifPresent(existing -> {
            if (excludeUserId == null || !existing.getId().equals(excludeUserId)) {
                throw new ApiException(
                        "An account with this email address already exists! Please log in instead.",
                        HttpStatus.CONFLICT
                );
            }
        });
    }

    /**
     * Validates and normalizes phone number to standard 11-digit canonical format (01XXXXXXXXX).
     * If phone is null or empty, returns null.
     */
    public static String validateAndNormalizePhone(String rawPhone) {
        if (rawPhone == null || rawPhone.trim().isEmpty()) {
            return null;
        }
        String digits = rawPhone.trim().replaceAll("[^0-9]", "");
        if (digits.isEmpty()) {
            return null;
        }

        // Normalize prefixes: +8801... or 8801... -> 01...
        if (digits.startsWith("880") && digits.length() >= 13) {
            digits = digits.substring(2);
        } else if (digits.startsWith("88") && digits.length() >= 13) {
            digits = digits.substring(2);
        }

        if (!BD_PHONE_CANONICAL_PATTERN.matcher(digits).matches()) {
            throw new ApiException(
                    "Please enter a valid 11-digit Bangladeshi mobile number starting with 01 (e.g. 01712345678).",
                    HttpStatus.BAD_REQUEST
            );
        }
        return digits;
    }

    /**
     * Asserts that the mobile number is not already registered across any existing account.
     */
    public static void assertUniquePhone(String canonicalPhone, Long excludeUserId, UserRepository userRepository) {
        if (canonicalPhone == null || canonicalPhone.isBlank() || userRepository == null) {
            return;
        }
        String p1 = canonicalPhone;
        String p2 = "+88" + canonicalPhone;
        String p3 = "88" + canonicalPhone;

        var matches = userRepository.findMatchingPhoneUsers(p1, p2, p3);
        boolean conflict = matches.stream()
                .anyMatch(u -> excludeUserId == null || !u.getId().equals(excludeUserId));

        if (conflict) {
            throw new ApiException(
                    "This mobile number is already registered to another account! Please use a different phone number or log in.",
                    HttpStatus.CONFLICT
            );
        }
    }
}
