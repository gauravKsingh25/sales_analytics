import express from 'express';
import multer from 'multer';
import Upload from '../../schemas/upload.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { processUpload } from '../workers/worker.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const router = express.Router();


const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
});

const fileFilter = (req, file, cb) => {
  // Only accept .xlsx files
  if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
      file.originalname.toLowerCase().endsWith('.xlsx')) {
    cb(null, true);
  } else {
    cb(new Error('Only .xlsx files are allowed'), false);
  }
};

const upload = multer({ storage, fileFilter });

router.post('/', upload.single('file'), async (req, res) => {
  try {
    const { file } = req;
    if (!file) return res.status(400).json({ message: 'No file uploaded' });
    
    // Validate file extension
    if (!file.originalname.toLowerCase().endsWith('.xlsx')) {
      // Clean up uploaded file
      if (file.path && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      return res.status(400).json({ message: 'Only .xlsx files are allowed' });
    }
    
    const doc = await Upload.create({
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
      mimeType: file.mimetype,
      path: file.path,
      status: 'queued',
      processedRows: 0,
      totalRows: 0,
      errorsList: [],
    });
    
    // Directly process here (no BullMQ)
    processUpload(doc._id.toString(), file.path);
    res.status(201).json({ uploadId: doc._id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/:id/status', async (req, res) => {
  const upload = await Upload.findById(req.params.id);
  if (!upload) return res.status(404).json({ message: 'Not found' });
  res.json({
    status: upload.status,
    processedRows: upload.processedRows || 0,
    totalRows: upload.totalRows || 0,
    errors: upload.errorsList || [],
  });
});

router.post('/:id/reprocess', async (req, res) => {
  // Directly process here (no BullMQ)
  const upload = await Upload.findById(req.params.id);
  if (!upload) return res.status(404).json({ message: 'Not found' });
  processUpload(upload._id.toString(), upload.path);
  res.json({ message: 'Reprocess triggered' });
});

export default router;
