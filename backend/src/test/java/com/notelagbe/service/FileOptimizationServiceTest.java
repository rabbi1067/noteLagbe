package com.notelagbe.service;

import com.notelagbe.util.InMemoryMultipartFile;
import org.junit.jupiter.api.Test;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;

import static org.junit.jupiter.api.Assertions.*;

public class FileOptimizationServiceTest {

    @Test
    public void testOptimizeLargeImageGeneratesOptimizedJpeg() throws Exception {
        FileOptimizationService optimizer = new FileOptimizationService();

        // Create a large 2400x1800 uncompressed image with text
        BufferedImage img = new BufferedImage(2400, 1800, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = img.createGraphics();
        g.setColor(Color.WHITE);
        g.fillRect(0, 0, 2400, 1800);
        g.setColor(Color.BLACK);
        g.setFont(new Font("SansSerif", Font.BOLD, 48));
        for (int i = 0; i < 20; i++) {
            g.drawString("SEU Academic Notes - CSE241 Data Structures Lecture Note Line " + i, 50, 100 + (i * 80));
        }
        g.dispose();

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        ImageIO.write(img, "png", baos);
        byte[] largePngBytes = baos.toByteArray();

        MultipartFile originalFile = new InMemoryMultipartFile(
                "file",
                "lecture_note_large.png",
                "image/png",
                largePngBytes
        );

        FileOptimizationService.OptimizedFileResult result = optimizer.optimizeMaterialFile(originalFile);

        assertNotNull(result);
        if (largePngBytes.length > 300 * 1024) {
            assertTrue(result.isOptimized(), "Image larger than 300KB should be optimized");
            assertTrue(result.getOptimizedSize() < result.getOriginalSize(), "Optimized size should be smaller than original");
            assertTrue(result.getPercentSaved() > 0, "Percent saved should be greater than 0");
            assertEquals("image/jpeg", result.getFile().getContentType());
        }
    }

    @Test
    public void testSmallImageOrNullFileReturnsGracefully() {
        FileOptimizationService optimizer = new FileOptimizationService();
        FileOptimizationService.OptimizedFileResult resultNull = optimizer.optimizeMaterialFile(null);
        assertNotNull(resultNull);
        assertFalse(resultNull.isOptimized());

        MultipartFile smallFile = new InMemoryMultipartFile(
                "file",
                "small.png",
                "image/png",
                new byte[1024]
        );
        FileOptimizationService.OptimizedFileResult resultSmall = optimizer.optimizeMaterialFile(smallFile);
        assertNotNull(resultSmall);
        assertFalse(resultSmall.isOptimized());
        assertEquals(smallFile, resultSmall.getFile());
    }
}
