const mongoose = require('mongoose');

// --- 1. SubjectGrade Sub-Schema ---
// This defines the structure for a single subject's score within the grades array.
const SubjectGradeSchema = new mongoose.Schema({
    // Store the Subject's ObjectId (Subject model assumed to exist)
    subject: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subject',
        required: true
    },
    
    // Total CA score (e.g., out of 40)
    caScore: {
        type: Number,
        default: 0,
        min: 0
    },
    // Total Exam score (e.g., out of 60)
    examScore: {
        type: Number,
        default: 0,
        min: 0
    }
    // Note: Total Score (caScore + examScore) should be a virtual field or calculated on retrieval.
}, { _id: false }); // Prevents an unnecessary _id for every subject in the array

// --- 2. TermResult Main Schema ---
// This document represents ONE student's complete report card for ONE term/year.
const TermResultSchema = new mongoose.Schema({
    // Student ID (Student model assumed to exist)
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student',
        required: true,
        index: true
    },
    
    // Class ID (Class model assumed to exist)
    class: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Class',
        required: true
    },
    
    academicYear: { 
        type: String, 
        required: true 
    },
    
    term: {
        type: String,
        enum: ['1st Term', '2nd Term', '3rd Term'],
        required: true
    },
    
    // The core change: an array of all subject grades for this term
    grades: {
        type: [SubjectGradeSchema],
        default: []
    },

    recordedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Teacher',
        required: true
    }
}, {
    timestamps: true
});

// Enforce uniqueness: A student can only have ONE report card per Class, Year, and Term.
TermResultSchema.index({
    student: 1,
    class: 1,
    academicYear: 1,
    term: 1
}, {
    unique: true
});

module.exports = mongoose.model('TermResult', TermResultSchema);