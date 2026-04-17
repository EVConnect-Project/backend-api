import { Injectable, BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  v2 as cloudinary,
  UploadApiResponse,
  UploadApiErrorResponse,
} from "cloudinary";
import { Multer } from "multer";

@Injectable()
export class CloudinaryService {
  constructor(private configService: ConfigService) {
    // Configure Cloudinary
    cloudinary.config({
      cloud_name: this.configService.get<string>("CLOUDINARY_CLOUD_NAME"),
      api_key: this.configService.get<string>("CLOUDINARY_API_KEY"),
      api_secret: this.configService.get<string>("CLOUDINARY_API_SECRET"),
    });
  }

  /**
   * Upload image to Cloudinary
   * @param file - File buffer or base64 string
   * @param folder - Cloudinary folder path (default: 'marketplace')
   * @returns Secure URL of uploaded image
   */
  async uploadImage(
    file: Express.Multer.File,
    folder: string = "marketplace",
  ): Promise<string> {
    try {
      const result: UploadApiResponse = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: folder,
            resource_type: "image",
            transformation: [
              { width: 1200, height: 1200, crop: "limit" }, // Max dimensions
              { quality: "auto:good" }, // Auto quality optimization
              { fetch_format: "auto" }, // Auto format (WebP for supported browsers)
            ],
          },
          (
            error: UploadApiErrorResponse | undefined,
            result: UploadApiResponse | undefined,
          ) => {
            if (error) reject(error);
            else if (result) resolve(result);
            else reject(new Error("Upload failed"));
          },
        );

        uploadStream.end(file.buffer);
      });

      return result.secure_url;
    } catch (error) {
      throw new BadRequestException(`Image upload failed: ${error.message}`);
    }
  }

  /**
   * Upload image from base64 string
   * @param base64String - Base64 encoded image string
   * @param folder - Cloudinary folder path (default: 'marketplace')
   * @returns Secure URL of uploaded image
   */
  async uploadBase64Image(
    base64String: string,
    folder: string = "marketplace",
  ): Promise<string> {
    try {
      const result = await cloudinary.uploader.upload(base64String, {
        folder: folder,
        resource_type: "image",
        transformation: [
          { width: 1200, height: 1200, crop: "limit" },
          { quality: "auto:good" },
          { fetch_format: "auto" },
        ],
      });

      return result.secure_url;
    } catch (error) {
      throw new BadRequestException(`Image upload failed: ${error.message}`);
    }
  }

  /**
   * Upload multiple images
   * @param files - Array of files
   * @param folder - Cloudinary folder path
   * @returns Array of secure URLs
   */
  async uploadMultipleImages(
    files: Express.Multer.File[],
    folder: string = "marketplace",
  ): Promise<string[]> {
    const uploadPromises = files.map((file) => this.uploadImage(file, folder));
    return Promise.all(uploadPromises);
  }

  /**
   * Delete image from Cloudinary
   * @param publicId - Cloudinary public ID (extracted from URL)
   */
  async deleteImage(publicId: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (error) {
      throw new BadRequestException(`Image deletion failed: ${error.message}`);
    }
  }

  /**
   * Extract public ID from Cloudinary URL
   * @param url - Cloudinary secure URL
   * @returns Public ID
   */
  extractPublicId(url: string): string {
    const parts = url.split("/");
    const filename = parts[parts.length - 1];
    const publicId = filename.split(".")[0];
    const folder = parts[parts.length - 2];
    return `${folder}/${publicId}`;
  }
}
