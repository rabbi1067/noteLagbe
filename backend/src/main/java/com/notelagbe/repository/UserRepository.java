package com.notelagbe.repository;

import com.notelagbe.entity.Role;
import com.notelagbe.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);

    Optional<User> findByPhone(String phone);
    boolean existsByPhone(String phone);

    @Query("SELECT u FROM User u WHERE u.phone IS NOT NULL AND (u.phone = :p1 OR u.phone = :p2 OR u.phone = :p3)")
    List<User> findMatchingPhoneUsers(@Param("p1") String p1, @Param("p2") String p2, @Param("p3") String p3);

    Optional<User> findByStudentId(String studentId);
    boolean existsByStudentId(String studentId);

    List<User> findByRoleIn(List<Role> roles);
    List<User> findByRoleOrderByIdDesc(Role role);
}
