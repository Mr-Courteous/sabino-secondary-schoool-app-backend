const express = require('express');
const router = express.Router();
const Grade = require('../Models/Grades');
const ReportCard = require('../Models/ReportCards');
const TermResult = require('../Models/TermResults');
const Student = require('../Models/Students');
// NOTE: Assuming you implement and use the auth middleware on protected routes

// --- GRADE INPUT ROUTES (Teacher/Admin only) ---

// @route POST /api/grades
// @desc Record a new assessment score
router.post('/add-single-grade', async (req, res) => {
    try {
        const grade = await Grade.create(req.body);
        res.status(201).json(grade);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// @route PUT /api/grades/:id
// @desc Update an existing score
// router.put('/:id', async (req, res) => {
//     try {
//         const grade = await Grade.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
//         if (!grade) {
//             return res.status(404).json({ message: 'Grade record not found' });
//         }
//         res.json(grade);
//     } catch (error) {
//         res.status(400).json({ message: error.message });
//     }
// });

// @route GET /api/grades/student/:studentId
// @desc Get all raw grades for a student (History/Transcript view)
router.get('/student/:studentId', async (req, res) => {
    try {
        const grades = await Grade.find({ student: req.params.studentId })
            .populate('subject', 'subjectName')
            .sort({ academicYear: 1, term: 1, createdAt: 1 });
        res.json(grades);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


// --- REPORT CARD ROUTES (Staff/Admin) ---

// @route POST /api/grades/reports/generate
// @desc Trigger the aggregation and creation of the final ReportCard document
router.post('/reports/generate', async (req, res) => {
    const { studentId, classId, academicYear, term } = req.body;
    
    if (!studentId || !classId || !academicYear || !term) {
        return res.status(400).json({ message: 'Missing required parameters for report generation' });
    }

    try {
        // NOTE: This is complex logic that would typically live in a service/controller.
        // Simplified: Aggregate grades, calculate final scores, and create the ReportCard document.
        // A full implementation requires a complex $group/$project aggregation pipeline.
        
        // 1. Check if ReportCard already exists
        const existingReport = await ReportCard.findOne({ student: studentId, academicYear, term });
        if (existingReport) {
             return res.status(409).json({ message: 'Report card already generated for this student and term.' });
        }

        // 2. Placeholder for Aggregation & Calculation...
        // ... (Logic to pull all raw grades, compute averages/final scores, determine grade letters) ...
        const subjectsReport = [
             // Example of computed result:
             { subject: req.body.subject, finalScore: 75, gradeLetter: 'B' } 
        ];

        // 3. Create the ReportCard
        const newReportCard = await ReportCard.create({
            student: studentId,
            class: classId,
            academicYear,
            term,
            subjectsReport
            // Other fields left blank or defaulted
        });

        res.status(201).json(newReportCard);

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route GET /api/grades/reports/student/:studentId
// @desc Get final report card history for a student
router.get('/reports/student/:studentId', async (req, res) => {
    try {
        const reports = await ReportCard.find({ student: req.params.studentId })
            .populate('class', 'className')
            .sort({ academicYear: -1, term: -1 });
        res.json(reports);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});



/**
 * @route PUT /api/results/update-grade
 * @desc Update a single subject's score using Admission Number + composite key.
 * @access Private (Teacher/Admin)
 */
router.put('/updating-grade', async (req, res) => {
    // Expected req.body: 
    // { admissionNumber: '2025/123', academicYear: '2025', term: '1st Term', subjectId: 'subj_id', caScore: 40, examScore: 55 }
    const { admissionNumber, academicYear, term, subjectId, caScore, examScore } = req.body;

    if (!admissionNumber || !academicYear || !term || !subjectId || (caScore === undefined && examScore === undefined)) {
        return res.status(400).json({ message: 'Missing required identifiers (admissionNumber, academicYear, term, subjectId) or scores.' });
    }
    
    // --- STEP 1: Find the Student's MongoDB ID using the Admission Number ---
    let student;
    try {
        student = await Student.findOne({ admissionNumber }).select('_id');
    } catch (error) {
        console.error('Database error during student lookup:', error);
        return res.status(500).json({ message: 'Server error during student lookup.' });
    }
    
    if (!student) {
        return res.status(404).json({ message: `Student with Admission Number ${admissionNumber} not found.` });
    }
    const studentId = student._id;

    // --- STEP 2: Construct the dynamic update object and execute ---
    const updateFields = {};
    if (caScore !== undefined) {
        updateFields['grades.$.caScore'] = caScore;
    }
    if (examScore !== undefined) {
        updateFields['grades.$.examScore'] = examScore;
    }

    try {
        const updatedResult = await TermResult.findOneAndUpdate(
            { 
                // Use the found student ID with the composite key:
                student: studentId, 
                academicYear: academicYear, 
                term: term,
                // AND find the specific subject within the grades array:
                'grades.subject': subjectId 
            },
            { $set: updateFields },
            { 
                new: true, 
                runValidators: true, 
            }
        )
        // Optionally populate for a friendly response
        .populate('student', 'name admissionNumber') 
        .populate('grades.subject', 'subjectName');

        if (!updatedResult) {
            return res.status(404).json({ 
                message: `Term Result record not found for student ${admissionNumber} for the specified Term/Subject.` 
            });
        }

        res.json({ 
            message: 'Subject grade updated successfully.',
            result: updatedResult 
        });

    } catch (error) {
        console.error('Individual grade update failed:', error);
        res.status(400).json({ message: 'Update failed: ' + error.message });
    }
});

// TermResults.js (Refactored Bulk Update)

/**
 * @route PUT /api/results/bulk-update-grades
 * @desc Bulk update scores using the composite key for each entry (Student, Year, Term, Subject).
 * @access Private (Teacher/Admin)
 */
router.put('/bulk-update-grades', async (req, res) => {
    // Expected req.body is an array of updates:
    // [ 
    //   { studentId: 'stu_1', academicYear: '2025', term: '1st Term', subjectId: 'sub_a', caScore: 40, examScore: 55 }, 
    //   { studentId: 'stu_2', academicYear: '2025', term: '1st Term', subjectId: 'sub_a', caScore: 35 }, 
    //   ...
    // ]
    const updates = req.body;
    
    if (!Array.isArray(updates) || updates.length === 0) {
        return res.status(400).json({ message: 'Request body must be a non-empty array of updates.' });
    }

    const session = await TermResult.startSession();
    session.startTransaction(); // Start a transaction for atomicity

    try {
        const promises = updates.map(update => {
            const { studentId, academicYear, term, subjectId, caScore, examScore } = update;

            if (!studentId || !academicYear || !term || !subjectId || (caScore === undefined && examScore === undefined)) {
                // Reject promise for invalid data within the batch to trigger transaction rollback
                return Promise.reject(new Error(`Invalid update object: Missing key fields or scores for update: ${JSON.stringify(update)}`));
            }

            const updateFields = {};
            if (caScore !== undefined) {
                updateFields['grades.$.caScore'] = caScore;
            }
            if (examScore !== undefined) {
                updateFields['grades.$.examScore'] = examScore;
            }

            return TermResult.findOneAndUpdate(
                { 
                    // Query using the composite key:
                    student: studentId, 
                    academicYear: academicYear, 
                    term: term,
                    'grades.subject': subjectId 
                },
                { $set: updateFields },
                { 
                    new: true, 
                    runValidators: true, 
                    session, // Apply transaction to the update
                }
            );
        });

        const results = await Promise.all(promises);

        // Check for any null results (Document or nested subject not found)
        if (results.some(r => r === null)) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ message: 'Bulk update failed: One or more TermResult records or Subject Grades were not found using the provided identifiers.' });
        }

        await session.commitTransaction();
        session.endSession();

        res.json({ message: 'Bulk grade update successful', updatedCount: results.length });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        // This catches validation errors or the custom error from the map function
        res.status(400).json({ message: 'Bulk update failed: ' + error.message });
    }
});

module.exports = router;

