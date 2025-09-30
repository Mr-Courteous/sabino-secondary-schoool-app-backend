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








// --- NEW ROUTE: Bulk Open New Term for Class ---

/**
 * @route POST /api/promotion/open-new-term
 * @desc Finds all students in a given class and initializes the TermResult record for a new term/session.
 * @access Private (Admin/Registrar)
 */
router.post('/open-new-term', async (req, res) => {
    const { 
        classId,           // The current class ID (e.g., JSS1)
        nextAcademicYear, 
        nextTerm, 
        promotedByUserId 
    } = req.body;

    if (!classId || !nextAcademicYear || !nextTerm || !promotedByUserId) {
        return res.status(400).json({ 
            message: 'Missing required parameters: classId, nextAcademicYear, nextTerm, promotedByUserId.' 
        });
    }

    try {
        // 1. Find all students currently assigned to this class
        const students = await Student.find({ currentClass: classId }).select('_id');
        
        if (students.length === 0) {
            return res.status(404).json({ 
                message: `No students found in class ${classId}.` 
            });
        }

        let successfulInitializations = 0;
        let failedInitializations = [];

        // 2. Prepare all promises for concurrent execution
        const initializationPromises = students.map(student => {
            // Note: We use the classId from the request body as the new class for the result.
            // (Assumes students are NOT moving classes yet, only moving terms.)
            return createDefaultResult(
                student._id, 
                classId, 
                nextAcademicYear, 
                nextTerm, 
                promotedByUserId
            ).then(result => {
                successfulInitializations++;
                return result;
            }).catch(error => {
                // Ignore unique key conflicts (11000) as they mean the result already exists.
                if (error.code !== 11000) {
                    failedInitializations.push({ 
                        studentId: student._id, 
                        error: error.message 
                    });
                }
                // Still count existing records as success for reporting purposes if 11000
                if (error.code === 11000) {
                     successfulInitializations++;
                }
                return null;
            });
        });

        // 3. Run all creations concurrently
        await Promise.all(initializationPromises);
        
        const totalStudents = students.length;

        res.status(200).json({
            message: `Successfully initialized results for ${successfulInitializations} out of ${totalStudents} students in class ${classId}.`,
            totalStudentsProcessed: totalStudents,
            successfullyInitialized: successfulInitializations,
            failedInitializations: failedInitializations,
            notes: "Failed initializations (if any) are reported above. Conflicts (already existing results) are counted as successful."
        });

    } catch (error) {
        console.error('Bulk term opening failed:', error);
        // This catch block handles errors outside the Promise.all (e.g., database connection, invalid Class ID lookup)
        res.status(500).json({ message: 'Server error during bulk term opening.', details: error.message });
    }
});
module.exports = router;