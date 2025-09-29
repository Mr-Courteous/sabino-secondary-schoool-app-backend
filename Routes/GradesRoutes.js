const express = require('express');
const router = express.Router();
const Grade = require('../Models/Grades');
const ReportCard = require('../Models/ReportCards');
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
router.put('/:id', async (req, res) => {
    try {
        const grade = await Grade.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!grade) {
            return res.status(404).json({ message: 'Grade record not found' });
        }
        res.json(grade);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

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

module.exports = router;