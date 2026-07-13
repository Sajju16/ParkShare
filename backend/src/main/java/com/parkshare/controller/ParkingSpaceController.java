package com.parkshare.controller;

import com.parkshare.dto.ApiResponse;
import com.parkshare.dto.ParkingSpaceRequest;
import com.parkshare.dto.ParkingSpaceResponse;
import com.parkshare.service.CloudinaryService;
import com.parkshare.service.ParkingSpaceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/v1/parking")
@RequiredArgsConstructor
public class ParkingSpaceController {

    private final ParkingSpaceService parkingSpaceService;
    private final CloudinaryService cloudinaryService;

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
            @RequestParam(required = false) String city,
            @RequestParam(required = false) com.parkshare.entity.VehicleType vehicleType) {
        return ResponseEntity.ok(ApiResponse.success("Searched spaces", parkingSpaceService.searchSpaces(city, vehicleType)));
    }

    @PostMapping("/upload-image")
    @PreAuthorize("hasRole('OWNER')")
    public ResponseEntity<ApiResponse<String>> uploadImage(@RequestParam("file") MultipartFile file) {
        try {
            String url = cloudinaryService.uploadImage(file);
            return ResponseEntity.ok(ApiResponse.success("Image uploaded", url));
        } catch (IOException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Failed to upload image", "UPLOAD_ERROR"));
        }
    }
}
