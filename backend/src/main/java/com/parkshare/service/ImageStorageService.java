package com.parkshare.service;

import com.parkshare.entity.ParkingSpace;
import com.parkshare.entity.ParkingSpaceImage;
import com.parkshare.repository.ParkingSpaceImageRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.io.IOException;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class ImageStorageService {

    private static final Logger log = LoggerFactory.getLogger(ImageStorageService.class);
    private static final long MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            "image/jpeg",
            "image/jpg",
            "image/png",
            "image/webp"
    );
    private static final Pattern IMAGE_URL_PATTERN = Pattern.compile(".*/api/v1/parking/public/images/(\\d+)");

    private final ParkingSpaceImageRepository parkingSpaceImageRepository;

    /**
     * Validates image metadata, file size, MIME type, and magic bytes.
     */
    public void validateImage(MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Image file cannot be empty");
        }

        if (file.getSize() > MAX_FILE_SIZE) {
            throw new IllegalArgumentException("Image size exceeds the 5 MB limit (file size: " + file.getSize() + " bytes)");
        }

        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType.toLowerCase().trim())) {
            throw new IllegalArgumentException("Invalid image type: " + contentType + ". Only JPEG, PNG, and WebP are supported.");
        }

        byte[] bytes = file.getBytes();
        if (bytes.length < 12) {
            throw new IllegalArgumentException("Corrupted or invalid image file (too small)");
        }

        if (!isValidImageHeader(bytes, contentType.toLowerCase().trim())) {
            throw new IllegalArgumentException("File content does not match allowed image formats (JPEG, PNG, WebP)");
        }
    }

    /**
     * Inspects magic bytes to prevent spoofed file extensions.
     */
    private boolean isValidImageHeader(byte[] data, String contentType) {
        // JPEG magic bytes: FF D8 FF
        boolean isJpeg = (data[0] & 0xFF) == 0xFF && (data[1] & 0xFF) == 0xD8 && (data[2] & 0xFF) == 0xFF;
        if (isJpeg) return true;

        // PNG magic bytes: 89 50 4E 47 0D 0A 1A 0A
        boolean isPng = (data[0] & 0xFF) == 0x89 && (data[1] & 0xFF) == 0x50 &&
                (data[2] & 0xFF) == 0x4E && (data[3] & 0xFF) == 0x47;
        if (isPng) return true;

        // WebP magic bytes: "RIFF" at 0..3 and "WEBP" at 8..11
        boolean isWebP = data[0] == 'R' && data[1] == 'I' && data[2] == 'F' && data[3] == 'F' &&
                data[8] == 'W' && data[9] == 'E' && data[10] == 'B' && data[11] == 'P';
        if (isWebP) return true;

        return false;
    }

    /**
     * Stores image bytes into the database and returns the fully qualified public image URL.
     */
    @Transactional
    public String storeImage(MultipartFile file) throws IOException {
        validateImage(file);

        ParkingSpaceImage image = new ParkingSpaceImage();
        image.setContentType(file.getContentType().toLowerCase().trim());
        image.setOriginalFilename(file.getOriginalFilename());
        image.setFileSize(file.getSize());
        image.setData(file.getBytes());

        ParkingSpaceImage saved = parkingSpaceImageRepository.save(image);
        return buildImageUrl(saved.getId());
    }

    /**
     * Constructs the full image URL dynamically resolved from the current request.
     */
    public String buildImageUrl(Long imageId) {
        try {
            return ServletUriComponentsBuilder.fromCurrentContextPath()
                    .path("/api/v1/parking/public/images/")
                    .path(String.valueOf(imageId))
                    .toUriString();
        } catch (Exception e) {
            // Fallback for tests or asynchronous execution where RequestContextHolder is absent
            return "http://localhost:8080/api/v1/parking/public/images/" + imageId;
        }
    }

    /**
     * Normalizes an image URL (relative to full) if needed.
     */
    public String resolveFullImageUrl(String url) {
        if (url == null || url.isBlank()) return url;
        if (url.startsWith("/")) {
            try {
                return ServletUriComponentsBuilder.fromCurrentContextPath()
                        .path(url)
                        .toUriString();
            } catch (Exception e) {
                return "http://localhost:8080" + url;
            }
        }
        return url;
    }

    /**
     * Retrieves the image entity with binary data by ID.
     */
    @Transactional(readOnly = true)
    public Optional<ParkingSpaceImage> getImage(Long id) {
        return parkingSpaceImageRepository.findActiveById(id);
    }

    /**
     * Synchronizes a parking space's associated database images when the space is saved or updated.
     * Links newly uploaded images to the space and soft-deletes images that were removed by the owner.
     */
    @Transactional
    public void syncSpaceImages(ParkingSpace space, List<String> currentImageUrls) {
        if (space == null || space.getId() == null) return;

        Set<Long> retainedImageIds = new HashSet<>();
        if (currentImageUrls != null) {
            for (String url : currentImageUrls) {
                if (url != null) {
                    Matcher matcher = IMAGE_URL_PATTERN.matcher(url.trim());
                    if (matcher.matches()) {
                        try {
                            retainedImageIds.add(Long.parseLong(matcher.group(1)));
                        } catch (NumberFormatException ignored) {}
                    }
                }
            }
        }

        // Link active images to this parking space
        for (Long imageId : retainedImageIds) {
            parkingSpaceImageRepository.findActiveById(imageId).ifPresent(img -> {
                if (img.getParkingSpace() == null || !space.getId().equals(img.getParkingSpace().getId())) {
                    img.setParkingSpace(space);
                    parkingSpaceImageRepository.save(img);
                }
            });
        }

        // Soft-delete images previously linked to this space that are no longer referenced
        List<ParkingSpaceImage> existingImages = parkingSpaceImageRepository.findByParkingSpaceIdAndDeletedFalse(space.getId());
        for (ParkingSpaceImage existing : existingImages) {
            if (!retainedImageIds.contains(existing.getId())) {
                existing.setDeleted(true);
                parkingSpaceImageRepository.save(existing);
                log.debug("Soft-deleted unlinked image ID {} for space ID {}", existing.getId(), space.getId());
            }
        }
    }
}
