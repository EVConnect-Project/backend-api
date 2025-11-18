# Marketplace Feature - Critical Issues & Fixes

**Analysis Date:** $(date)  
**Analyzed Files:** 6 TypeScript files in `evconnect_backend/src/marketplace/`

---

## 🔴 CRITICAL ISSUES (Must Fix Before Production)

### 1. Authorization Bypass on Listing Details ⚠️ **SECURITY VULNERABILITY**
**File:** `marketplace.controller.ts` line 33  
**Severity:** CRITICAL

**Issue:**
```typescript
@Get('listings/:id')
getListingById(@Param('id') id: string) {
  return this.marketplaceService.getListingById(id);
}
```
- No authentication guard
- Returns listings of ANY status (pending, rejected, approved, sold)
- **Anyone can view pending/rejected listings that should be private**

**Impact:**
- Privacy breach: Competitors/malicious actors can see unapproved listings
- Business logic broken: Listings awaiting admin review are publicly accessible

**Fix:**
```typescript
@Get('listings/:id')
@UseGuards(JwtAuthGuard)
getListingById(@Param('id') id: string, @Request() req) {
  return this.marketplaceService.getListingById(id, req.user?.userId);
}
```

**Service layer fix:**
```typescript
async getListingById(id: string, requestingUserId?: string): Promise<MarketplaceListing> {
  const listing = await this.listingRepository.findOne({
    where: { id },
    relations: ['seller', 'images'],
  });

  if (!listing) {
    throw new NotFoundException(`Listing with ID ${id} not found`);
  }

  // If listing is not approved, only seller or admin can view
  if (listing.status !== 'approved') {
    if (!requestingUserId || (listing.seller.id !== requestingUserId)) {
      throw new NotFoundException(`Listing with ID ${id} not found`);
    }
  }

  return listing;
}
```

---

### 2. Missing Update/Edit Functionality
**File:** `marketplace.controller.ts`  
**Severity:** HIGH

**Issue:**
- No endpoint to edit listings
- `updateListingStatus()` exists in service but not exposed to users
- Users cannot fix rejected listings

**Impact:**
- Users must create new listing if rejected (bad UX)
- No way to update price, description, or correct errors

**Fix - Add to MarketplaceController:**
```typescript
@Patch('listings/:id')
@UseGuards(JwtAuthGuard)
async updateListing(
  @Param('id') id: string,
  @Body(ValidationPipe) updateDto: UpdateListingDto,
  @Request() req,
) {
  return this.marketplaceService.updateListing(id, updateDto, req.user.userId);
}
```

**Service method:**
```typescript
async updateListing(
  id: string, 
  dto: UpdateListingDto, 
  userId: string
): Promise<MarketplaceListing> {
  const listing = await this.getListingById(id);

  // Only seller can update their own listing
  if (listing.seller.id !== userId) {
    throw new ForbiddenException('You can only update your own listings');
  }

  // Cannot update approved/sold listings
  if (['approved', 'sold'].includes(listing.status)) {
    throw new BadRequestException('Cannot update approved or sold listings');
  }

  // Update fields
  Object.assign(listing, {
    title: dto.title ?? listing.title,
    description: dto.description ?? listing.description,
    price: dto.price ?? listing.price,
    condition: dto.condition ?? listing.condition,
    city: dto.city ?? listing.city,
    lat: dto.lat ?? listing.lat,
    long: dto.long ?? listing.long,
  });

  // Reset to pending if was rejected
  if (listing.status === 'rejected') {
    listing.status = 'pending';
    listing.adminNotes = null;
  }

  return this.listingRepository.save(listing);
}
```

**Create DTO:** `dto/update-listing.dto.ts`
```typescript
import { IsString, IsNumber, IsEnum, IsOptional, Min } from 'class-validator';

export class UpdateListingDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsEnum(['new', 'used'])
  condition?: 'new' | 'used';

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsNumber()
  lat?: number;

  @IsOptional()
  @IsNumber()
  long?: number;
}
```

---

### 3. Missing Delete Functionality
**File:** `marketplace.controller.ts` + `marketplace.service.ts`  
**Severity:** HIGH

**Issue:**
- No way to delete listings (for users or admins)
- Spam/inappropriate content persists
- Users can't remove sold items from their profile

**Fix - Controller:**
```typescript
@Delete('listings/:id')
@UseGuards(JwtAuthGuard)
async deleteListing(@Param('id') id: string, @Request() req) {
  return this.marketplaceService.deleteListing(id, req.user.userId);
}
```

