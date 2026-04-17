import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configure CORS based on environment
  const isDevelopment = process.env.NODE_ENV !== "production";
  const allowedOrigins = isDevelopment
    ? /^http:\/\/(localhost|127\.0\.0\.1|192\.168\..*):/ // Match any localhost or 192.168.x.x port
    : process.env.ALLOWED_ORIGINS?.split(",") || [
        "https://your-frontend-url.com",
      ];

  app.enableCors({
    origin: isDevelopment ? true : allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Accept",
      "X-Requested-With",
      "Origin",
    ],
    exposedHeaders: ["Content-Range", "X-Content-Range", "X-Total-Count"],
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

  // API prefix
  app.setGlobalPrefix("api");

  const port = process.env.PORT || 3001;
  // Listen on all network interfaces to allow mobile devices to connect
  await app.listen(port, "0.0.0.0");
  console.log(`🚀 Application is running on: http://localhost:${port}`);
  console.log(`📚 API available at: http://localhost:${port}/api`);
  console.log(
    `📱 Mobile devices can connect at: http://192.168.2.1:${port}/api`,
  );
  console.log(
    `🔐 CORS enabled for: ${isDevelopment ? "all localhost origins (dev mode)" : process.env.ALLOWED_ORIGINS || "https://your-frontend-url.com"}`,
  );
}
bootstrap();
