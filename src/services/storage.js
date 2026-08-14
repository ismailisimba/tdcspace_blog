import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';
import dotenv from 'dotenv';
dotenv.config();

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const bucketName = process.env.R2_BUCKET_NAME;

export async function processAndUploadImage(buffer, originalName, options = {}) {
  const { resize, quality = 80 } = options;

  let imagePipeline = sharp(buffer);
  if (resize && resize.width && resize.height) {
    imagePipeline = imagePipeline.resize(resize.width, resize.height);
  }

  const processedBuffer = await imagePipeline.jpeg({ quality, mozjpeg: true }).toBuffer();
  const sanitizedName = originalName.replace(/\.[^/.]+$/, "").replace(/\s/g, '_');
  const destFileName = `${Date.now()}-${sanitizedName}.jpg`;

  await s3.send(new PutObjectCommand({
    Bucket: bucketName,
    Key: destFileName,
    Body: processedBuffer,
    ContentType: 'image/jpeg',
  }));

  const publicUrl = `/files/${destFileName}`;
  return { publicUrl, fileName: destFileName };
}

export async function getFileStream(fileName) {
  const response = await s3.send(new GetObjectCommand({
    Bucket: bucketName,
    Key: fileName,
  }));
  return response.Body;
}

export async function deleteFile(fileName) {
  if (!fileName) throw new Error('No filename provided for deletion.');
  await s3.send(new DeleteObjectCommand({
    Bucket: bucketName,
    Key: fileName,
  }));
}