**Service method:**
```typescript
async deleteListing(id: string, userId: string): Promise<{ message: string }> {
  const listing = await this.getListingById(id);

  // Only seller can delete their own listing
  if (listing.seller.id !== userId) {
    throw new ForbiddenException('You can only delete your own listings');
  }

  await this.listingRepository.remove(listing);
  // Images will be cascade deleted due to onDelete: 'CASCADE'

  return { message: 'Listing deleted successfully' };
}
```

**Admin delete (in AdminMarketplaceController):**
```typescript
@Delete('listings/:id')
adminDeleteListing(@Param('id') id: string) {
  return this.marketplaceService.adminDeleteListing(id);
}
```

**Admin service method:**
```typescript
async adminDeleteListing(id: string): Promise<{ message: string }> {
  const listing = await this.getListingById(id);
  await this.listingRepository.remove(listing);
  return { message: 'Listing deleted by admin' };
}
```

---

### 4. Race Condition in Approval/Rejection Flow
**File:** `marketplace.service.ts` lines 75-91, 93-108  
**Severity:** MEDIUM

**Issue:**
```typescript
async adminApproveListing(id: string): Promise<MarketplaceListing> {
  const listing = await this.getListingById(id);  // Query 1
  
  listing.status = 'approved';
  await this.listingRepository.save(listing);

  const updatedListing = await this.getListingById(id);  // Query 2 (unnecessary)
  
  await this.notificationService.notifyListingApproved(updatedListing);
  return updatedListing;
}
```

**Problems:**
- Inefficient: 2 DB queries when 1 is enough
- Race condition: Between save and second query, data could change
- Notification uses potentially stale data

**Fix:**
```typescript
async adminApproveListing(id: string): Promise<MarketplaceListing> {
  const listing = await this.listingRepository.findOne({
    where: { id },
    relations: ['seller', 'images'],  // Ensure seller loaded for notification
  });

  if (!listing) {
    throw new NotFoundException(`Listing with ID ${id} not found`);
  }
  
  listing.status = 'approved';
  const savedListing = await this.listingRepository.save(listing);
  
  // Use the saved listing (has fresh data + loaded relations)
  await this.notificationService.notifyListingApproved(savedListing);

  return savedListing;
}
```

**Same fix for `adminRejectListing()`**

---

### 5. Seller Relation Not Guaranteed in Notifications
**File:** `notification.service.ts` lines 17-18, 44-45  
**Severity:** MEDIUM

**Issue:**
```typescript
console.log(`Seller: ${listing.seller?.name || listing.seller?.email || 'Unknown'}`);
console.log(`Seller Email: ${listing.seller?.email || 'N/A'}`);

// Later:
// await this.emailService.send({
//   to: listing.seller.email,  // ❌ Could be undefined!
```

**Problem:**
- `listing.seller` may be `undefined` if relation not loaded
- Crashes when trying to send email to undefined address

**Fix:**
Add validation in service methods before calling notifications:
```typescript
async adminApproveListing(id: string): Promise<MarketplaceListing> {
  const listing = await this.listingRepository.findOne({
    where: { id },
    relations: ['seller', 'images'],  // ✅ Explicitly load seller
  });

  if (!listing) {
    throw new NotFoundException(`Listing with ID ${id} not found`);
  }

  if (!listing.seller) {
    throw new InternalServerErrorException('Seller relation missing');
  }
  
  listing.status = 'approved';
  const savedListing = await this.listingRepository.save(listing);
  
  await this.notificationService.notifyListingApproved(savedListing);
  return savedListing;
}
```

---

### 6. Missing "Mark as Sold" Functionality
**File:** `marketplace-listing.entity.ts` line 42  
**Severity:** MEDIUM

**Issue:**
- Entity defines `'sold'` status in enum
- No endpoint to transition listing to sold state

**Impact:**
- Users can't indicate items are no longer available
- Sold items remain in "approved" feed

**Fix - Controller:**
```typescript
@Patch('listings/:id/mark-sold')
@UseGuards(JwtAuthGuard)
markAsSold(@Param('id') id: string, @Request() req) {
  return this.marketplaceService.markListingAsSold(id, req.user.userId);
}
```

**Service:**
```typescript
async markListingAsSold(id: string, userId: string): Promise<MarketplaceListing> {
  const listing = await this.getListingById(id, userId);

  if (listing.seller.id !== userId) {
    throw new ForbiddenException('Only the seller can mark their listing as sold');
  }

  if (listing.status !== 'approved') {
    throw new BadRequestException('Only approved listings can be marked as sold');
  }

  listing.status = 'sold';
  return this.listingRepository.save(listing);
}
```

