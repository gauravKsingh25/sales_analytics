import Designation from '../../schemas/designation.js';
import express from 'express';

const router = express.Router();

export const getAllDesignations = async (req, res) => {
  try {
    const designations = await Designation.find()
      .populate('reportsTo', 'title level')
      .sort({ level: 1, title: 1 });
    
    res.json(designations);
  } catch (error) {
    console.error('Error fetching designations:', error);
    res.status(500).json({ message: 'Failed to fetch designations', error: error.message });
  }
};

export const getDesignationById = async (req, res) => {
  try {
    const designation = await Designation.findById(req.params.id)
      .populate('reportsTo', 'title level');
    
    if (!designation) {
      return res.status(404).json({ message: 'Designation not found' });
    }
    
    res.json(designation);
  } catch (error) {
    console.error('Error fetching designation:', error);
    res.status(500).json({ message: 'Failed to fetch designation', error: error.message });
  }
};

export const createDesignation = async (req, res) => {
  try {
    const { title, description, level, reportsTo, isActive } = req.body;
    
    const designation = new Designation({
      title,
      description,
      level,
      reportsTo: reportsTo || null,
      isActive: isActive !== undefined ? isActive : true
    });
    
    await designation.save();
    
    const populated = await Designation.findById(designation._id)
      .populate('reportsTo', 'title level');
    
    res.status(201).json(populated);
  } catch (error) {
    console.error('Error creating designation:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Designation title already exists' });
    }
    res.status(500).json({ message: 'Failed to create designation', error: error.message });
  }
};

export const updateDesignation = async (req, res) => {
  try {
    const { title, description, level, reportsTo, isActive } = req.body;
    
    // Prevent circular reference
    if (reportsTo && reportsTo.toString() === req.params.id) {
      return res.status(400).json({ message: 'A designation cannot report to itself' });
    }
    
    const designation = await Designation.findByIdAndUpdate(
      req.params.id,
      { title, description, level, reportsTo: reportsTo || null, isActive },
      { new: true, runValidators: true }
    ).populate('reportsTo', 'title level');
    
    if (!designation) {
      return res.status(404).json({ message: 'Designation not found' });
    }
    
    res.json(designation);
  } catch (error) {
    console.error('Error updating designation:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Designation title already exists' });
    }
    res.status(500).json({ message: 'Failed to update designation', error: error.message });
  }
};

export const deleteDesignation = async (req, res) => {
  try {
    const designation = await Designation.findByIdAndDelete(req.params.id);
    
    if (!designation) {
      return res.status(404).json({ message: 'Designation not found' });
    }
    
    res.json({ message: 'Designation deleted successfully', designation });
  } catch (error) {
    console.error('Error deleting designation:', error);
    res.status(500).json({ message: 'Failed to delete designation', error: error.message });
  }
};

export const getDesignationHierarchy = async (req, res) => {
  try {
    const designations = await Designation.find({ isActive: true })
      .populate('reportsTo', 'title level')
      .sort({ level: 1, title: 1 });
    
    // Build hierarchy tree
    const hierarchy = buildHierarchyTree(designations);
    
    res.json(hierarchy);
  } catch (error) {
    console.error('Error fetching designation hierarchy:', error);
    res.status(500).json({ message: 'Failed to fetch hierarchy', error: error.message });
  }
};

// Helper function to build hierarchy tree
function buildHierarchyTree(designations) {
  const map = {};
  const roots = [];
  
  // Create a map of all designations
  designations.forEach(d => {
    map[d._id] = { ...d.toObject(), children: [] };
  });
  
  // Build the tree
  designations.forEach(d => {
    if (d.reportsTo) {
      const parent = map[d.reportsTo._id];
      if (parent) {
        parent.children.push(map[d._id]);
      } else {
        roots.push(map[d._id]);
      }
    } else {
      roots.push(map[d._id]);
    }
  });
  
  return roots;
}

// Routes
router.get('/', getAllDesignations);
router.get('/hierarchy', getDesignationHierarchy);
router.get('/:id', getDesignationById);
router.post('/', createDesignation);
router.put('/:id', updateDesignation);
router.delete('/:id', deleteDesignation);

export default router;
