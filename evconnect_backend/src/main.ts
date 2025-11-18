import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS for admin dashboard and mobile app (Flutter Web uses random ports)
  app.enableCors({
    origin: [
      'http://localhost:3000',        // Admin dashboard
      /^http:\/\/localhost:\d+$/,     // Flutter Web (any port)
      'http://10.0.2.2:4000',         // Android emulator
      /^http:\/\/192\.168\.\d+\.\d+:\d+$/, // Local network devices
    ],
    credentials: true,
  });

  // Enable global validation with transform to apply DTO transformations (XSS sanitization)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,  // Important: enables class-transformer decorators like @Transform
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // API prefix
  app.setGlobalPrefix('api');

  const port = process.env.PORT || 4000;
  // Listen on all network interfaces to allow mobile devices to connect
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 Application is running on: http://localhost:${port}`);
  console.log(`📚 API available at: http://localhost:${port}/api`);
  console.log(`📱 Mobile devices can connect at: http://192.168.2.1:${port}/api`);
}
bootstrap();

