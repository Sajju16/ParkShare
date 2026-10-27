package com.parkshare.service;

import com.parkshare.entity.ParkingSpace;
import com.parkshare.entity.ParkingSpaceImage;
import com.parkshare.repository.ParkingSpaceImageRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ImageStorageServiceTest {

    @Mock
    private ParkingSpaceImageRepository parkingSpaceImageRepository;

    @InjectMocks
    private ImageStorageService imageStorageService;

    private byte[] validJpegBytes;
    private byte[] validPngBytes;
    private byte[] validWebPBytes;

    @BeforeEach
    void setUp() {
        // JPEG magic bytes: FF D8 FF E0 + padding
        validJpegBytes = new byte[]{(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0};

        // PNG magic bytes: 89 50 4E 47 0D 0A 1A 0A + padding
        validPngBytes = new byte[]{(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0, 0, 0, 0, 0};

        // WebP magic bytes: RIFF....WEBP + padding
        validWebPBytes = new byte[]{'R', 'I', 'F', 'F', 0, 0, 0, 0, 'W', 'E', 'B', 'P', 0, 0, 0, 0};
    }

    @Test
    void testValidateImage_WhenFileEmpty_ThrowsIllegalArgumentException() {
        MockMultipartFile emptyFile = new MockMultipartFile("file", "test.jpg", "image/jpeg", new byte[0]);
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                imageStorageService.validateImage(emptyFile)
        );
        assertTrue(ex.getMessage().contains("empty"));
    }

    @Test
    void testValidateImage_WhenFileSizeExceeds5MB_ThrowsIllegalArgumentException() {
        byte[] largeBytes = new byte[5 * 1024 * 1024 + 1];
        System.arraycopy(validJpegBytes, 0, largeBytes, 0, validJpegBytes.length);
        MockMultipartFile largeFile = new MockMultipartFile("file", "large.jpg", "image/jpeg", largeBytes);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                imageStorageService.validateImage(largeFile)
        );
        assertTrue(ex.getMessage().contains("5 MB limit"));
    }

    @Test
    void testValidateImage_WhenUnsupportedContentType_ThrowsIllegalArgumentException() {
        MockMultipartFile gifFile = new MockMultipartFile("file", "anim.gif", "image/gif", new byte[]{1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12});
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                imageStorageService.validateImage(gifFile)
        );
        assertTrue(ex.getMessage().contains("Invalid image type"));
    }

    @Test
    void testValidateImage_WhenSpoofedContent_ThrowsIllegalArgumentException() {
        byte[] fakeBytes = "This is a plain text file pretending to be JPEG".getBytes();
        MockMultipartFile spoofedFile = new MockMultipartFile("file", "fake.jpg", "image/jpeg", fakeBytes);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                imageStorageService.validateImage(spoofedFile)
        );
        assertTrue(ex.getMessage().contains("File content does not match"));
    }

    @Test
    void testStoreImage_WhenValidJpeg_SavesAndReturnsUrl() throws IOException {
        MockMultipartFile validFile = new MockMultipartFile("file", "photo.jpg", "image/jpeg", validJpegBytes);

        ParkingSpaceImage savedEntity = new ParkingSpaceImage();
        savedEntity.setId(42L);
        savedEntity.setData(validJpegBytes);
        savedEntity.setContentType("image/jpeg");
        savedEntity.setOriginalFilename("photo.jpg");
        savedEntity.setFileSize((long) validJpegBytes.length);

        when(parkingSpaceImageRepository.save(any(ParkingSpaceImage.class))).thenReturn(savedEntity);

        String resultUrl = imageStorageService.storeImage(validFile);

        assertNotNull(resultUrl);
        assertTrue(resultUrl.contains("/api/v1/parking/public/images/42"));

        ArgumentCaptor<ParkingSpaceImage> captor = ArgumentCaptor.forClass(ParkingSpaceImage.class);
        verify(parkingSpaceImageRepository).save(captor.capture());
        ParkingSpaceImage captured = captor.getValue();
        assertEquals("image/jpeg", captured.getContentType());
        assertEquals("photo.jpg", captured.getOriginalFilename());
        assertArrayEquals(validJpegBytes, captured.getData());
    }

    @Test
    void testStoreImage_WhenValidPng_SavesAndReturnsUrl() throws IOException {
        MockMultipartFile validFile = new MockMultipartFile("file", "diagram.png", "image/png", validPngBytes);

        ParkingSpaceImage savedEntity = new ParkingSpaceImage();
        savedEntity.setId(101L);
        savedEntity.setData(validPngBytes);
        savedEntity.setContentType("image/png");

        when(parkingSpaceImageRepository.save(any(ParkingSpaceImage.class))).thenReturn(savedEntity);

        String resultUrl = imageStorageService.storeImage(validFile);

        assertNotNull(resultUrl);
        assertTrue(resultUrl.contains("/api/v1/parking/public/images/101"));
    }

    @Test
    void testStoreImage_WhenValidWebP_SavesAndReturnsUrl() throws IOException {
        MockMultipartFile validFile = new MockMultipartFile("file", "banner.webp", "image/webp", validWebPBytes);

        ParkingSpaceImage savedEntity = new ParkingSpaceImage();
        savedEntity.setId(202L);
        savedEntity.setData(validWebPBytes);
        savedEntity.setContentType("image/webp");

        when(parkingSpaceImageRepository.save(any(ParkingSpaceImage.class))).thenReturn(savedEntity);

        String resultUrl = imageStorageService.storeImage(validFile);

        assertNotNull(resultUrl);
        assertTrue(resultUrl.contains("/api/v1/parking/public/images/202"));
    }

    @Test
    void testGetImage_WhenExists_ReturnsImage() {
        ParkingSpaceImage image = new ParkingSpaceImage();
        image.setId(15L);
        image.setData(validJpegBytes);
        when(parkingSpaceImageRepository.findActiveById(15L)).thenReturn(Optional.of(image));

        Optional<ParkingSpaceImage> result = imageStorageService.getImage(15L);
        assertTrue(result.isPresent());
        assertEquals(15L, result.get().getId());
    }

    @Test
    void testGetImage_WhenNotFound_ReturnsEmpty() {
        when(parkingSpaceImageRepository.findActiveById(999L)).thenReturn(Optional.empty());

        Optional<ParkingSpaceImage> result = imageStorageService.getImage(999L);
        assertFalse(result.isPresent());
    }

    @Test
    void testSyncSpaceImages_LinksNewImagesAndSoftDeletesUnlinked() {
        ParkingSpace space = new ParkingSpace();
        space.setId(10L);

        // Currently stored in DB for this space: image 1 and image 2
        ParkingSpaceImage img1 = new ParkingSpaceImage();
        img1.setId(1L);
        img1.setParkingSpace(space);

        ParkingSpaceImage img2 = new ParkingSpaceImage();
        img2.setId(2L);
        img2.setParkingSpace(space);

        List<ParkingSpaceImage> currentDbImages = new ArrayList<>(List.of(img1, img2));
        when(parkingSpaceImageRepository.findByParkingSpaceIdAndDeletedFalse(10L)).thenReturn(currentDbImages);

        // Image 3 is newly uploaded (not yet linked)
        ParkingSpaceImage img3 = new ParkingSpaceImage();
        img3.setId(3L);
        when(parkingSpaceImageRepository.findActiveById(1L)).thenReturn(Optional.of(img1));
        when(parkingSpaceImageRepository.findActiveById(3L)).thenReturn(Optional.of(img3));

        // Owner kept image 1, removed image 2, and added image 3
        List<String> retainedUrls = List.of(
                "http://localhost:8080/api/v1/parking/public/images/1",
                "http://localhost:8080/api/v1/parking/public/images/3"
        );

        imageStorageService.syncSpaceImages(space, retainedUrls);

        // Verify img3 is now linked to space
        assertEquals(space, img3.getParkingSpace());
        verify(parkingSpaceImageRepository).save(img3);

        // Verify img2 was soft-deleted
        assertTrue(img2.isDeleted());
        verify(parkingSpaceImageRepository).save(img2);
    }
}
