import type { Express } from "express";
import type { Request, Response } from "express";
import multer from "multer";
import fs from "fs/promises";
import path from "path";
import mammoth from "mammoth";

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/markdown',
      'text/html',
      'application/json'
    ];
    
    const allowedExtensions = ['.pdf', '.txt', '.doc', '.docx', '.md', '.html', '.json'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(file.mimetype) || 
        file.mimetype.startsWith('text/') || 
        allowedExtensions.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Supported formats: PDF, TXT, DOC, DOCX, MD, HTML, JSON'));
    }
  }
});

async function extractTextFromFile(file: Express.Multer.File): Promise<string> {
  const { mimetype, buffer } = file;
  
  try {
    // Handle PDF files
    if (mimetype === 'application/pdf') {
      const pdfParse = await import('pdf-parse');
      const data = await pdfParse.default(buffer);
      return data.text;
    }
    
    // Handle DOCX files
    if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    }
    
    // Handle DOC files
    if (mimetype === 'application/msword') {
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    }
    
    // Handle JSON files
    if (mimetype === 'application/json' || file.originalname.endsWith('.json')) {
      const jsonContent = buffer.toString('utf-8');
      try {
        const parsed = JSON.parse(jsonContent);
        return JSON.stringify(parsed, null, 2);
      } catch {
        return jsonContent;
      }
    }
    
    // Handle text-based files (TXT, MD, HTML, etc.)
    if (mimetype.startsWith('text/') || mimetype === 'text/plain' || mimetype === 'text/markdown' || file.originalname.endsWith('.md')) {
      return buffer.toString('utf-8');
    }
    
    throw new Error(`Unsupported file type: ${mimetype}`);
  } catch (error) {
    console.error('Error extracting text from file:', error);
    throw new Error(`Failed to extract text from file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export function registerUploadRoutes(app: Express) {
  // File upload endpoint
  app.post("/api/upload/file", upload.single('file'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      
      const extractedText = await extractTextFromFile(req.file);
      
      if (!extractedText || extractedText.trim().length === 0) {
        return res.status(400).json({ error: "No text content found in the file" });
      }
      
      // Return the extracted text
      res.json({ 
        success: true,
        text: extractedText,
        filename: req.file.originalname,
        size: req.file.size,
        type: req.file.mimetype
      });
    } catch (error) {
      console.error("File upload error:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to process file" 
      });
    }
  });
  
  // Get supported file types
  app.get("/api/upload/supported-types", (req: Request, res: Response) => {
    res.json({
      types: [
        { extension: '.pdf', mimetype: 'application/pdf', description: 'PDF Documents' },
        { extension: '.txt', mimetype: 'text/plain', description: 'Text Files' },
        { extension: '.docx', mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', description: 'Word Documents' },
        { extension: '.doc', mimetype: 'application/msword', description: 'Word Documents (Legacy)' },
        { extension: '.md', mimetype: 'text/markdown', description: 'Markdown Files' },
        { extension: '.html', mimetype: 'text/html', description: 'HTML Files' },
        { extension: '.json', mimetype: 'application/json', description: 'JSON Files' }
      ]
    });
  });
}