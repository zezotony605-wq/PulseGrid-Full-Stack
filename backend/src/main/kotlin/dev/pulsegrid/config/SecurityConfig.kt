package dev.pulsegrid.config

import com.nimbusds.jose.jwk.source.ImmutableSecret
import com.nimbusds.jose.proc.SecurityContext
import org.springframework.beans.factory.annotation.Value
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.http.HttpMethod
import org.springframework.security.config.annotation.method.configuration.EnableReactiveMethodSecurity
import org.springframework.security.config.web.server.ServerHttpSecurity
import org.springframework.security.oauth2.jose.jws.MacAlgorithm
import org.springframework.security.oauth2.jwt.JwtEncoder
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder
import org.springframework.security.oauth2.jwt.NimbusReactiveJwtDecoder
import org.springframework.security.oauth2.jwt.ReactiveJwtDecoder
import org.springframework.security.web.server.SecurityWebFilterChain
import org.springframework.web.cors.CorsConfiguration
import org.springframework.web.cors.reactive.CorsConfigurationSource
import org.springframework.web.cors.reactive.UrlBasedCorsConfigurationSource
import javax.crypto.spec.SecretKeySpec

@Configuration
@EnableReactiveMethodSecurity
class SecurityConfig(
    @Value("\${pulsegrid.security.jwt-secret}") secret: String,
    @Value("\${pulsegrid.security.allowed-origins}") private val allowedOrigins: List<String>,
) {
    private val key = SecretKeySpec(secret.toByteArray(), "HmacSHA256")

    @Bean
    fun securityWebFilterChain(http: ServerHttpSecurity): SecurityWebFilterChain = http
        // Devices authenticate with a bearer token and the API is stateless, so
        // there is no cookie for a cross-site request to ride on.
        .csrf { it.disable() }
        .cors { it.configurationSource(corsConfigurationSource()) }
        .authorizeExchange {
            it.pathMatchers(
                "/api/v1/auth/**", "/v3/api-docs/**", "/swagger-ui.html", "/swagger-ui/**",
                "/actuator/health", "/actuator/prometheus", "/ws/**",
            ).permitAll()
            // Read-only aggregates for the dashboard. They carry no user
            // identifier — see TelemetrySample — so they are served unauthenticated
            // in this deployment; front them with the platform gateway's auth
            // before exposing the API publicly.
            it.pathMatchers(HttpMethod.GET, "/api/v1/telemetry/recent", "/api/v1/telemetry/stats", "/api/v1/devices/**")
                .permitAll()
            it.anyExchange().authenticated()
        }
        .oauth2ResourceServer { it.jwt {} }
        .build()

    /** Browser origins allowed to read the dashboard endpoints. */
    @Bean
    fun corsConfigurationSource(): CorsConfigurationSource {
        val configuration = CorsConfiguration().apply {
            allowedOrigins = this@SecurityConfig.allowedOrigins
            allowedMethods = listOf("GET", "POST", "OPTIONS")
            allowedHeaders = listOf("Authorization", "Content-Type", "Accept")
            maxAge = 3600
        }
        return UrlBasedCorsConfigurationSource().apply { registerCorsConfiguration("/**", configuration) }
    }

    @Bean
    fun jwtDecoder(): ReactiveJwtDecoder =
        NimbusReactiveJwtDecoder.withSecretKey(key).macAlgorithm(MacAlgorithm.HS256).build()

    @Bean
    fun jwtEncoder(): JwtEncoder = NimbusJwtEncoder(ImmutableSecret<SecurityContext>(key))
}