---

### 7. Images Field Incorrectly Required
**File:** `dto/create-listing.dto.ts` line 29  
**Severity:** LOW

**Issue:**
```typescript
@IsArray()
@IsString({ each: true })
images: string[];  // ❌ Required, but should be optional
```

**Impact:**
- Users forced to provide images even for text-only listings
- May not have images initially

**Fix:**
```typescript
@IsOptional()
@IsArray()
@IsString({ each: true })
images?: string[];
```

**Update service to handle empty array:**
```typescript
if (dto.images && dto.images.length > 0) {
  // ... create images
}
```

---

### 8. Broken TypeORM Relation Definition
**File:** `marketplace-image.entity.ts` line 9  
**Severity:** MEDIUM

**Issue:**
```typescript
@ManyToOne('MarketplaceListing', 'images', { onDelete: 'CASCADE' })
@JoinColumn({ name: 'listingId' })
listing: any;  // ❌ Type safety lost, relation may not resolve
```

**Problem:**
- String-based relation instead of proper import
- Type is `any` (no type safety)

**Fix:**
```typescript
import { MarketplaceListing } from './marketplace-listing.entity';

@ManyToOne(() => MarketplaceListing, listing => listing.images, { onDelete: 'CASCADE' })
@JoinColumn({ name: 'listingId' })
listing: MarketplaceListing;
```

**Also fix in marketplace-listing.entity.ts:**
```typescript
import { MarketplaceImage } from './marketplace-image.entity';

@OneToMany(() => MarketplaceImage, image => image.listing)
images: MarketplaceImage[];
```

---

## 🟡 SECURITY RECOMMENDATIONS

### 9. Add Input Sanitization
**Files:** `create-listing.dto.ts`, `update-listing.dto.ts`  
**Risk:** XSS attacks via malicious HTML/scripts in title/description

**Fix:**
```typescript
import { Transform } from 'class-transformer';

export class CreateListingDto {
  @IsString()
  @Transform(({ value }) => value.trim().replace(/<[^>]*>/g, ''))  // Strip HTML
  title: string;

  @IsString()
  @Transform(({ value }) => value.trim().replace(/<script[^>]*>.*?<\/script>/gi, ''))
  description: string;
}
```

### 10. Add Rate Limiting
**File:** `marketplace.controller.ts`  
**Risk:** Spam/abuse via unlimited listing creation

**Fix:**
```typescript
import { Throttle } from '@nestjs/throttler';

@Post('listings')
@UseGuards(JwtAuthGuard)
@Throttle({ default: { limit: 10, ttl: 60000 } })  // 10 listings per minute
createListing(...) { }
```

---

## 🟢 ADDITIONAL IMPROVEMENTS

### 11. Add Listing View Counter
Track listing popularity for ranking/recommendations

### 12. Add Listing Report System
Allow users to flag inappropriate content

### 13. Add Image Upload Validation
Current implementation accepts any URL string - should validate format, size, etc.

### 14. Add Search Indexing
Current ILIKE search is slow - consider full-text search or ElasticSearch

---

## PRIORITY FIX ORDER

1. **Fix authorization bypass** (Issue #1) - SECURITY CRITICAL
2. **Fix seller relation loading** (Issue #5) - Prevents crashes
3. **Add update functionality** (Issue #2) - Core feature missing
4. **Add delete functionality** (Issue #3) - Core feature missing
5. **Fix race condition** (Issue #4) - Data integrity
6. **Fix TypeORM relations** (Issue #8) - Code quality
7. **Make images optional** (Issue #7) - UX improvement
8. **Add mark-as-sold** (Issue #6) - Workflow completion
9. **Add input sanitization** (Issue #9) - Security hardening
10. **Add rate limiting** (Issue #10) - Abuse prevention

---

## TESTING CHECKLIST

After fixes:
- [ ] Test unauthenticated access to pending listing (should fail)
- [ ] Test seller viewing their own pending listing (should work)
- [ ] Test admin viewing any listing (should work)
- [ ] Test updating rejected listing → status resets to pending
- [ ] Test deleting listing with images → images cascade deleted
- [ ] Test approval notification with missing seller relation
- [ ] Test creating listing without images
- [ ] Test XSS injection in title/description
- [ ] Test rate limiting on listing creation
- [ ] Test marking approved listing as sold
