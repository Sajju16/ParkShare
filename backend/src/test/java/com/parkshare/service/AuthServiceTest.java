package com.parkshare.service;

import com.parkshare.dto.AuthRequest;
import com.parkshare.dto.AuthResponse;
import com.parkshare.dto.RegisterRequest;
import com.parkshare.entity.Role;
import com.parkshare.entity.User;
import com.parkshare.repository.UserRepository;
import com.parkshare.security.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtService jwtService;

    @Mock
    private AuthenticationManager authenticationManager;

    @InjectMocks
    private AuthService authService;

    private User testUser;

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setId(10L);
        testUser.setName("John Driver");
        testUser.setEmail("john@example.com");
        testUser.setPassword("encoded_pwd");
        testUser.setPhone("9876543210");
        testUser.setRole(Role.DRIVER);
        testUser.setKycVerified(false);
    }

    @Test
    void testRegister_Success_GeneratesTokenAndReturnsAuthResponse() {
        RegisterRequest req = new RegisterRequest();
        req.setName("John Driver");
        req.setEmail("john@example.com");
        req.setPassword("raw_password");
        req.setPhone("9876543210");
        req.setRole(Role.DRIVER);

        when(passwordEncoder.encode("raw_password")).thenReturn("encoded_pwd");
        when(userRepository.save(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            u.setId(10L);
            return u;
        });
        when(jwtService.generateToken(any(User.class))).thenReturn("valid_jwt_token_123");

        AuthResponse resp = authService.register(req);

        assertNotNull(resp);
        assertEquals("valid_jwt_token_123", resp.getToken());
        assertEquals("john@example.com", resp.getEmail());
        assertEquals("John Driver", resp.getName());
        assertEquals(Role.DRIVER, resp.getRole());
        verify(userRepository).save(any(User.class));
        verify(jwtService).generateToken(any(User.class));
    }

    @Test
    void testRegister_WhenAdminRequested_DowngradesToDriver() {
        RegisterRequest req = new RegisterRequest();
        req.setName("Malicious Admin");
        req.setEmail("fakeadmin@example.com");
        req.setPassword("pass");
        req.setRole(Role.ADMIN);

        when(passwordEncoder.encode(any())).thenReturn("encoded_pwd");
        when(userRepository.save(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            assertEquals(Role.DRIVER, u.getRole());
            return u;
        });
        when(jwtService.generateToken(any(User.class))).thenReturn("valid_jwt_token");

        AuthResponse resp = authService.register(req);
        assertEquals(Role.DRIVER, resp.getRole());
    }

    @Test
    void testLogin_Success_AuthenticatesAndGeneratesToken() {
        AuthRequest req = new AuthRequest();
        req.setEmail("john@example.com");
        req.setPassword("secret");

        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenReturn(null);
        when(userRepository.findByEmail("john@example.com")).thenReturn(Optional.of(testUser));
        when(jwtService.generateToken(testUser)).thenReturn("login_jwt_token_456");

        AuthResponse resp = authService.login(req);

        assertNotNull(resp);
        assertEquals("login_jwt_token_456", resp.getToken());
        assertEquals("john@example.com", resp.getEmail());
        verify(authenticationManager).authenticate(any(UsernamePasswordAuthenticationToken.class));
        verify(jwtService).generateToken(testUser);
    }
}
