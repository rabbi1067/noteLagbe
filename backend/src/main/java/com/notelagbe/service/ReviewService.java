package com.notelagbe.service;

import com.notelagbe.service.review.ReviewModerationService;
import com.notelagbe.service.review.ReviewQueryService;
import com.notelagbe.service.review.ReviewSubmissionService;

/**
 * Composite Service Contract (DIP & ISP):
 * Inherits segregated contracts for components that require broad review access,
 * while allowing focused clients to inject only specific sub-interfaces.
 */
public interface ReviewService extends ReviewSubmissionService, ReviewQueryService, ReviewModerationService {
}
