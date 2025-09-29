const mongoose = require('mongoose');
const bcrypt = require('bcryptjs'); // For password hashing

const StudentSchema = new mongoose.Schema({
    admissionNumber: { // Use admission number as a key identifier
        type: String,
        unique: true,
        required: [true, 'Admission number is required'],
        trim: true
    },
    name: {
        first: { type: String, required: true, trim: true },
        last: { type: String, required: true, trim: true }
    },
    dateOfBirth: {
        type: Date,
        required: [true, 'Date of birth is required']
    },
    gender: {
        type: String,
        enum: ['Male', 'Female', 'Other'],
        required: true
    },
    currentClass: { // Reference to the class the student is currently in
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Class',
        required: [true, 'Current class is required']
    },
    contact: {
        phoneNumber: { type: String, required: true, trim: true, unique: true },
        email: { type: String, required: true, unique: true, lowercase: true, trim: true, match: [/.+@.+\..+/, 'Please enter a valid email address'] },
        address: { type: String, required: true, trim: true },
        emergency: {
            name: { type: String, required: true },
            phone: { type: String, required: true }
        }
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        select: false // Do not return password by default in queries
    },
    // Payment tracking (Denormalized/Embedded)
    paymentStatus: {
        type: String,
        enum: ['paid', 'unpaid', 'partial'],
        default: 'unpaid'
    },
    paymentHistory: [{ // Array to store references to detailed payment records
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Payment'
    }]
}, {
    timestamps: true
});

// **Pre-save hook for password hashing**
StudentSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

module.exports = mongoose.model('Student', StudentSchema);