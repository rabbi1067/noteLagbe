package com.notelagbe.repository;

import com.notelagbe.entity.PricingCampaign;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface PricingCampaignRepository extends JpaRepository<PricingCampaign, Long> {

    List<PricingCampaign> findAllByOrderByCreatedAtDesc();

    @Query("""
        SELECT c FROM PricingCampaign c
        WHERE c.active = true
          AND (c.startsAt IS NULL OR c.startsAt <= :now)
          AND (c.expiresAt IS NULL OR c.expiresAt > :now)
        ORDER BY c.updatedAt DESC
    """)
    List<PricingCampaign> findActiveCampaigns(@Param("now") LocalDateTime now);

    default Optional<PricingCampaign> findCurrentActive() {
        List<PricingCampaign> activeList = findActiveCampaigns(LocalDateTime.now());
        return activeList.isEmpty() ? Optional.empty() : Optional.of(activeList.get(0));
    }
}
