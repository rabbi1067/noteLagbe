package com.notelagbe.security;

import com.notelagbe.config.RateLimitFilter;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RateLimitAndAdminBypassTest {

    @Mock
    private JwtTokenProvider tokenProvider;

    @InjectMocks
    private RateLimitFilter rateLimitFilter;

    @BeforeEach
    void setUp() {
        rateLimitFilter.cleanupIdleBuckets();
    }

    @Test
    void studentBurstClicksBlockedByRapidMutationGuard() throws Exception {
        MockHttpServletRequest request1 = new MockHttpServletRequest("POST", "/api/reviews");
        request1.setRemoteAddr("198.51.100.12");
        MockHttpServletResponse response1 = new MockHttpServletResponse();
        MockFilterChain filterChain1 = new MockFilterChain();

        rateLimitFilter.doFilter(request1, response1, filterChain1);
        assertEquals(200, response1.getStatus());

        // Immediate rapid follow-up click (within < 350ms)
        MockHttpServletRequest request2 = new MockHttpServletRequest("POST", "/api/reviews");
        request2.setRemoteAddr("198.51.100.12");
        MockHttpServletResponse response2 = new MockHttpServletResponse();
        MockFilterChain filterChain2 = new MockFilterChain();

        rateLimitFilter.doFilter(request2, response2, filterChain2);
        assertEquals(429, response2.getStatus());
        assertTrue(response2.getContentAsString().contains("Too Many Requests"));
        assertTrue(response2.getContentAsString().contains("খুব দ্রুত ক্লিক করছেন"));
    }

    @Test
    void adminRapidClicksBypassRapidMutationGuardAndRateLimits() throws Exception {
        String adminToken = "valid.admin.jwt.token";
        when(tokenProvider.validateToken(adminToken)).thenReturn(true);
        when(tokenProvider.getRolesFromToken(adminToken)).thenReturn("ROLE_ADMIN");

        // 10 consecutive rapid POST uploads (like bulk uploading lecture notes or question papers)
        for (int i = 0; i < 10; i++) {
            MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/admin/resources");
            request.setRemoteAddr("203.0.113.88");
            request.addHeader("Authorization", "Bearer " + adminToken);
            MockHttpServletResponse response = new MockHttpServletResponse();
            MockFilterChain filterChain = new MockFilterChain();

            rateLimitFilter.doFilter(request, response, filterChain);
            assertEquals(200, response.getStatus(), "Admin upload #" + (i + 1) + " must not be blocked!");
        }
    }

    @Test
    void superAdminBypassesRateLimits() throws Exception {
        String superAdminToken = "valid.superadmin.jwt.token";
        when(tokenProvider.validateToken(superAdminToken)).thenReturn(true);
        when(tokenProvider.getRolesFromToken(superAdminToken)).thenReturn("ROLE_SUPER_ADMIN");

        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/admin/teachers");
        request.setRemoteAddr("198.51.100.99");
        request.addHeader("Authorization", "Bearer " + superAdminToken);
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain filterChain = new MockFilterChain();

        rateLimitFilter.doFilter(request, response, filterChain);
        assertEquals(200, response.getStatus());
    }
}
