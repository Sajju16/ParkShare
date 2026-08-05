package com.parkshare.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * PRD v1.0 Slice 2: Request body sent by the Owner when verifying the driver's OTP.
 */
@Data
public class OtpVerificationRequest {

    @NotBlank(message = "OTP is required")
    @Size(min = 4, max = 4, message = "OTP must be exactly 4 digits")
    @Pattern(regexp = "\\d{4}", message = "OTP must contain only digits")
    private String otpCode;
}
