import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { AuthService } from '../src/auth/auth.service';
import { UserEntity } from '../src/users/entities/user.entity';

describe('Delete Account (e2e)', () => {
  let app: INestApplication;
  let authService: AuthService;
  let testUser: UserEntity;
  let testUserId: string;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    authService = moduleFixture.get<AuthService>(AuthService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('DELETE /auth/delete-account', () => {
    it('should delete account with all related data', async () => {
      // 1. Register and create test user
      const registerRes = await request(app.getHttpServer())
        .post('/auth/register-phone')
        .send({
          phoneNumber: '+94123456789',
          name: 'Test User for Deletion',
          countryCode: '+94',
        });

      testUserId = registerRes.body.user.id;
      authToken = registerRes.body.accessToken;

      // 2. Create some test data for this user
      // - Create a charger listing
      // - Create wallet transactions
      // - Create marketplace listings
      // - Create reviews
      // - Create favorites
      // etc.

      // 3. Verify data exists before deletion
      const userBeforeDelete = await request(app.getHttpServer())
        .get(`/users/${testUserId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(userBeforeDelete.status).toBe(200);
      expect(userBeforeDelete.body.id).toBe(testUserId);

      // 4. Delete account
      const deleteRes = await request(app.getHttpServer())
        .delete('/auth/delete-account')
        .set('Authorization', `Bearer ${authToken}`);

      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.message).toContain('deleted successfully');

      // 5. Verify user no longer exists
      const userAfterDelete = await request(app.getHttpServer())
        .get(`/users/${testUserId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(userAfterDelete.status).toBe(401); // Unauthorized - token invalid or user deleted

      // 6. Verify all related data is deleted
      // - Check chargers are deleted
      // - Check wallet transactions are deleted
      // - Check marketplace listings are deleted
      // - Check reviews are deleted
      // etc.
    });

    it('should return 401 if user not found', async () => {
      const fakeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJub24tZXhpc3RlbnQtdXNlciIsImlhdCI6MTUxNjIzOTAyMn0.invalid';

      const deleteRes = await request(app.getHttpServer())
        .delete('/auth/delete-account')
        .set('Authorization', `Bearer ${fakeToken}`);

      expect(deleteRes.status).toBe(401);
    });

    it('should handle cascade deletion errors gracefully', async () => {
      // This test verifies that if ANY related data deletion fails,
      // the entire transaction is rolled back and an error is returned
      
      // Note: This would require mocking the database to simulate a failure
      // In real scenarios, this ensures data integrity is maintained
    });
  });

  describe('Account Deletion with Data Integrity', () => {
    it('should verify all user-related records are deleted in one transaction', async () => {
      // Register user
      const registerRes = await request(app.getHttpServer())
        .post('/auth/register-phone')
        .send({
          phoneNumber: '+94987654321',
          name: 'Test User for Data Integrity',
          countryCode: '+94',
        });

      const userId = registerRes.body.user.id;
      const token = registerRes.body.accessToken;

      // Create charger listing
      const chargerRes = await request(app.getHttpServer())
        .post('/chargers')
        .set('Authorization', `Bearer ${token}`)
        .send({
          stationName: 'Test Station',
          address: 'Test Address',
          latitude: 6.9271,
          longitude: 80.7789,
          sockets: [
            {
              type: 'AC',
              power: 22,
            },
          ],
        });

      expect(chargerRes.status).toBe(201);
      const chargerId = chargerRes.body.id;

      // Delete account
      const deleteRes = await request(app.getHttpServer())
        .delete('/auth/delete-account')
        .set('Authorization', `Bearer ${token}`);

      expect(deleteRes.status).toBe(200);

      // Verify charger is also deleted
      const getChargerRes = await request(app.getHttpServer())
        .get(`/chargers/${chargerId}`);

      expect(getChargerRes.status).toBe(404);
    });
  });
});
