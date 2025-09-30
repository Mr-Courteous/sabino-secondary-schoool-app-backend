const express = require('express');
const router = express.Router();
// Assuming the TermResult model is correctly exported and imported
const TermResult = require('../Models/TermResults'); 
// We must import the Class model to know the mandatory subjects
const ClassModel = require('../Models/Classes'); 
// Assuming Subject model exists, though it's not directly used for creation, only for reference

// --- HELPER FUNCTION: Create Default Term Result (DEFINITION STARTS HERE) ---

/**
 * Creates a TermResult record for a student with all mandatory subjects initialized to 0 scores.
 * NOTE: You should call this from your Student Registration/Class Assignment route.
 * @param {string} studentId 
 * @param {string} classId 
 * @param {string} academicYear 
 * @param {string} term 
 * @param {string} recordedById - The ID of the Registrar or Admin performing the registration.
 */
async function createDefaultResult(studentId, classId, academicYear, term, recordedById) {
    // 1. Get the mandatory subjects for the class
    const schoolClass = await ClassModel.findById(classId).select('mandatorySubjects').exec();

    if (!schoolClass) {
        throw new Error(`Class ID ${classId} not found.`);
    }
    
    // 2. Map mandatory Subject IDs to the TermResult 'grades' format
    const defaultGrades = schoolClass.mandatorySubjects.map(subjectId => ({
        subject: subjectId,
        caScore: 0,
        examScore: 0
    }));

    // 3. Construct the default TermResult object
    const defaultResultData = {
        student: studentId,
        class: classId,
        academicYear: academicYear,
        term: term,
        recordedBy: recordedById,
        grades: defaultGrades
    };

    // 4. Create and save the TermResult document. 
    const newResult = await TermResult.create(defaultResultData);
    return newResult;
}

// --- END HELPER FUNCTION ---


// ... (All other result routes like router.post('/'), router.post('/bulk'), etc.) ...


/**
 * @route POST /api/results/initialize
 * @desc Test route to manually initialize a default result for a student/term/class.
 * @access Private (Admin/Registrar)
 */
router.post('/initialize', async (req, res) => {
    try {
        const { studentId, classId, academicYear, term, recordedBy } = req.body;

        if (!studentId || !classId || !academicYear || !term || !recordedBy) {
            return res.status(400).json({
                message: 'Missing required initialization parameters (studentId, classId, academicYear, term, recordedBy).'
            });
        }

        const newResult = await createDefaultResult(studentId, classId, academicYear, term, recordedBy);

        res.status(201).json({
            message: `Successfully initialized default result for student ${studentId} in ${classId} (${term} ${academicYear}).`,
            result: newResult
        });

    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                message: 'Default result already exists for this student, term, and year. Initialization skipped.'
            });
        }
        console.error('Error initializing default result:', error);
        res.status(500).json({
            message: 'Failed to initialize default result.',
            error: error.message
        });
    }
});

// ------------------------------------------------------------------
// THIS IS THE KEY EXPORT LINE:
// It exports both the Express router and the helper function.
// ------------------------------------------------------------------
module.exports = {
    router,
    createDefaultResult // <-- This is what is imported in studentRoutes.js
};
