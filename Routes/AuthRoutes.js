const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const protect = require('../Middleware/authMiddleware');
const Payment = require('../Models/Payment'); // adjust path



// Assuming you have a config file or environment variables for the secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Import Models
const Student = require('../Models/Students');
const Teacher = require('../Models/Teachers');

// Helper function to generate JWT
const generateToken = (id, role) => {
    return jwt.sign({ id, role }, JWT_SECRET, { expiresIn: '1h' });
};

// @route POST /api/auth/student/login
// @desc Authenticate student & get token
router.post('/student/login', async (req, res) => {
    const { admissionNumber, password } = req.body;
    try {
        const student = await Student.findOne({ admissionNumber }).select('+password');
        if (!student || !(await bcrypt.compare(password, student.password))) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = generateToken(student._id, 'student');
        res.json({ token, role: 'student', user: { id: student._id, name: student.name } });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route POST /api/auth/teacher/login
// @desc Authenticate teacher & get token
router.post('/teacher/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const teacher = await Teacher.findOne({ email }).select('+password');
        if (!teacher || !(await bcrypt.compare(password, teacher.password))) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = generateToken(teacher._id, 'teacher');
        res.json({ token, role: 'teacher', user: { id: teacher._id, name: teacher.name } });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route GET /api/auth/me
// @desc Get authenticated user profile (Requires middleware)
// NOTE: You would need a 'protect' middleware to decode the token before this.
router.get('/me', protect, async (req, res) => {
    try {
        let user;

        if (req.user.role === 'student') {
            user = await Student.findById(req.user.id)
                .select('-password -__v')
                .populate('currentClass', 'className gradeLevel academicYear')
                .populate('paymentHistory', 'amount status date reference');
        } else if (req.user.role === 'teacher') {
            user = await Teacher.findById(req.user.id)
                .select('-password -__v')
                .populate('assignedSubjects', 'subjectName'); // ✅ fixed
        }

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Format response without Mongo _id
        const response = {
            message: `Welcome to your ${req.user.role} dashboard`,
            role: req.user.role,
            user: {
                ...(req.user.role === 'teacher'
                    ? {
                        staffId: user.staffId,
                        name: user.name,
                        email: user.email,
                        phone: user.phone,
                        hireDate: user.hireDate,
                        specialization: user.specialization,
                        assignedSubjects: user.assignedSubjects.map(sub => sub.subjectName), // plain list
                        createdAt: user.createdAt,
                        updatedAt: user.updatedAt,
                    }
                    : {
                        admissionNumber: user.admissionNumber,
                        name: user.name,
                        dateOfBirth: user.dateOfBirth,
                        gender: user.gender,
                        currentClass: user.currentClass
                            ? {
                                className: user.currentClass.className,
                                gradeLevel: user.currentClass.gradeLevel,
                                academicYear: user.currentClass.academicYear,
                            }
                            : null,
                        contact: user.contact,
                        paymentStatus: user.paymentStatus,
                        paymentHistory: user.paymentHistory.map(p => ({
                            amount: p.amount,
                            status: p.status,
                            date: p.date,
                            reference: p.reference,
                        })),
                        createdAt: user.createdAt,
                        updatedAt: user.updatedAt,
                    }),
            },
        };

        res.json(response);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route POST /api/auth/logout
// @desc Placeholder for logout (Client should just delete the token)
router.post('/logout', (req, res) => {
    res.json({ message: 'Logout successful (token should be deleted on client side)' });
});

module.exports = router;