package com.notelagbe.service;

import com.notelagbe.entity.PlanType;
import com.notelagbe.entity.PricingCampaign;
import com.notelagbe.repository.PricingCampaignRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PricingCampaignServiceTest {

    @Mock
    private PricingCampaignRepository pricingCampaignRepository;

    @Mock
    private LiveSyncService liveSyncService;

    private PricingCampaignService pricingCampaignService;

    @BeforeEach
    void setUp() {
        pricingCampaignService = new PricingCampaignService(pricingCampaignRepository, liveSyncService);
    }

    @Test
    @DisplayName("Should return standard base prices when no active campaign exists")
    void getPricingOverview_NoActiveCampaign_ReturnsStandardBasePrices() {
        when(pricingCampaignRepository.findCurrentActive()).thenReturn(Optional.empty());

        Map<String, Object> overview = pricingCampaignService.getPricingOverview();

        assertNotNull(overview);
        assertFalse((Boolean) overview.get("campaignActive"));
        assertNull(overview.get("campaignName"));

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> plans = (List<Map<String, Object>>) overview.get("plans");
        assertEquals(3, plans.size());

        Map<String, Object> sem1 = plans.stream().filter(p -> p.get("planType").equals("SEMESTER_1")).findFirst().orElseThrow();
        assertEquals(99.0, ((Number) sem1.get("currentPrice")).doubleValue(), 0.001);
        assertEquals(99.0, ((Number) sem1.get("basePrice")).doubleValue(), 0.001);
        assertEquals(false, sem1.get("isDiscounted"));

        Map<String, Object> sem2 = plans.stream().filter(p -> p.get("planType").equals("SEMESTER_2")).findFirst().orElseThrow();
        assertEquals(149.0, ((Number) sem2.get("currentPrice")).doubleValue(), 0.001);
        assertEquals(149.0, ((Number) sem2.get("basePrice")).doubleValue(), 0.001);

        Map<String, Object> year1 = plans.stream().filter(p -> p.get("planType").equals("YEAR_1_UNLIMITED")).findFirst().orElseThrow();
        assertEquals(499.0, ((Number) year1.get("currentPrice")).doubleValue(), 0.001);
        assertEquals(499.0, ((Number) year1.get("basePrice")).doubleValue(), 0.001);
    }

    @Test
    @DisplayName("Should apply campaign discounts when active campaign is present")
    void getPricingOverview_ActiveCampaign_AppliesDiscountsCorrectly() {
        PricingCampaign campaign = new PricingCampaign();
        campaign.setId(10L);
        campaign.setName("Ramadan Flash Discount");
        campaign.setBadgeText("🔥 বিশেষ ছাড়");
        campaign.setDescription("Special 33% discount on all plans");
        campaign.setSemester1Price(79.0);
        campaign.setSemester2Price(119.0);
        campaign.setYear1Price(399.0);
        campaign.setActive(true);
        campaign.setStartsAt(LocalDateTime.now().minusDays(1));
        campaign.setExpiresAt(LocalDateTime.now().plusDays(6));

        when(pricingCampaignRepository.findCurrentActive()).thenReturn(Optional.of(campaign));

        Map<String, Object> overview = pricingCampaignService.getPricingOverview();

        assertTrue((Boolean) overview.get("campaignActive"));
        assertEquals("Ramadan Flash Discount", overview.get("campaignName"));
        assertEquals("🔥 বিশেষ ছাড়", overview.get("badgeText"));

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> plans = (List<Map<String, Object>>) overview.get("plans");

        Map<String, Object> sem1 = plans.stream().filter(p -> p.get("planType").equals("SEMESTER_1")).findFirst().orElseThrow();
        assertEquals(79.0, ((Number) sem1.get("currentPrice")).doubleValue(), 0.001);
        assertEquals(99.0, ((Number) sem1.get("basePrice")).doubleValue(), 0.001);
        assertEquals(true, sem1.get("isDiscounted"));

        Map<String, Object> sem2 = plans.stream().filter(p -> p.get("planType").equals("SEMESTER_2")).findFirst().orElseThrow();
        assertEquals(119.0, ((Number) sem2.get("currentPrice")).doubleValue(), 0.001);
        assertEquals(149.0, ((Number) sem2.get("basePrice")).doubleValue(), 0.001);
        assertEquals(true, sem2.get("isDiscounted"));

        Map<String, Object> year1 = plans.stream().filter(p -> p.get("planType").equals("YEAR_1_UNLIMITED")).findFirst().orElseThrow();
        assertEquals(399.0, ((Number) year1.get("currentPrice")).doubleValue(), 0.001);
        assertEquals(499.0, ((Number) year1.get("basePrice")).doubleValue(), 0.001);
        assertEquals(true, year1.get("isDiscounted"));
    }

    @Test
    @DisplayName("Should calculate expected plan amount matching active campaign")
    void calculatePriceFor_ReturnsDiscountedOrBaseCorrectly() {
        PricingCampaign campaign = new PricingCampaign();
        campaign.setSemester1Price(69.0);
        campaign.setSemester2Price(129.0);
        campaign.setYear1Price(null); // not overridden
        campaign.setActive(true);

        when(pricingCampaignRepository.findCurrentActive()).thenReturn(Optional.of(campaign));

        assertEquals(69.0, pricingCampaignService.calculatePriceFor(PlanType.SEMESTER_1), 0.001);
        assertEquals(129.0, pricingCampaignService.calculatePriceFor(PlanType.SEMESTER_2), 0.001);
        assertEquals(499.0, pricingCampaignService.calculatePriceFor(PlanType.YEAR_1_UNLIMITED), 0.001); // falls back to base
    }

    @Test
    @DisplayName("PricingCampaign isCurrentlyActive evaluates schedule and active flag correctly")
    void pricingCampaign_isCurrentlyActive_EvaluatesEdgeCases() {
        PricingCampaign c = new PricingCampaign();

        // 1. Inactive flag -> false
        c.setActive(false);
        assertFalse(c.isCurrentlyActive());

        // 2. Active with null dates -> true
        c.setActive(true);
        assertTrue(c.isCurrentlyActive());

        // 3. Active with startsAt in future -> false
        c.setStartsAt(LocalDateTime.now().plusHours(2));
        assertFalse(c.isCurrentlyActive());

        // 4. Active with startsAt in past and expiresAt in past -> false (Expired)
        c.setStartsAt(LocalDateTime.now().minusDays(3));
        c.setExpiresAt(LocalDateTime.now().minusHours(1));
        assertFalse(c.isCurrentlyActive());

        // 5. Active with startsAt in past and expiresAt in future -> true (Live)
        c.setExpiresAt(LocalDateTime.now().plusDays(5));
        assertTrue(c.isCurrentlyActive());
    }

    @Test
    @DisplayName("Should save campaign and broadcast sync event")
    void saveCampaign_SavesEntityAndBroadcasts() {
        when(pricingCampaignRepository.save(any(PricingCampaign.class))).thenAnswer(invocation -> {
            PricingCampaign saved = invocation.getArgument(0);
            saved.setId(100L);
            return saved;
        });

        Map<String, Object> payload = Map.of(
                "name", "Flash Weekend",
                "badgeText", "⚡ 48H FLASH",
                "semester1Price", 75.0,
                "active", true
        );

        PricingCampaign result = pricingCampaignService.saveCampaign(payload);

        assertNotNull(result);
        assertEquals(100L, result.getId());
        assertEquals("Flash Weekend", result.getName());
        assertEquals("⚡ 48H FLASH", result.getBadgeText());
        assertEquals(75.0, result.getSemester1Price(), 0.001);
        verify(pricingCampaignRepository).save(any(PricingCampaign.class));
        verify(liveSyncService).broadcast(eq("pricing"), eq("campaign_updated"), eq(100L));
    }
}
