package com.parkshare.service;

import com.parkshare.dto.ParkingSpaceRequest;
import com.parkshare.dto.ParkingSpaceResponse;
import com.parkshare.entity.ParkingSpace;
import com.parkshare.entity.User;
import com.parkshare.repository.ParkingSpaceRepository;
import com.parkshare.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ParkingSpaceService {

    private final ParkingSpaceRepository parkingSpaceRepository;
    private final UserRepository userRepository;

    private User getAuthenticatedUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email).orElseThrow(() -> new RuntimeException("User not found"));
    }

    public ParkingSpaceResponse createParkingSpace(ParkingSpaceRequest request) {
        User user = getAuthenticatedUser();
        
        ParkingSpace space = new ParkingSpace();
        space.setOwner(user);
        mapRequestToEntity(request, space);
        
        ParkingSpace saved = parkingSpaceRepository.save(space);
        return mapToResponse(saved);
    }

    public ParkingSpaceResponse updateParkingSpace(Long id, ParkingSpaceRequest request) {
        User user = getAuthenticatedUser();
        ParkingSpace space = parkingSpaceRepository.findById(id).orElseThrow(() -> new RuntimeException("Space not found"));
        
        if (!space.getOwner().getId().equals(user.getId())) {
            throw new RuntimeException("Unauthorized to edit this space");
        }
        
        mapRequestToEntity(request, space);
        return mapToResponse(parkingSpaceRepository.save(space));
    }

    public List<ParkingSpaceResponse> getMyParkingSpaces() {
        User user = getAuthenticatedUser();
        return parkingSpaceRepository.findByOwnerIdAndDeletedFalse(user.getId())
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public List<ParkingSpaceResponse> getAvailableSpaces() {
        return parkingSpaceRepository.findByDeletedFalseAndIsAvailableTrue()
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public List<ParkingSpaceResponse> searchSpaces(String city, com.parkshare.entity.VehicleType vehicleType) {
        return parkingSpaceRepository.searchAvailableSpaces(city, vehicleType)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }
    
    public ParkingSpaceResponse getSpaceById(Long id) {
        ParkingSpace space = parkingSpaceRepository.findById(id).orElseThrow(() -> new RuntimeException("Space not found"));
        if(space.isDeleted()) throw new RuntimeException("Space not found");
        return mapToResponse(space);
    }

    private void mapRequestToEntity(ParkingSpaceRequest request, ParkingSpace space) {
        space.setTitle(request.getTitle());
        space.setDescription(request.getDescription());
        space.setAddress(request.getAddress());
        space.setCity(request.getCity());
        space.setZipCode(request.getZipCode());
        space.setPricePerHour(request.getPricePerHour());
        space.setPricePerDay(request.getPricePerDay());
        space.setVehicleType(request.getVehicleType());
        space.setCovered(request.isCovered());
        space.setHasEvCharging(request.isHasEvCharging());
        if (request.getImages() != null) {
            space.setImages(request.getImages());
        }
    }

    private ParkingSpaceResponse mapToResponse(ParkingSpace space) {
        return ParkingSpaceResponse.builder()
                .id(space.getId())
                .ownerId(space.getOwner().getId())
                .ownerName(space.getOwner().getName())
                .title(space.getTitle())
                .description(space.getDescription())
                .address(space.getAddress())
                .city(space.getCity())
                .zipCode(space.getZipCode())
                .pricePerHour(space.getPricePerHour())
                .pricePerDay(space.getPricePerDay())
                .vehicleType(space.getVehicleType())
                .isCovered(space.isCovered())
                .hasEvCharging(space.isHasEvCharging())
                .isAvailable(space.isAvailable())
                .images(space.getImages())
                .build();
    }
}
