const express = require('express');
const router = express.Router();
const Subject = require('../Models/Subjects');
const Class = require('../Models/Classes');
const mongoose = require('mongoose');
// NOTE: Assuming you implement and use the auth middleware on protected routes

// --- SUBJECT ROUTES ---

// @route POST /api/academics/subjects
// @desc Create a new subject (Admin only)
router.post('/subjects', async (req, res) => {
    try {
        const subject = await Subject.create(req.body);
        res.status(201).json(subject);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});



// @route POST /api/academics/subjects
// @desc Create one or many new subjects (Admin only)
router.post('/many-subjects', async (req, res) => {
    try {
        // Mongoose create() handles a single object OR an array of objects
        const subjects = await Subject.create(req.body);
        res.status(201).json(subjects);
    } catch (error) {
        // Handle validation or unique key errors
        res.status(400).json({ message: error.message });
    }
});

// @route POST /api/grades
// @desc Record a single score OR an array of scores (Bulk Creation)
router.post('/', async (req, res) => {
    try {
        // req.body can be a single object or an array of objects
        const grades = await Grade.create(req.body);
        res.status(201).json(grades);
    } catch (error) {
        // This will likely catch validation errors if any document in the array fails
        res.status(400).json({ message: error.message });
    }
});

// @route PUT /api/grades/bulk-update
// @desc Update scores for multiple students/assessments at once (e.g., editing a column)
router.put('/bulk-update', async (req, res) => {
    // Expected req.body is an array of updates:
    // [ { id: 'grade_id_1', score: 18, maxScore: 20 }, { id: 'grade_id_2', score: 15, maxScore: 20 }, ... ]
    const updates = req.body;
    const session = await mongoose.startSession(); // Start a session for atomicity
    session.startTransaction();

    try {
        const promises = updates.map(update => {
            // Use findByIdAndUpdate for each update to ensure validation runs
            return Grade.findByIdAndUpdate(
                update.id,
                { score: update.score, maxScore: update.maxScore },
                { new: true, runValidators: true, session }
            );
        });

        const results = await Promise.all(promises);

        // Check for any null results, indicating an ID was not found
        if (results.some(r => r === null)) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ message: 'One or more grade records not found.' });
        }

        await session.commitTransaction();
        session.endSession();

        res.json({ message: 'Bulk update successful', updatedCount: results.length });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        res.status(400).json({ message: 'Bulk update failed: ' + error.message });
    }
});

// @route GET /api/academics/subjects
// @desc Get all subjects
router.get('/subjects', async (req, res) => {
    try {
        const subjects = await Subject.find();
        res.json(subjects);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// --- CLASS ROUTES ---

// @route POST /api/academics/classes
// @desc Create a new class/section (Admin only)
router.post('/classes', async (req, res) => {
    try {
        const newClass = await Class.create(req.body);
        res.status(201).json(newClass);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});


// @route POST /api/academics/classes
// @desc Create a new class/section (Admin only)
// router.post('/many-classes', async (req, res) => {
//     try {
//         // Class.create() accepts a single object or an array of objects.
//         const newClasses = await Class.create(req.body); 
//         res.status(201).json(newClasses); // Will return an array if an array was input
//     } catch (error) {
//         res.status(400).json({ message: error.message });
//     }
// });
// @route GET /api/academics/classes
// @desc Get all classes
// router.get('/many-classes', async (req, res) => {
//     try {
//         const classes = await Class.find()
//             // .populate('homeroomTeacher', 'name')
//             .populate('subjectsSchedule.subject', 'subjectName subjectCode')
//             // .populate('subjectsSchedule.teacher', 'name');
//         res.json(classes);
//     } catch (error) {
//         res.status(500).json({ message: error.message });
//     }
// });

router.get('/many-classes', async (req, res) => {
    try {
        // Find all Class documents, but only select the 'className' field (and '_id' by default)
        const classes = await Class.find({}, 'className');
        
        // If you want *only* the className and explicitly exclude _id, you could use:
        // const classes = await Class.find({}, { className: 1, _id: 0 });

        // Note: The previous .populate() calls were removed as they are not needed
        // to return only the className and would fetch unnecessary data.

        res.json(classes);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


// @route PUT /api/academics/classes/:id/schedule
// @desc Update the subject-teacher schedule for a class (Admin only)
router.put('/classes/:id/schedule', async (req, res) => {
    try {
        const updatedClass = await Class.findByIdAndUpdate(
            req.params.id,
            { subjectsSchedule: req.body.subjectsSchedule },
            { new: true, runValidators: true }
        );
        if (!updatedClass) {
            return res.status(404).json({ message: 'Class not found' });
        }
        res.json(updatedClass);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});






router.post('/add-new-class', async (req, res) => {
    try {
        const { className, mandatorySubjects } = req.body;

        // Basic validation
        if (!className || !Array.isArray(mandatorySubjects)) {
            return res.status(400).json({ 
                message: 'Missing required fields: className and mandatorySubjects are required.' 
            });
        }

        // 1. Create a new Class document
        const newClass = new Class({
            className,
            // Assuming mandatorySubjects is an array of valid Subject ObjectIds from the client
            mandatorySubjects: mandatorySubjects 
        });

        // 2. Save the class to the database
        const savedClass = await newClass.save();

        // 3. Respond with the created class object
        res.status(201).json(savedClass);

    } catch (error) {
        // Handle MongoDB unique index error (e.g., if class already exists)
        if (error.code === 11000) {
            return res.status(409).json({ 
                message: 'A class with this name already exists.' 
            });
        }
        console.error('Error adding class:', error);
        res.status(500).json({ 
            message: 'Server error: Could not add the class.',
            error: error.message 
        });
    }
});
module.exports = router; 