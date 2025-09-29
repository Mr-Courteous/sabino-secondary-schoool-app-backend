const mongoose = require('mongoose');

const ReportCardSchema = new mongoose.Schema({
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student',
        required: true,
        index: true
    },
    class: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Class', // The class the student was in when the report was issued
        required: true
    },
    academicYear: { type: String, required: true },
    term: {
        type: String,
        enum: ['1st Term', '2nd Term', '3rd Term'],
        required: true
    },
    dateIssued: { type: Date, default: Date.now },
    subjectsReport: [ // Array of embedded subject results (the actual report card content)
        {
            subject: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Subject',
                required: true
            },
            finalScore: {
                type: Number, // Computed final percentage score (e.g., 75)
                required: true
            },
            gradeLetter: { // e.g., 'A', 'B', 'C'
                type: String
            },
            teacherComment: { type: String }
        }
    ],
    classTeacherComment: { type: String },
    principalComment: { type: String }
}, {
    timestamps: true
});

module.exports = mongoose.model('ReportCard', ReportCardSchema);