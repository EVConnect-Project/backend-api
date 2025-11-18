# Cloudinary Integration for Marketplace Images

## Overview
CloudinaryService provides image upload functionality for marketplace listings with automatic optimization and CDN delivery.

## Features
- ✅ Single and multiple image uploads
- ✅ Automatic image optimization (quality, format, size)
- ✅ Max dimensions: 1200x1200px
- ✅ File type validation (JPEG, PNG, WebP)
- ✅ File size limit: 5MB per image
- ✅ Secure HTTPS URLs
- ✅ Image deletion support

## Environment Variables
Add these to your `.env` file:

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

## API Endpoints

### Upload Single Image
**POST** `/cloudinary/upload`
- **Auth**: Required (JWT)
- **Content-Type**: `multipart/form-data`
- **Body**: 
  - `file`: Image file (JPEG, PNG, WebP)

**Response**:
```json
{
  "success": true,
  "url": "https://res.cloudinary.com/.../marketplace/abc123.jpg",
  "message": "Image uploaded successfully"
}
```

### Upload Multiple Images
**POST** `/cloudinary/upload-multiple`
- **Auth**: Required (JWT)
- **Content-Type**: `multipart/form-data`
- **Body**: 
  - `files`: Array of image files (max 5)

**Response**:
```json
{
  "success": true,
  "urls": [
    "https://res.cloudinary.com/.../marketplace/abc123.jpg",
    "https://res.cloudinary.com/.../marketplace/def456.jpg"
  ],
  "count": 2,
  "message": "Images uploaded successfully"
}
```

## Usage in Code

### Inject CloudinaryService
```typescript
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Injectable()
export class MyService {
  constructor(private cloudinaryService: CloudinaryService) {}

  async uploadImage(file: Express.Multer.File) {
    const url = await this.cloudinaryService.uploadImage(file, 'marketplace');
    return url;
  }
}
```

### Service Methods

#### Upload Single Image
```typescript
const url = await cloudinaryService.uploadImage(file, 'marketplace');
// Returns: "https://res.cloudinary.com/.../image.jpg"
```

#### Upload Base64 Image
```typescript
const url = await cloudinaryService.uploadBase64Image(base64String, 'marketplace');
```

#### Upload Multiple Images
```typescript
const urls = await cloudinaryService.uploadMultipleImages(files, 'marketplace');
// Returns: ["url1.jpg", "url2.jpg", ...]
```

#### Delete Image
```typescript
const publicId = cloudinaryService.extractPublicId(url);
await cloudinaryService.deleteImage(publicId);
```

## Image Transformations
All uploaded images are automatically optimized:
- **Max dimensions**: 1200x1200px (maintains aspect ratio)
- **Quality**: Auto-optimized for best balance
- **Format**: Auto-converted to WebP where supported
- **Delivery**: Via Cloudinary CDN for fast loading

## Validation
- **Allowed formats**: JPEG, PNG, WebP
- **Max file size**: 5MB per image
- **Max files per request**: 5 images

## Folder Structure
Images are organized in Cloudinary:
```
marketplace/
  ├── abc123.jpg
  ├── def456.png
  └── ...
```

## Error Handling
The service throws `BadRequestException` for:
- Invalid file types
- Files exceeding size limit
- Upload failures
- Invalid Cloudinary credentials
