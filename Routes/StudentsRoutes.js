const express = require('express');
const router = express.Router();
const Student = require('../Models/Students');
const TermResult = require('../Models/TermResults');
const { createDefaultResult } = require('./TermResults'); // Import the helper function
// NOTE: Assuming you implement and use the auth middleware on protected routes

// @route POST /api/students/register
// @desc Create a new student (Registration)
// @route POST /api/students/register
// @desc Create a new student (Registration) with auto-generated admission number
router.post('/register', async (req, res) => {
    // --- Admission Number Generation Logic (Unchanged) ---
    const session = await Student.startSession();
    session.startTransaction();

    try {
        // --- 1. Admission Number Generation ---
        const lastStudent = await Student.findOne().sort({ admissionNumber: -1 }).limit(1).session(session);
        
        const currentYear = new Date().getFullYear();
        // Determine current term (Assuming term logic is external or static)
        const currentTerm = '1st Term'; 
        
        let nextSequentialId = 1;

        if (lastStudent && lastStudent.admissionNumber) {
            const parts = lastStudent.admissionNumber.split('/');
            const lastNumStr = parts[parts.length - 1]; 
            const lastNum = parseInt(lastNumStr, 10);

            if (!isNaN(lastNum)) {
                nextSequentialId = lastNum + 1;
            }
        }

        const sequentialId = String(nextSequentialId).padStart(4, '0');
        const newAdmissionNumber = `${currentYear}/${sequentialId}`;
        req.body.admissionNumber = newAdmissionNumber;

        // --- 2. Student Database Creation ---
        // Assuming req.body contains the student's currentClass ID
        const classId = req.body.currentClass; 
        const recordedBy = req.body.registeredByAdminId || 'DEFAULT_ADMIN_ID'; // Use actual Admin ID from auth/session

        if (!classId) {
            await session.abortTransaction();
            return res.status(400).json({ message: 'Registration requires a currentClass ID.' });
        }

        // Create the student profile
        const student = await Student.create([req.body], { session });
        const studentId = student[0]._id; // Get the ID of the newly created student

        // --- 3. Initialize Default Term Result (The Goal) ---
        
        // This links the student's new ID to their assigned class and initializes scores to 0
        const defaultResult = await createDefaultResult(
            studentId, 
            classId, 
            String(currentYear), 
            currentTerm, 
            recordedBy
        );

        await session.commitTransaction();
        session.endSession();

        // Return the created student document, and potentially the initial result
        res.status(201).json({
            student: student[0],
            initialResult: defaultResult,
            message: "Student registered and initial term result created."
        });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        
        console.error('Registration failed:', error);
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
// router.get('/:id', async (req, res) => {
//     try {
//         const student = await Student.findById(req.params.id)
//             .populate('currentClass', 'className gradeLevel');
//         if (!student) {
//             return res.status(404).json({ message: 'Student not found' });
//         }
//         res.json(student);
//     } catch (error) {
//         res.status(500).json({ message: error.message });
//     }
// });

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


/**
 * @route POST /api/results
 * @desc Create a new term result record for a student (Teacher/Admin only)
 * @access Private (Teacher/Admin)
 */
router.post('/a', async (req, res) => {
    try {
        const { student, class: classId, academicYear, term, recordedBy, grades } = req.body;

        // Basic validation for required top-level fields
        if (!student || !classId || !academicYear || !term || !recordedBy || !Array.isArray(grades)) {
            return res.status(400).json({ 
                message: 'Missing required fields (student, class, academicYear, term, recordedBy, and grades array).' 
            });
        }
        
        // 1. Create the TermResult document using the request body
        // Mongoose will automatically validate against the schema (e.g., uniqueness)
        const newResult = await TermResult.create(req.body);

        // 2. Respond with the created document
        res.status(201).json(newResult);

    } catch (error) {
        // Handle MongoDB unique index error (409 Conflict)
        // This occurs if a teacher tries to submit a report card twice for the same student/term/year.
        if (error.code === 11000) {
            return res.status(409).json({ 
                message: 'A term result already exists for this student, academic year, and term.' 
            });
        }

        // Handle Mongoose validation errors (400 Bad Request)
        if (error.name === 'ValidationError') {
            return res.status(400).json({ 
                message: 'Validation failed: Check data types and required fields.',
                details: error.message
            });
        }
        
        console.error('Error creating term result:', error);
        res.status(500).json({ 
            message: 'Server error while creating results.',
            error: error.message 
        });
    }
});



router.get('/student-result', /* authMiddleware, isAdmin, */ async (req, res) => {
    // 1. Change lookup key: Get admissionNumber instead of studentId
    const { admissionNumber, academicYear, term } = req.query; 

    if (!admissionNumber || !academicYear || !term) {
        return res.status(400).json({ 
            message: "admissionNumber, Academic Year, and Term are required query parameters." 
        });
    }

    try {
        // 2. Find the Student's MongoDB ID using the Admission Number
        const student = await Student.findOne({ admissionNumber }).select('_id name');

        if (!student) {
            return res.status(404).json({ message: `Student with Admission Number ${admissionNumber} not found.` });
        }
        
        // 3. Use the found student ID to query TermResult and populate the student's name
        const result = await TermResult.findOne({ 
            student: student._id, 
            academicYear: academicYear, 
            term: term 
        })
        .populate('student', 'name') // ADDED: Populate student's name fields (e.g., name.first, name.last)
        .populate('class', 'name')
        .populate('grades.subject', 'subjectName')
        .select('-__v -createdAt -updatedAt -recordedBy');

        if (!result) {
            return res.status(404).json({ message: `Result not found for student ${admissionNumber} for the specified term.` });
        }

        res.status(200).json(result);

    } catch (error) {
        console.error('Error fetching student result (Admin Lookup):', error);
        // The ObjectId error handler is removed since we are now verifying the ID via the Student model first.
        res.status(500).json({ message: 'Error retrieving term result.', details: error.message });
    }
});




module.exports = router;