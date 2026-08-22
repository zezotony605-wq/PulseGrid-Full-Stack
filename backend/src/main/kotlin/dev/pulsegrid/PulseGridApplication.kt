package dev.pulsegrid

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication

@SpringBootApplication
class PulseGridApplication

/**
 * The body has to be a block, not an `= runApplication(...)` expression.
 * The expression form returns ConfigurableApplicationContext, so Kotlin emits
 * a method with that return type rather than `void main(String[])`, and the
 * Spring Boot plugin then cannot resolve a main class for `bootJar`.
 */
fun main(args: Array<String>) {
    runApplication<PulseGridApplication>(*args)
}
