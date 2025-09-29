const mongoose = require('mongoose');

const SubjectSchema = new mongoose.Schema({
    subjectName: {
        type: String,
        required: [true, 'Subject name is required'],
        unique: true, // Added unique constraint for subjectName since subjectCode was removed
        trim: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Subject', SubjectSchema);