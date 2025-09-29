const express = require('express');
const router = express.Router();
const Student = require('../Models/Students');
// NOTE: Assuming you implement and use the auth middleware on protected routes

// @route POST /api/students/register
// @desc Create a new student (Registration)
// @route POST /api/students/register
// @desc Create a new student (Registration) with auto-generated admission number
router.post('/register', async (req, res) => {
    
    // --- Admission Number Generation Logic ---
    try {
        // 1. Find the highest existing admission number to determine the next sequence
        // This assumes the admission number is indexed for performance and that 
        // string sorting works reasonably well for the 'YYYY/SSSS' format.
        const lastStudent = await Student.findOne().sort({ admissionNumber: -1 }).limit(1);

        const currentYear = new Date().getFullYear();
        let nextSequentialId = 1;

        if (lastStudent && lastStudent.admissionNumber) {
            // Split the last admission number (e.g., '2025/0015')
            const parts = lastStudent.admissionNumber.split('/');
            const lastNumStr = parts[parts.length - 1]; // e.g., '0015'
            
            // Try to parse the sequential number
            const lastNum = parseInt(lastNumStr, 10); 

            if (!isNaN(lastNum)) {
                nextSequentialId = lastNum + 1;
            }
        }
        
        // 2. Format the sequential part (ensuring it has 4 digits, e.g., 1 -> 0001)
        const sequentialId = String(nextSequentialId).padStart(4, '0');

        // 3. Construct the final admission number
        const newAdmissionNumber = `${currentYear}/${sequentialId}`;

        // 4. Assign the generated number to the request body
        req.body.admissionNumber = newAdmissionNumber;
        
        // --- Database Creation ---
        // Mongoose pre-save hook handles password hashing
        const student = await Student.create(req.body);
        
        // Return the created student document, including the new admission number
        res.status(201).json(student);

    } catch (error) {
        // Handle database errors (e.g., validation, server error)
        // If the `currentClass` ID is invalid, it will still throw a validation error.
        res.status(400).json({ message: 'Registration failed: ' + error.message });
    }
});

// @route GET /api/students
// @desc Get all students (Admin/Staff only)
router.get('/students', async (req, res) => {
    try {
        const students = await Student.find().populate('currentClass', 'className gradeLevel');
        res.json(students);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route GET /api/students/:id
// @desc Get single student by ID
router.get('/:id', async (req, res) => {
    try {
        const student = await Student.findById(req.params.id)
            .populate('currentClass', 'className gradeLevel');
        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }
        res.json(student);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route PUT /api/students/:id
// @desc Update student details
router.put('/:id', async (req, res) => {
    try {
        const student = await Student.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
        });
        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }
        res.json(student);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// @route DELETE /api/students/:id
// @desc Delete student
router.delete('/:id', async (req, res) => {
    try {
        const student = await Student.findByIdAndDelete(req.params.id);
        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }
        res.json({ message: 'Student deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;