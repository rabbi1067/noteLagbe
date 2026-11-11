package com.notelagbe.security;

import com.notelagbe.entity.User;
import com.notelagbe.repository.UserRepository;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.Locale;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class UserDetailsServiceImpl implements UserDetailsService {

    private static final long USER_CACHE_TTL_MS = 45_000L;
    private static final int USER_CACHE_MAX_SIZE = 2_000;

    private record CachedUserEntry(User user, long expiresAtMs) {}

    private final UserRepository userRepository;
    private final ConcurrentHashMap<String, CachedUserEntry> userCache = new ConcurrentHashMap<>();

    public UserDetailsServiceImpl(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    private String normalizeEmailKey(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    }

    public Optional<User> findUserCachedOrLoad(String email) {
        String key = normalizeEmailKey(email);
        if (key.isEmpty()) {
            return Optional.empty();
        }
        long now = System.currentTimeMillis();
        CachedUserEntry cached = userCache.get(key);
        if (cached != null && now < cached.expiresAtMs()) {
            return Optional.of(cached.user());
        }
        Optional<User> loaded = userRepository.findByEmail(key);
        if (loaded.isPresent()) {
            if (userCache.size() > USER_CACHE_MAX_SIZE) {
                userCache.entrySet().removeIf(e -> now >= e.getValue().expiresAtMs());
                if (userCache.size() > USER_CACHE_MAX_SIZE) {
                    userCache.clear();
                }
            }
            userCache.put(key, new CachedUserEntry(loaded.get(), now + USER_CACHE_TTL_MS));
        } else {
            userCache.remove(key);
        }
        return loaded;
    }

    public void evictUserCache(String email) {
        String key = normalizeEmailKey(email);
        if (key.isEmpty()) {
            return;
        }
        userCache.remove(key);
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    userCache.remove(key);
                }
            });
        }
    }

    public void evictAllUserCache() {
        userCache.clear();
    }

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        User user = findUserCachedOrLoad(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with email: " + email));
        return new CustomUserDetails(user);
    }
}
