const mongoose = require('mongoose');

const BorrowItemsLogSchema = new mongoose.Schema({
userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  labId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lab', required: true },
  studentId: { type: String, required: true },
  studentName: { type: String, required: true },
  course: { type: String, required: true },
  studentEmail: { type: String, required: true },

// ✅ Strict validation: ensure this is a real Date object
 /*  borrowDate: { 
    type: Date, 
    required: true,
    set: (val) => {
      // Try to convert strings like "16/10/25" or "16-10-2025" to valid Date
      if (typeof val === 'string') {
        const parts = val.split(/[\/\-]/); // supports both "/" and "-"
        if (parts.length === 3) {
          const [day, month, year] = parts.map(Number);
          const fullYear = year < 100 ? 2000 + year : year; // handle short year like "25"
          return new Date(fullYear, month - 1, day);
        }
      }
      return val; // if it's already a Date, keep it as is
    }
  }, */

 borrowDate: {
    type: Date,
    default: Date.now
  },

returnDate: {
    type: Date,
},

status: {
  type: String,
  enum: ['BORROWED', 'PARTIAL_RETURN', 'RETURNED'],
  default: 'BORROWED'
},

 items: [
  {
    itemName: {
      type: String,
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 0
    }
  }
],
  images: [String], // URLs or file paths to uploaded item images
//borrowImages: [String],   // ✅ images uploaded while borrowing
//images: [String],         // ✅ images uploaded while returning

/*images: [
  {
    path: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['BORROW', 'RETURN'],
      required: true
    }
  }
],*/

 remarks: {
    type: String
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('BorrowItemsLog', BorrowItemsLogSchema);