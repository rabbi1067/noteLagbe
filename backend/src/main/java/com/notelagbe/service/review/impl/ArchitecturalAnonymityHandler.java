package com.notelagbe.service.review.impl;

import com.notelagbe.entity.Review;
import com.notelagbe.entity.User;
import com.notelagbe.service.review.ReviewAnonymityHandler;
import org.springframework.stereotype.Component;

/**
 * Single Responsibility Principle (SRP):
 * Enforces Architectural Anonymity:
 * When anonymous, user reference is strictly NULL in database storage,
 * eliminating student identity traces from the review record.
 */
@Component
public class ArchitecturalAnonymityHandler implements ReviewAnonymityHandler {

    private static final String DEFAULT_ANONYMOUS_NAME = "Anonymous Student";

    @Override
    public void applyAnonymityPolicy(Review review, User user, boolean isAnonymous) {
        if (isAnonymous) {
            review.setUser(null); // Omit user reference from the review entity
            review.setAuthorName(DEFAULT_ANONYMOUS_NAME);
            review.setAnonymous(true);
        } else {
            review.setUser(user);
            review.setAuthorName(user != null ? user.getName() : DEFAULT_ANONYMOUS_NAME);
            review.setAnonymous(false);
        }
    }
}
