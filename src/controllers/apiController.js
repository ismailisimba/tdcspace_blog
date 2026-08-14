import { processAndUploadImage } from '../services/storage.js';
import UploadedFile from '../models/UploadedFile.js';

export const handleFileUpload = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    const { publicUrl, fileName } = await processAndUploadImage(
      req.file.buffer,
      req.file.originalname
    );

    await UploadedFile.create({
      url: publicUrl,
      fileName: fileName,
      userId: req.user.id
    });
    
    res.status(200).json({ url: publicUrl });

  } catch (error) {
    console.error('API File Upload Error:', error);
    res.status(500).json({ error: 'File upload failed.' });
  }
};
