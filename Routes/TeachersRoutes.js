const express = require('express');
const router = express.Router();
const Teacher = require('../Models/Teachers');
// NOTE: Assuming you implement and use the auth middleware on protected routes

// @route POST /api/teachers/register
// @desc Create a new teacher (Registration)
router.post('/register', async (req, res) => {
    try {
        // Mongoose pre-save hook handles password hashing
        const teacher = await Teacher.create(req.body);
        res.status(201).json(teacher);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// @route GET /api/teachers
// @desc Get all teachers (Admin/Staff only)
router.get('/', async (req, res) => {
    try {
        const teachers = await Teacher.find().populate('assignedSubjects', 'subjectName');
        res.json(teachers);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route GET /api/teachers/:id
// @desc Get single teacher by ID
router.get('/:id', async (req, res) => {
    try {
        const teacher = await Teacher.findById(req.params.id)
            .populate('assignedSubjects', 'subjectName');
        if (!teacher) {
            return res.status(404).json({ message: 'Teacher not found' });
        }
        res.json(teacher);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route PUT /api/teachers/:id
// @desc Update teacher details
router.put('/:id', async (req, res) => {
    try {
        const teacher = await Teacher.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
        });
        if (!teacher) {
            return res.status(404).json({ message: 'Teacher not found' });
        }
        res.json(teacher);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// @route DELETE /api/teachers/:id
// @desc Delete teacher
router.delete('/:id', async (req, res) => {
    try {
        const teacher = await Teacher.findByIdAndDelete(req.params.id);
        if (!teacher) {
            return res.status(404).json({ message: 'Teacher not found' });
        }
        res.json({ message: 'Teacher deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;