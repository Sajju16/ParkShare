package com.parkshare.service;

import com.parkshare.dto.ParkingSpaceRequest;
import com.parkshare.dto.ParkingSpaceResponse;
import com.parkshare.entity.*;
import com.parkshare.repository.BookingRepository;
import com.parkshare.repository.ParkingSpaceRepository;
import com.parkshare.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ParkingSpaceServiceTest {

    @Mock
    private ParkingSpaceRepository parkingSpaceRepository;

    @Mock
    private BookingRepository bookingRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private ImageStorageService imageStorageService;

    @InjectMocks
    private ParkingSpaceService parkingSpaceService;

    private User owner;
    private User unauthorizedUser;
    private ParkingSpace space;

    @BeforeEach
    void setUp() {
        lenient().when(imageStorageService.resolveFullImageUrl(any())).thenAnswer(inv -> inv.getArgument(0));

        owner = new User();
        owner.setId(10L);
        owner.setName("Owner One");
        owner.setEmail("owner1@example.com");
        owner.setRole(Role.OWNER);

        unauthorizedUser = new User();
        unauthorizedUser.setId(99L);
        unauthorizedUser.setName("Owner Two");
        unauthorizedUser.setEmail("owner2@example.com");
        unauthorizedUser.setRole(Role.OWNER);

        space = new ParkingSpace();
        space.setId(100L);
        space.setOwner(owner);
        space.setTitle("Original Title");
        space.setDescription("Original Description");
        space.setAddress("123 Original St");
        space.setCity("Bengaluru");
        space.setZipCode("560001");
        space.setLatitude(12.9716);
        space.setLongitude(77.5946);
        space.setPricePerHour(50.0);
        space.setPricePerDay(400.0);
        space.setVehicleType(VehicleType.SEDAN);
        space.setPropertyType(PropertyType.HOUSE);
        space.setCovered(true);
        space.setHasEvCharging(false);
        space.setAvailable(true);
        space.setImages(new ArrayList<>(Arrays.asList("https://example.com/img1.jpg")));
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private void mockAuthentication(String email) {
        Authentication auth = mock(Authentication.class);
        when(auth.getName()).thenReturn(email);
        SecurityContext context = mock(SecurityContext.class);
        when(context.getAuthentication()).thenReturn(auth);
        SecurityContextHolder.setContext(context);
    }

    @Test
    void testUpdateParkingSpace_WhenOwnerMatches_SuccessfullyUpdatesAllFieldsAndPhotos() {
        mockAuthentication("owner1@example.com");
        when(userRepository.findByEmail("owner1@example.com")).thenReturn(Optional.of(owner));
        when(parkingSpaceRepository.findById(100L)).thenReturn(Optional.of(space));
        when(parkingSpaceRepository.save(any(ParkingSpace.class))).thenAnswer(inv -> inv.getArgument(0));
        when(bookingRepository.findCurrentOccupancyStatus(100L)).thenReturn(Optional.empty());

        ParkingSpaceRequest req = new ParkingSpaceRequest();
        req.setTitle("Updated Title");
        req.setDescription("Updated Description");
        req.setAddress("456 Updated Ave");
        req.setCity("Bengaluru");
        req.setZipCode("560038");
        req.setLatitude(12.9750);
        req.setLongitude(77.6000);
        req.setPricePerHour(75.0);
        req.setPricePerDay(600.0);
        req.setVehicleType(VehicleType.SUV);
        req.setPropertyType(PropertyType.APARTMENT);
        req.setCovered(false);
        req.setHasEvCharging(true);
        req.setIsAvailable(false);
        req.setImages(Arrays.asList("https://example.com/img1.jpg", "https://example.com/img2.jpg"));

        ParkingSpaceResponse resp = parkingSpaceService.updateParkingSpace(100L, req);

        assertNotNull(resp);
        assertEquals("Updated Title", resp.getTitle());
        assertEquals("Updated Description", resp.getDescription());
        assertEquals("456 Updated Ave", resp.getAddress());
        assertEquals(75.0, resp.getPricePerHour());
        assertEquals(600.0, resp.getPricePerDay());
        assertEquals(VehicleType.SUV, resp.getVehicleType());
        assertEquals(PropertyType.APARTMENT, resp.getPropertyType());
        assertFalse(resp.isCovered());
        assertTrue(resp.isEvCharging());
        assertFalse(resp.isAvailable());
        assertEquals(2, resp.getImages().size());
        assertEquals("https://example.com/img2.jpg", resp.getImages().get(1));

        verify(parkingSpaceRepository).save(space);
    }

    @Test
    void testUpdateParkingSpace_WhenUnauthorizedOwner_ThrowsExceptionAndDoesNotSave() {
        mockAuthentication("owner2@example.com");
        when(userRepository.findByEmail("owner2@example.com")).thenReturn(Optional.of(unauthorizedUser));
        when(parkingSpaceRepository.findById(100L)).thenReturn(Optional.of(space));

        ParkingSpaceRequest req = new ParkingSpaceRequest();
        req.setTitle("Hacked Title");
        req.setPricePerHour(10.0);

        RuntimeException ex = assertThrows(RuntimeException.class, () ->
                parkingSpaceService.updateParkingSpace(100L, req)
        );

        assertTrue(ex.getMessage().contains("Unauthorized to edit this space"));
        verify(parkingSpaceRepository, never()).save(any());
        // Verify entity fields were not mutated
        assertEquals("Original Title", space.getTitle());
        assertEquals(50.0, space.getPricePerHour());
    }

    @Test
    void testUpdateParkingSpace_WhenSpaceNotFound_ThrowsException() {
        mockAuthentication("owner1@example.com");
        when(userRepository.findByEmail("owner1@example.com")).thenReturn(Optional.of(owner));
        when(parkingSpaceRepository.findById(999L)).thenReturn(Optional.empty());

        ParkingSpaceRequest req = new ParkingSpaceRequest();
        req.setTitle("New Title");

        RuntimeException ex = assertThrows(RuntimeException.class, () ->
                parkingSpaceService.updateParkingSpace(999L, req)
        );

        assertTrue(ex.getMessage().contains("Space not found"));
        verify(parkingSpaceRepository, never()).save(any());
    }

    @Test
    void testUpdateParkingSpace_WhenImagesNullInRequest_PreservesExistingPhotos() {
        mockAuthentication("owner1@example.com");
        when(userRepository.findByEmail("owner1@example.com")).thenReturn(Optional.of(owner));
        when(parkingSpaceRepository.findById(100L)).thenReturn(Optional.of(space));
        when(parkingSpaceRepository.save(any(ParkingSpace.class))).thenAnswer(inv -> inv.getArgument(0));
        when(bookingRepository.findCurrentOccupancyStatus(100L)).thenReturn(Optional.empty());

        ParkingSpaceRequest req = new ParkingSpaceRequest();
        req.setTitle("New Title");
        req.setAddress("Same Address");
        req.setPricePerHour(60.0);
        req.setVehicleType(VehicleType.SEDAN);
        req.setPropertyType(PropertyType.HOUSE);
        req.setImages(null); // No images supplied in request

        ParkingSpaceResponse resp = parkingSpaceService.updateParkingSpace(100L, req);

        assertNotNull(resp);
        // Existing photo is preserved
        assertNotNull(resp.getImages());
        assertEquals(1, resp.getImages().size());
        assertEquals("https://example.com/img1.jpg", resp.getImages().get(0));
    }
}
