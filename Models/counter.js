// models/Counter.js
const mongoose = require('mongoose');

const CounterSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true }, // e.g. "teacher"
  seq: { type: Number, default: 0 }
});

module.exports = mongoose.model('Counter', CounterSchema);
