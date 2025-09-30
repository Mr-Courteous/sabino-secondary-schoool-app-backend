const mongoose = require('mongoose');

const ClassSchema = new mongoose.Schema({
    className: { type: String, required: true, unique: true },
    // **THIS IS THE KEY:** Array of Subject IDs mandatory for this class
    mandatorySubjects: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Subject' 
    }]
});
module.exports = mongoose.model('Class', ClassSchema);