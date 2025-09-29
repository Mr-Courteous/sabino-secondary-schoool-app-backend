const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Counter = require('./Count'); // Import counter model

const TeacherSchema = new mongoose.Schema({
    staffId: {
        type: String,
        unique: true,
        trim: true
    },
    name: {
        first: { type: String, required: true, trim: true },
        last: { type: String, required: true, trim: true }
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/.+@.+\..+/, 'Please enter a valid email address']
    },
    phone: { type: String, trim: true },
    hireDate: { type: Date, default: Date.now },
    specialization: { type: String, trim: true },
    password: {
        type: String,
        required: [true, 'Password is required'],
        select: false
    },
    assignedSubjects: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subject'
    }]
}, {
    timestamps: true
});

// Auto-generate staffId using counter
TeacherSchema.pre('save', async function(next) {
    if (this.staffId) return next(); // Skip if already set

    try {
        const counter = await Counter.findOneAndUpdate(
            { name: 'teacher' },                 // identify teacher counter
            { $inc: { seq: 1 } },                // increment sequence
            { new: true, upsert: true }          // create if not exist
        );

        const nextNumber = counter.seq.toString().padStart(4, '0'); // 0001, 0002
        this.staffId = `TCH-${nextNumber}`;
        next();
    } catch (error) {
        next(error);
    }
});

// Password hashing
TeacherSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

module.exports = mongoose.model('Teacher', TeacherSchema);
