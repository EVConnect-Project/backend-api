import { 
  Controller, 
  Post, 
  Query,
  UseGuards, 
  UseInterceptors, 
  UploadedFile, 
  UploadedFiles,
  BadRequestException 
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { CloudinaryService } from './cloudinary.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Multer } from 'multer';

// Allowed Cloudinary folder names (prevents arbitrary path injection)
const ALLOWED_FOLDERS = ['marketplace', 'chargers/individual', 'chargers/stations'] as const;
type AllowedFolder = typeof ALLOWED_FOLDERS[number];

@Controller('cloudinary')
@UseGuards(JwtAuthGuard)
export class CloudinaryController {
  constructor(private readonly cloudinaryService: CloudinaryService) {}

  /**
   * Upload single image
   * POST /cloudinary/upload?folder=marketplace  (default)
   * POST /cloudinary/upload?folder=chargers/individual
   * POST /cloudinary/upload?folder=chargers/stations
   */
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Query('folder') folderParam?: string,
  ) {
    const folder: AllowedFolder = ALLOWED_FOLDERS.includes(folderParam as AllowedFolder)
      ? (folderParam as AllowedFolder)
      : 'marketplace';

    console.log('📸 Upload request received');
    console.log('   Folder:', folder);
    console.log('   File:', file ? 'present' : 'MISSING');
    if (file) {
      console.log('   Filename:', file.originalname);
      console.log('   Mimetype:', file.mimetype);
      console.log('   Size:', file.size);
      console.log('   Buffer:', file.buffer ? 'present' : 'MISSING');
    }

    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Validate file type
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'image/gif'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(`Only JPEG, PNG, WebP and GIF images are allowed. Got: ${file.mimetype}`);
    }

    // Validate file size (max 10MB for better compatibility)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new BadRequestException('File size must not exceed 10MB');
    }

    const secureUrl = await this.cloudinaryService.uploadImage(file, folder);
    
    return {
      success: true,
      url: secureUrl,
      folder,
      message: 'Image uploaded successfully',
    };
  }

  /**
   * Upload multiple images (max 5 images)
   * POST /cloudinary/upload-multiple?folder=marketplace  (default)
   */
  @Post('upload-multiple')
  @UseInterceptors(FilesInterceptor('files', 5))
  async uploadMultipleImages(
    @UploadedFiles() files: Express.Multer.File[],
    @Query('folder') folderParam?: string,
  ) {
    const folder: AllowedFolder = ALLOWED_FOLDERS.includes(folderParam as AllowedFolder)
      ? (folderParam as AllowedFolder)
      : 'marketplace';

    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }

    // Validate each file
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    for (const file of files) {
      if (!allowedMimeTypes.includes(file.mimetype)) {
        throw new BadRequestException(`Invalid file type: ${file.originalname}`);
      }
      if (file.size > maxSize) {
        throw new BadRequestException(`File too large: ${file.originalname}`);
      }
    }

    const secureUrls = await this.cloudinaryService.uploadMultipleImages(files, folder);
    
    return {
      success: true,
      urls: secureUrls,
      folder,
      count: secureUrls.length,
      message: 'Images uploaded successfully',
    };
  }
}
