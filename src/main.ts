import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { AppModule } from "./app.module";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";
import { RequestIdMiddleware } from "./common/middleware/request-id.middleware";
import { resolveCorsOrigins } from "./common/utils/cors-origins";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // We attach our own filter below; this just ensures the framework does
    // not silently swallow shutdown-time exceptions.
    abortOnError: false,
  });

  const isProduction = process.env.NODE_ENV === "production";

  // Security headers. CSP is intentionally disabled here because this is a
  // pure JSON API and clients (Flutter, Next.js admin) are served elsewhere.
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: "cross-origin" },
      hsts: isProduction
        ? { maxAge: 31536000, includeSubDomains: true, preload: true }
        : false,
    }),
  );

  // Parse cookies — required for the HttpOnly admin auth cookie path.
  app.use(cookieParser());

  // Request correlation IDs (x-request-id) used by the global exception filter
  // and any structured logger.
  app.use(new RequestIdMiddleware().use);

  app.enableCors({
    origin: resolveCorsOrigins("ALLOWED_ORIGINS"),
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Accept",
      "X-Requested-With",
      "Origin",
      "X-Request-Id",
      "X-XSRF-TOKEN",
    ],
    exposedHeaders: [
      "Content-Range",
      "X-Content-Range",
      "X-Total-Count",
      "X-Request-Id",
    ],
    preflightContinue: false,
    optionsSuccessStatus: 200,
  });

  // Enable global validation with transform to apply DTO transformations (XSS sanitization)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true, // Important: enables class-transformer decorators like @Transform
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());

  // API prefix
  app.setGlobalPrefix("api");

  // Graceful shutdown: drain in-flight requests, close DB pool, disconnect sockets.
  app.enableShutdownHooks();

  const port = process.env.PORT || 3001;
  await app.listen(port, "0.0.0.0");
  console.log(`🚀 Application is running on: http://localhost:${port}`);
  console.log(`📚 API available at: http://localhost:${port}/api`);
  if (!isProduction) {
    console.log(
      `📱 Mobile devices can connect at: http://192.168.2.1:${port}/api`,
    );
  }
  console.log(
    `🔐 CORS: ${
      process.env.ALLOWED_ORIGINS
        ? `prod allowlist (${process.env.ALLOWED_ORIGINS})`
        : isProduction
          ? "CLOSED — set ALLOWED_ORIGINS to open"
          : "dev localhost/LAN pattern"
    }`,
  );
}
bootstrap();
