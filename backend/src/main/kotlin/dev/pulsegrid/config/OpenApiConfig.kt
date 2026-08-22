package dev.pulsegrid.config

import io.swagger.v3.oas.models.Components
import io.swagger.v3.oas.models.OpenAPI
import io.swagger.v3.oas.models.info.Info
import io.swagger.v3.oas.models.security.SecurityRequirement
import io.swagger.v3.oas.models.security.SecurityScheme
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration

@Configuration
class OpenApiConfig {
    @Bean fun pulseGridOpenApi() = OpenAPI()
        .info(Info().title("PulseGrid Telemetry API").version("v1").description("Secure, asynchronous health telemetry ingestion API"))
        .addSecurityItem(SecurityRequirement().addList("bearerAuth"))
        .components(Components().addSecuritySchemes("bearerAuth", SecurityScheme().type(SecurityScheme.Type.HTTP).scheme("bearer").bearerFormat("JWT")))
}
