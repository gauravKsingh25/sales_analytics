import express from 'express';
import {
  getAllDesignations,
  getDesignationById,
  createDesignation,
  updateDesignation,
  deleteDesignation,
  getDesignationHierarchy
} from './controller.js';

const router = express.Router();

router.get('/', getAllDesignations);
router.get('/hierarchy', getDesignationHierarchy);
router.get('/:id', getDesignationById);
router.post('/', createDesignation);
router.put('/:id', updateDesignation);
router.delete('/:id', deleteDesignation);

export default router;
