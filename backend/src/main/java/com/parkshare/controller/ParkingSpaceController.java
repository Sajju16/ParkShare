package com.parkshare.controller;

import com.parkshare.dto.ApiResponse;
import com.parkshare.dto.ParkingSpaceRequest;
import com.parkshare.dto.ParkingSpaceResponse;
import com.parkshare.entity.ParkingSpaceImage;
import com.parkshare.service.ImageStorageService;
import com.parkshare.service.ParkingSpaceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.concurrent.TimeUnit;

@RestController
@RequestMapping("/api/v1/parking")
@RequiredArgsConstructor
public class ParkingSpaceController {

    private final ParkingSpaceService parkingSpaceService;
    private final ImageStorageService imageStorageService;

    @PostMapping
    @PreAuthorize("hasRole('OWNER')")
    public ResponseEntity<ApiResponse<ParkingSpaceResponse>> createSpace(@Valid @RequestBody ParkingSpaceRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Parking space created", parkingSpaceService.createParkingSpace(request)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('OWNER')")
    public ResponseEntity<ApiResponse<ParkingSpaceResponse>> updateSpace(@PathVariable Long id, @Valid @RequestBody ParkingSpaceRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Parking space updated", parkingSpaceService.updateParkingSpace(id, request)));
    }

    @GetMapping("/owner")
    @PreAuthorize("hasRole('OWNER')")
    public ResponseEntity<ApiResponse<List<ParkingSpaceResponse>>> getMySpaces() {
        return ResponseEntity.ok(ApiResponse.success("Fetched spaces", parkingSpaceService.getMyParkingSpaces()));
    }

    @GetMapping("/public")
    public ResponseEntity<ApiResponse<List<ParkingSpaceResponse>>> getPublicSpaces() {
        return ResponseEntity.ok(ApiResponse.success("Fetched available spaces", parkingSpaceService.getAvailableSpaces()));
    }

    @GetMapping("/public/{id}")
    public ResponseEntity<ApiResponse<ParkingSpaceResponse>> getSpaceDetails(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("Fetched space details", parkingSpaceService.getSpaceById(id)));
    }

    @GetMapping("/public/search")
    public ResponseEntity<ApiResponse<List<ParkingSpaceResponse>>> searchSpaces(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String city,
            @RequestParam(required = false) com.parkshare.entity.VehicleType vehicleType,
            @RequestParam(required = false) Double minPrice,
            @RequestParam(required = false) Double maxPrice,
            @RequestParam(required = false) Boolean covered,
            @RequestParam(required = false, defaultValue = "ALL") String availability,
            @RequestParam(required = false) String sortBy) {
        String searchQuery = (q != null && !q.isBlank()) ? q : city;
        return ResponseEntity.ok(ApiResponse.success(
                "Searched spaces",
                parkingSpaceService.searchSpacesAdvanced(searchQuery, vehicleType, minPrice, maxPrice, covered, availability, sortBy)));
    }

    /**
     * v1.1 & v1.3 — Nearby search endpoint with multi-criteria filtering & sorting.
     */
    @GetMapping("/public/nearby")
    public ResponseEntity<ApiResponse<List<ParkingSpaceResponse>>> getNearbySpaces(
            @RequestParam double lat,
            @RequestParam double lng,
            @RequestParam(required = false, defaultValue = "5") double radius,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) com.parkshare.entity.VehicleType vehicleType,
            @RequestParam(required = false) Double minPrice,
            @RequestParam(required = false) Double maxPrice,
            @RequestParam(required = false) Boolean covered,
            @RequestParam(required = false, defaultValue = "ALL") String availability,
            @RequestParam(required = false, defaultValue = "NEAREST") String sortBy) {
        return ResponseEntity.ok(ApiResponse.success(
                "Nearby spaces fetched",
                parkingSpaceService.getNearbySpacesAdvanced(lat, lng, radius, q, vehicleType, minPrice, maxPrice, covered, availability, sortBy)));
    }

    @PostMapping("/upload-image")
    @PreAuthorize("hasRole('OWNER')")
    public ResponseEntity<ApiResponse<String>> uploadImage(@RequestParam("file") MultipartFile file) {
        try {
            String url = imageStorageService.storeImage(file);
            return ResponseEntity.ok(ApiResponse.success("Image uploaded", url));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage(), "VALIDATION_ERROR"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Failed to upload image: " + e.getMessage(), "UPLOAD_ERROR"));
        }
    }

    /**
     * Public endpoint to serve database-stored parking space photos with HTTP caching.
     */
    @GetMapping("/public/images/{id}")
    public ResponseEntity<byte[]> getImage(@PathVariable Long id) {
        ParkingSpaceImage image = imageStorageService.getImage(id).orElse(null);
        if (image == null || image.getData() == null) {
            return ResponseEntity.notFound().build();
        }

        MediaType mediaType;
        try {
            mediaType = MediaType.parseMediaType(image.getContentType());
        } catch (Exception e) {
            mediaType = MediaType.APPLICATION_OCTET_STREAM;
        }

        String filename = image.getOriginalFilename() != null ? image.getOriginalFilename() : "parking-photo.jpg";

        return ResponseEntity.ok()
                .contentType(mediaType)
                .contentLength(image.getData().length)
                .cacheControl(CacheControl.maxAge(7, TimeUnit.DAYS).cachePublic().immutable())
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + filename + "\"")
                .body(image.getData());
    }
}
