const mongoose = require('mongoose');

const labSchema = new mongoose.Schema({
  name: { type: String, required: true }
});

module.exports = mongoose.model('Lab', labSchema);