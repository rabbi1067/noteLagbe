package com.notelagbe.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "pricing_campaigns")
public class PricingCampaign {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    private String badgeText;

    private boolean active = true;

    // Flash campaign overrides for the 3 paid tiers (null or <= 0 means standard price)
    private Double semester1Price; // Standard: 99.0
    private Double semester2Price; // Standard: 149.0
    private Double year1Price;     // Standard: 499.0

    private LocalDateTime startsAt;
    private LocalDateTime expiresAt; // Auto-expiry date & time

    @Column(columnDefinition = "TEXT")
    private String description;

    private LocalDateTime createdAt = LocalDateTime.now();
    private LocalDateTime updatedAt = LocalDateTime.now();

    public PricingCampaign() {}

    public boolean isCurrentlyActive() {
        if (!active) return false;
        LocalDateTime now = LocalDateTime.now();
        if (startsAt != null && now.isBefore(startsAt)) return false;
        if (expiresAt != null && now.isAfter(expiresAt)) return false;
        return true;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getBadgeText() { return badgeText; }
    public void setBadgeText(String badgeText) { this.badgeText = badgeText; }

    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }

    public Double getSemester1Price() { return semester1Price; }
    public void setSemester1Price(Double semester1Price) { this.semester1Price = semester1Price; }

    public Double getSemester2Price() { return semester2Price; }
    public void setSemester2Price(Double semester2Price) { this.semester2Price = semester2Price; }

    public Double getYear1Price() { return year1Price; }
    public void setYear1Price(Double year1Price) { this.year1Price = year1Price; }

    public LocalDateTime getStartsAt() { return startsAt; }
    public void setStartsAt(LocalDateTime startsAt) { this.startsAt = startsAt; }

    public LocalDateTime getExpiresAt() { return expiresAt; }
    public void setExpiresAt(LocalDateTime expiresAt) { this.expiresAt = expiresAt; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
