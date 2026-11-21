package com.notelagbe.service;

import com.notelagbe.entity.PlanType;
import com.notelagbe.entity.PricingCampaign;
import com.notelagbe.exception.ApiException;
import com.notelagbe.exception.ResourceNotFoundException;
import com.notelagbe.repository.PricingCampaignRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;

@Service
public class PricingCampaignService {

    private static final Logger log = LoggerFactory.getLogger(PricingCampaignService.class);

    private final PricingCampaignRepository pricingCampaignRepository;
    private final LiveSyncService liveSyncService;

    // Industry Standard Psychological Anchor (Original reference values)
    public static final double REGULAR_PRICE_SEMESTER_1 = 149.0;
    public static final double REGULAR_PRICE_SEMESTER_2 = 249.0;
    public static final double REGULAR_PRICE_YEAR_1 = 799.0;

    public PricingCampaignService(PricingCampaignRepository pricingCampaignRepository,
                                  LiveSyncService liveSyncService) {
        this.pricingCampaignRepository = pricingCampaignRepository;
        this.liveSyncService = liveSyncService;
    }

    public Optional<PricingCampaign> getActiveCampaign() {
        return pricingCampaignRepository.findCurrentActive();
    }

    public double calculatePriceFor(PlanType planType) {
        if (planType == null || planType == PlanType.FREE) {
            return 0.0;
        }
        Optional<PricingCampaign> activeOpt = getActiveCampaign();
        if (activeOpt.isPresent()) {
            PricingCampaign campaign = activeOpt.get();
            switch (planType) {
                case SEMESTER_1:
                    if (campaign.getSemester1Price() != null && campaign.getSemester1Price() > 0) {
                        return campaign.getSemester1Price();
                    }
                    break;
                case SEMESTER_2:
                    if (campaign.getSemester2Price() != null && campaign.getSemester2Price() > 0) {
                        return campaign.getSemester2Price();
                    }
                    break;
                case YEAR_1_UNLIMITED:
                    if (campaign.getYear1Price() != null && campaign.getYear1Price() > 0) {
                        return campaign.getYear1Price();
                    }
                    break;
                default:
                    break;
            }
        }
        return planType.getPrice();
    }

    public Map<String, Object> getPricingOverview() {
        Optional<PricingCampaign> activeOpt = getActiveCampaign();
        boolean hasActiveCampaign = activeOpt.isPresent();
        PricingCampaign campaign = activeOpt.orElse(null);

        Long remainingSeconds = null;
        if (campaign != null && campaign.getExpiresAt() != null) {
            Duration diff = Duration.between(LocalDateTime.now(), campaign.getExpiresAt());
            remainingSeconds = Math.max(0, diff.getSeconds());
        }

        List<Map<String, Object>> plans = new ArrayList<>();

        // Plan 1: SEMESTER_1
        double s1Base = PlanType.SEMESTER_1.getPrice(); // 99.0
        Double s1Campaign = (campaign != null && campaign.getSemester1Price() != null && campaign.getSemester1Price() > 0)
                ? campaign.getSemester1Price() : null;
        double s1Current = (s1Campaign != null) ? s1Campaign : s1Base;
        int s1Discount = (int) Math.round(((REGULAR_PRICE_SEMESTER_1 - s1Current) / REGULAR_PRICE_SEMESTER_1) * 100);

        plans.add(buildPlanMap(
                PlanType.SEMESTER_1,
                "1-Semester Plan",
                "১-সেমিস্টার প্ল্যান (৩ মাস)",
                REGULAR_PRICE_SEMESTER_1,
                s1Base,
                s1Campaign,
                s1Current,
                s1Discount,
                PlanType.SEMESTER_1.getCourseQuota(),
                PlanType.SEMESTER_1.getDurationMonths(),
                false
        ));

        // Plan 2: SEMESTER_2
        double s2Base = PlanType.SEMESTER_2.getPrice(); // 149.0
        Double s2Campaign = (campaign != null && campaign.getSemester2Price() != null && campaign.getSemester2Price() > 0)
                ? campaign.getSemester2Price() : null;
        double s2Current = (s2Campaign != null) ? s2Campaign : s2Base;
        int s2Discount = (int) Math.round(((REGULAR_PRICE_SEMESTER_2 - s2Current) / REGULAR_PRICE_SEMESTER_2) * 100);

        plans.add(buildPlanMap(
                PlanType.SEMESTER_2,
                "2-Semesters Plan",
                "২-সেমিস্টার প্ল্যান (৬ মাস)",
                REGULAR_PRICE_SEMESTER_2,
                s2Base,
                s2Campaign,
                s2Current,
                s2Discount,
                PlanType.SEMESTER_2.getCourseQuota(),
                PlanType.SEMESTER_2.getDurationMonths(),
                false
        ));

        // Plan 3: YEAR_1_UNLIMITED
        double y1Base = PlanType.YEAR_1_UNLIMITED.getPrice(); // 499.0
        Double y1Campaign = (campaign != null && campaign.getYear1Price() != null && campaign.getYear1Price() > 0)
                ? campaign.getYear1Price() : null;
        double y1Current = (y1Campaign != null) ? y1Campaign : y1Base;
        int y1Discount = (int) Math.round(((REGULAR_PRICE_YEAR_1 - y1Current) / REGULAR_PRICE_YEAR_1) * 100);

        plans.add(buildPlanMap(
                PlanType.YEAR_1_UNLIMITED,
                "1-Year Annual Pass",
                "১-বছরের অ্যানুয়াল পাস (১২ মাস)",
                REGULAR_PRICE_YEAR_1,
                y1Base,
                y1Campaign,
                y1Current,
                y1Discount,
                PlanType.YEAR_1_UNLIMITED.getCourseQuota(),
                PlanType.YEAR_1_UNLIMITED.getDurationMonths(),
                true
        ));

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("campaignActive", hasActiveCampaign);
        result.put("campaignId", campaign != null ? campaign.getId() : null);
        result.put("campaignName", campaign != null ? campaign.getName() : null);
        result.put("badgeText", campaign != null ? campaign.getBadgeText() : null);
        result.put("description", campaign != null ? campaign.getDescription() : null);
        result.put("startsAt", campaign != null ? campaign.getStartsAt() : null);
        result.put("expiresAt", campaign != null ? campaign.getExpiresAt() : null);
        result.put("remainingSeconds", remainingSeconds);
        result.put("plans", plans);

        return result;
    }

