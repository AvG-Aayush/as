import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const fileType = req.body.fileType || 'document';
    const subDir = path.join(uploadsDir, fileType);
    
    if (!fs.existsSync(subDir)) {
      fs.mkdirSync(subDir, { recursive: true });
    }
    
    cb(null, subDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const extension = path.extname(file.originalname);
    const fileName = `${timestamp}-${Math.random().toString(36).substr(2, 9)}${extension}`;
    cb(null, fileName);
  }
});

// File filter for security
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = {
    'profile_picture': ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    'portfolio': ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'],
    'document': ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    'receipt': ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'],
    'certificate': ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
  };

  const fileType = req.body.fileType || 'document';
  const allowed = allowedTypes[fileType as keyof typeof allowedTypes] || allowedTypes.document;

  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed types for ${fileType}: ${allowed.join(', ')}`));
  }
};

// Create multer upload middleware
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1 // Single file upload
  }
});

// Helper function to delete file
export const deleteFile = (filePath: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    fs.unlink(filePath, (err) => {
      if (err && err.code !== 'ENOENT') {
        reject(err);
      } else {
        resolve();
      }
    });
  });
};

// Serve static files
export const getFileUrl = (filePath: string): string => {
  return `/uploads/${path.relative(uploadsDir, filePath)}`;
};