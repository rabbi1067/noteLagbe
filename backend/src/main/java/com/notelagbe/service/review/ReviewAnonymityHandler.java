package com.notelagbe.service.review;

import com.notelagbe.entity.Review;
import com.notelagbe.entity.User;

/**
 * Single Responsibility & Open/Closed Principle:
 * Strategy contract for applying student privacy and anonymity rules to reviews.
 */
public interface ReviewAnonymityHandler {

    void applyAnonymityPolicy(Review review, User user, boolean isAnonymous);
}
