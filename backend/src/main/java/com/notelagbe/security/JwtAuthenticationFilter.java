package com.notelagbe.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenProvider tokenProvider;
    private final UserDetailsServiceImpl userDetailsService;

    public JwtAuthenticationFilter(JwtTokenProvider tokenProvider, UserDetailsServiceImpl userDetailsService) {
        this.tokenProvider = tokenProvider;
        this.userDetailsService = userDetailsService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        try {
            String jwt = getJwtFromRequest(request);

            if (StringUtils.hasText(jwt) && tokenProvider.validateToken(jwt)) {
                String username = tokenProvider.getUsernameFromToken(jwt);
                UserDetails userDetails = null;
                boolean userNotFound = false;

                try {
                    userDetails = userDetailsService.loadUserByUsername(username);
                } catch (UsernameNotFoundException ex) {
                    userNotFound = true;
                }

                if (userNotFound && shouldRejectInvalidSession(request)) {
                    SecurityContextHolder.clearContext();
                    writeJsonError(response, HttpServletResponse.SC_UNAUTHORIZED, "Account Removed", "ACCOUNT_DELETED", false,
                            "Your account no longer exists. Please sign in with a valid account.");
                    return;
                }

                if (userDetails != null && userDetails.isEnabled()) {
                    UsernamePasswordAuthenticationToken authentication =
                            new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
                    authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                    SecurityContextHolder.getContext().setAuthentication(authentication);
                } else if (userDetails != null && !userDetails.isEnabled()) {
                    logger.warn("Access attempt by suspended/blocked user: " + username);
                    if (shouldRejectInvalidSession(request)) {
                        SecurityContextHolder.clearContext();
                        writeJsonError(response, HttpServletResponse.SC_FORBIDDEN, "Account Blocked", "ACCOUNT_BLOCKED", true,
                                "Your account has been blocked by an administrator. You have been signed out.");
                        return;
                    }
                }
            }
        } catch (Exception ex) {
            logger.error("Could not set user authentication in security context", ex);
        }

        filterChain.doFilter(request, response);
    }

    private boolean shouldRejectInvalidSession(HttpServletRequest request) {
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            return false;
        }
        String uri = request.getRequestURI();
        if (uri == null) return true;
        return !uri.startsWith("/api/auth/logout")
                && !uri.startsWith("/api/auth/login")
                && !uri.startsWith("/api/auth/register")
                && !uri.startsWith("/api/auth/google")
                && !uri.startsWith("/api/sync/");
    }

    private void writeJsonError(HttpServletResponse response,
                                int status,
                                String error,
                                String code,
                                boolean blocked,
                                String message) throws IOException {
        response.setStatus(status);
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        String safeMessage = message.replace("\\", "\\\\").replace("\"", "\\\"");
        String payload = String.format(
                "{\"status\":%d,\"error\":\"%s\",\"code\":\"%s\",\"blocked\":%s,\"message\":\"%s\"}",
                status, error, code, blocked, safeMessage
        );
        response.getWriter().write(payload);
        response.getWriter().flush();
    }

    private String getJwtFromRequest(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        String tokenParam = request.getParameter("token");
        if (StringUtils.hasText(tokenParam)) {
            return tokenParam;
        }
        return null;
    }
}
