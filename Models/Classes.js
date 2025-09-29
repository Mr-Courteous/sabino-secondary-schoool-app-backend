const mongoose = require('mongoose');

const ClassSchema = new mongoose.Schema({
    className: { // e.g., 'SS 1 Arts' or 'JSS 2 A'
        type: String,
        unique: true,
        required: [true, 'Class name is required'],
        trim: true
    },
    gradeLevel: { // e.g., 'SS 1', 'JSS 2'
        type: String,
        required: true
    },
    academicYear: {
        type: String, // e.g., '2025/2026'
        required: true
    },
    // homeroomTeacher: {
    //     type: mongoose.Schema.Types.ObjectId,
    //     ref: 'Teacher',
    //     default: null
    // },
    subjectsSchedule: [ // Embedded schedule for this class
        {
            subject: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Subject',
                required: true
            },
            // teacher: { // The teacher assigned to teach THIS subject for THIS class
            //     type: mongoose.Schema.Types.ObjectId,
            //     ref: 'Teacher',
            //     required: true
            // }
        }
    ]
}, {
    timestamps: true
});

module.exports = mongoose.model('Class', ClassSchema);