package dev.pulsegrid.security

import org.springframework.beans.factory.annotation.Value
import org.springframework.http.HttpStatus
import org.springframework.security.oauth2.jose.jws.MacAlgorithm
import org.springframework.security.oauth2.jwt.JwtClaimsSet
import org.springframework.security.oauth2.jwt.JwtEncoder
import org.springframework.security.oauth2.jwt.JwtEncoderParameters
import org.springframework.security.oauth2.jwt.JwsHeader
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.server.ResponseStatusException
import java.time.Instant

data class DeviceCredentials(val deviceId: String, val deviceSecret: String)
data class TokenResponse(val accessToken: String, val tokenType: String = "Bearer", val expiresIn: Long = 3600)

@RestController
@RequestMapping("/api/v1/auth")
class DeviceAuthController(
    private val encoder: JwtEncoder,
    @Value("\${pulsegrid.security.device-secret}") private val expectedSecret: String,
    @Value("\${pulsegrid.security.issuer}") private val issuer: String,
) {
    @PostMapping("/device-token")
    fun token(@RequestBody credentials: DeviceCredentials): TokenResponse {
        if (!credentials.deviceId.matches(Regex("PG-[A-Z0-9]{4,12}")) || credentials.deviceSecret != expectedSecret) {
            throw ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid device credentials")
        }
        val now = Instant.now()
        val claims = JwtClaimsSet.builder().issuer(issuer).issuedAt(now).expiresAt(now.plusSeconds(3600))
            .subject(credentials.deviceId).claim("scope", "telemetry:write").build()
        val header = JwsHeader.with(MacAlgorithm.HS256).build()
        return TokenResponse(encoder.encode(JwtEncoderParameters.from(header, claims)).tokenValue)
    }
}