    private Map<String, Object> buildPlanMap(PlanType planType,
                                             String nameEn,
                                             String nameBn,
                                             double regularPrice,
                                             double basePrice,
                                             Double campaignPrice,
                                             double currentPrice,
                                             int discountPercent,
                                             int courseQuota,
                                             int durationMonths,
                                             boolean isUnlimited) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("planType", planType.name());
        m.put("nameEn", nameEn);
        m.put("nameBn", nameBn);
        m.put("regularPrice", regularPrice);
        m.put("basePrice", basePrice);
        m.put("campaignPrice", campaignPrice);
        m.put("currentPrice", currentPrice);
        m.put("discountPercent", discountPercent);
        m.put("courseQuota", courseQuota);
        m.put("durationMonths", durationMonths);
        m.put("isUnlimited", isUnlimited);
        return m;
    }

    public List<PricingCampaign> getAllCampaigns() {
        return pricingCampaignRepository.findAllByOrderByCreatedAtDesc();
    }

    @Transactional
    public PricingCampaign saveCampaign(Map<String, Object> payload) {
        Long id = payload.get("id") != null ? Long.valueOf(payload.get("id").toString()) : null;
        PricingCampaign campaign = id != null
                ? pricingCampaignRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Campaign not found with ID: " + id))
                : new PricingCampaign();

        String name = payload.get("name") != null ? payload.get("name").toString().trim() : "";
        if (name.isEmpty()) {
            throw new ApiException("Campaign name is required.", HttpStatus.BAD_REQUEST);
        }
        campaign.setName(name);
        campaign.setBadgeText(payload.get("badgeText") != null ? payload.get("badgeText").toString().trim() : null);
        campaign.setDescription(payload.get("description") != null ? payload.get("description").toString().trim() : null);

        if (payload.containsKey("active")) {
            campaign.setActive(Boolean.parseBoolean(payload.get("active").toString()));
        }

        if (payload.get("semester1Price") != null) {
            double p = Double.parseDouble(payload.get("semester1Price").toString());
            campaign.setSemester1Price(p > 0 ? p : null);
        } else {
            campaign.setSemester1Price(null);
        }

        if (payload.get("semester2Price") != null) {
            double p = Double.parseDouble(payload.get("semester2Price").toString());
            campaign.setSemester2Price(p > 0 ? p : null);
        } else {
            campaign.setSemester2Price(null);
        }

        if (payload.get("year1Price") != null) {
            double p = Double.parseDouble(payload.get("year1Price").toString());
            campaign.setYear1Price(p > 0 ? p : null);
        } else {
            campaign.setYear1Price(null);
        }

        if (payload.get("startsAt") != null && !payload.get("startsAt").toString().isBlank()) {
            campaign.setStartsAt(LocalDateTime.parse(payload.get("startsAt").toString().replace("Z", "")));
        } else {
            campaign.setStartsAt(null);
        }

        if (payload.get("expiresAt") != null && !payload.get("expiresAt").toString().isBlank()) {
            campaign.setExpiresAt(LocalDateTime.parse(payload.get("expiresAt").toString().replace("Z", "")));
        } else {
            campaign.setExpiresAt(null);
        }

        campaign.setUpdatedAt(LocalDateTime.now());
        PricingCampaign saved = pricingCampaignRepository.save(campaign);
        liveSyncService.broadcast("pricing", "campaign_updated", saved.getId());
        log.info("Saved pricing campaign #{}: {} (active={}, expiresAt={})", saved.getId(), saved.getName(), saved.isActive(), saved.getExpiresAt());
        return saved;
    }

    @Transactional
    public PricingCampaign toggleCampaign(Long id) {
        PricingCampaign campaign = pricingCampaignRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Campaign not found with ID: " + id));
        campaign.setActive(!campaign.isActive());
        campaign.setUpdatedAt(LocalDateTime.now());
        PricingCampaign saved = pricingCampaignRepository.save(campaign);
        liveSyncService.broadcast("pricing", "campaign_updated", saved.getId());
        return saved;
    }

    @Transactional
    public void deleteCampaign(Long id) {
        PricingCampaign campaign = pricingCampaignRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Campaign not found with ID: " + id));
        pricingCampaignRepository.delete(campaign);
        liveSyncService.broadcast("pricing", "campaign_deleted", id);
    }
}
