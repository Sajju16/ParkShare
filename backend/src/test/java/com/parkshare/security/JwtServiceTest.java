package com.parkshare.security;

import com.parkshare.entity.Role;
import com.parkshare.entity.User;
import io.jsonwebtoken.security.WeakKeyException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Base64;
import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class JwtServiceTest {

    private JwtService jwtService;
    private User testUser;

    // Valid 256-bit+ standard Base64 secret (48 bytes decoded = 384 bits)
    private static final String DEFAULT_BASE64_SECRET = "404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970";

    @BeforeEach
    void setUp() {
        jwtService = new JwtService();
        ReflectionTestUtils.setField(jwtService, "secretKey", DEFAULT_BASE64_SECRET);
        ReflectionTestUtils.setField(jwtService, "jwtExpiration", 86400000L); // 24h

        testUser = new User();
        testUser.setId(1L);
        testUser.setName("Test Driver");
        testUser.setEmail("driver@example.com");
        testUser.setPassword("encoded_password");
        testUser.setRole(Role.DRIVER);
    }

    @Test
    void testGenerateTokenAndValidate_WithDefaultBase64Secret() {
        String token = jwtService.generateToken(testUser);

        assertNotNull(token);
        assertFalse(token.isEmpty());
        assertEquals("driver@example.com", jwtService.extractUsername(token));
        assertTrue(jwtService.isTokenValid(token, testUser));
    }

    @Test
    void testGenerateTokenAndValidate_WithBase64UrlSecretContainingUnderscoreAndDash() {
        // Construct a 256-bit (32-byte) key containing Base64URL characters '-' and '_'
        byte[] rawBytes = new byte[32];
        for (int i = 0; i < 32; i++) {
            rawBytes[i] = (byte) (i * 7 + 13);
        }
        // Force bytes that map to '-' (62) and '_' (63) in Base64URL
        rawBytes[0] = (byte) 0xFB; // produces '_' or '-'
        rawBytes[1] = (byte) 0xEF;

        String base64UrlSecret = Base64.getUrlEncoder().withoutPadding().encodeToString(rawBytes);
        assertTrue(base64UrlSecret.contains("_") || base64UrlSecret.contains("-"),
                "Generated test secret must contain Base64URL characters");

        ReflectionTestUtils.setField(jwtService, "secretKey", base64UrlSecret);

        String token = jwtService.generateToken(testUser);
        assertNotNull(token);
        assertEquals("driver@example.com", jwtService.extractUsername(token));
        assertTrue(jwtService.isTokenValid(token, testUser));
    }

    @Test
    void testGenerateTokenWithExtraClaims() {
        Map<String, Object> claims = new HashMap<>();
        claims.put("role", "DRIVER");
        claims.put("userId", 1);

        String token = jwtService.generateToken(claims, testUser);

        assertNotNull(token);
        assertEquals("driver@example.com", jwtService.extractUsername(token));
        assertEquals("DRIVER", jwtService.extractClaim(token, c -> c.get("role", String.class)));
        assertEquals(Integer.valueOf(1), jwtService.extractClaim(token, c -> c.get("userId", Integer.class)));
    }

    @Test
    void testTokenValidation_FailsForDifferentUser() {
        String token = jwtService.generateToken(testUser);

        User anotherUser = new User();
        anotherUser.setEmail("other@example.com");

        assertFalse(jwtService.isTokenValid(token, anotherUser));
    }

    @Test
    void testTokenValidation_FailsWhenExpired() {
        // Configure negative expiration (already expired)
        ReflectionTestUtils.setField(jwtService, "jwtExpiration", -1000L);

        // Expired token parsing throws ExpiredJwtException in JJWT
        assertThrows(io.jsonwebtoken.ExpiredJwtException.class, () -> {
            String token = jwtService.generateToken(testUser);
            jwtService.isTokenValid(token, testUser);
        });
    }

    @Test
    void testMissingSecret_ThrowsIllegalStateException() {
        ReflectionTestUtils.setField(jwtService, "secretKey", null);
        assertThrows(IllegalStateException.class, () -> jwtService.generateToken(testUser));

        ReflectionTestUtils.setField(jwtService, "secretKey", "   ");
        assertThrows(IllegalStateException.class, () -> jwtService.generateToken(testUser));
    }

    @Test
    void testWeakSecret_ThrowsWeakKeyException() {
        // Less than 256 bits (16 bytes base64 = 128 bits)
        String weakSecret = Base64.getEncoder().encodeToString(new byte[16]);
        ReflectionTestUtils.setField(jwtService, "secretKey", weakSecret);

        assertThrows(WeakKeyException.class, () -> jwtService.generateToken(testUser));
    }
}
