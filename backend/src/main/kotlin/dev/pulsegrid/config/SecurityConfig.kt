package dev.pulsegrid.config

import com.nimbusds.jose.jwk.source.ImmutableSecret
import com.nimbusds.jose.proc.SecurityContext
import org.springframework.beans.factory.annotation.Value
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.security.config.annotation.method.configuration.EnableReactiveMethodSecurity
import org.springframework.security.config.web.server.ServerHttpSecurity
import org.springframework.security.oauth2.jose.jws.MacAlgorithm
import org.springframework.security.oauth2.jwt.JwtEncoder
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder
import org.springframework.security.oauth2.jwt.NimbusReactiveJwtDecoder
import org.springframework.security.oauth2.jwt.ReactiveJwtDecoder
import org.springframework.security.web.server.SecurityWebFilterChain
import javax.crypto.spec.SecretKeySpec

@Configuration
@EnableReactiveMethodSecurity
class SecurityConfig(@Value("\${pulsegrid.security.jwt-secret}") secret: String) {
    private val key = SecretKeySpec(secret.toByteArray(), "HmacSHA256")

    @Bean
    fun securityWebFilterChain(http: ServerHttpSecurity): SecurityWebFilterChain = http
        .csrf { it.disable() }
        .authorizeExchange {
            it.pathMatchers(
                "/api/v1/auth/**", "/v3/api-docs/**", "/swagger-ui.html", "/swagger-ui/**",
                "/actuator/health", "/actuator/prometheus", "/ws/**",
            ).permitAll()
            it.anyExchange().authenticated()
        }
        .oauth2ResourceServer { it.jwt {} }
        .build()

    @Bean fun jwtDecoder(): ReactiveJwtDecoder = NimbusReactiveJwtDecoder.withSecretKey(key).macAlgorithm(MacAlgorithm.HS256).build()
    @Bean fun jwtEncoder(): JwtEncoder = NimbusJwtEncoder(ImmutableSecret<SecurityContext>(key))
}
