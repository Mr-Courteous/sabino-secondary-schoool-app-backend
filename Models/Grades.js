const mongoose = require('mongoose');

const GradeSchema = new mongoose.Schema({
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student',
        required: true,
        index: true
    },
    subject: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subject',
        required: true,
        index: true
    },
    class: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Class',
        required: true
    },
    academicYear: { type: String, required: true },
    term: {
        type: String,
        enum: ['1st Term', '2nd Term', '3rd Term'],
        required: true
    },
    
    // --- COMPOSITE GRADING FIELDS ---
    
    // The total CA score (e.g., sum of quizzes, assignments, tests)
    // The maximum possible CA score in a term is usually standardized (e.g., 40 marks).
    caScore: {
        type: Number,
        default: 0,
        min: 0
    },
    // The maximum possible score for the CA component
    maxCaScore: {
        type: Number,
        default: 40, // Assuming CA is out of 40
        min: 0
    },

    // The single Terminal Exam score
    // The maximum possible Exam score is usually standardized (e.g., 60 marks).
    examScore: {
        type: Number,
        default: 0,
        min: 0
    },
    // The maximum possible score for the Exam component
    maxExamScore: {
        type: Number,
        default: 60, // Assuming Exam is out of 60
        min: 0
    },
    // ---------------------------------
    
    recordedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Teacher',
        required: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Grade', GradeSchema);