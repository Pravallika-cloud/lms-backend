const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const BorrowItemsLog = require('../models/BorrowItemsLog');
const Lab = require('../models/Lab');

// Setup storage for uploaded files
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    //cb(null, 'uploads/');
cb(null, path.join(__dirname, "../uploads"));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// -------------------
// 📦 POST /api/borrow  (Submit Borrow Log)
// -------------------
router.post('/', upload.array('images'), async (req, res) => {
  try {
    console.log("Incoming body:", req.body);
    console.log("Incoming files:", req.files);

    const {
      labId,
      studentId,
      studentName,
      course,
      studentEmail,
      borrowDate,
      items
    } = req.body;

    if (!labId || !studentId || !studentName || !course || !studentEmail || !borrowDate || !items) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    let parsedItems;
    try {
      parsedItems = JSON.parse(items);
    } catch (parseErr) {
      return res.status(400).json({ message: "Invalid JSON in items field" });
    }

   // 🔐 BORROW VALIDATION: quantity must be >= 1
if (!Array.isArray(parsedItems) || parsedItems.length === 0) {
  return res.status(400).json({ message: "At least one item is required" });
}

if (parsedItems.some(item => item.quantity < 1)) {
  return res.status(400).json({
    message: "Borrow quantity must be at least 1"
  });
}	

// 🔐 BORROW VALIDATION: prevent duplicate item names
const names = parsedItems.map(i => i.itemName.trim().toLowerCase());

if (new Set(names).size !== names.length) {
  return res.status(400).json({
    message: "Duplicate item names are not allowed"
  });
}



   // const imagePaths = req.files && req.files.length > 0
   //   ? req.files.map(file => file.path)
   //   : [];

const imagePaths = req.files && req.files.length > 0
  ? req.files.map(file => {
      const cleanPath = file.path.replace(/\\/g, '/');
      return cleanPath;
    })
  : [];

    const newLog = new BorrowItemsLog({
      labId,
      studentId,
      studentName,
      course,
      studentEmail,
      borrowDate,
      items: parsedItems,
      images: imagePaths
    });

    await newLog.save();

    res.status(201).json({ message: 'Borrow log created successfully' });

  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});


// -------------------
// 📦 PUT /api/borrow/return/:logId  (Return Items)
// -------------------
router.put(
  '/return/:logId',
  upload.array('images'),
  async (req, res) => {
    try {
      const { logId } = req.params;

      // 1️⃣ Parse payload JSON
      if (!req.body.payload) {
        return res.status(400).json({ message: "Payload is required" });
      }

      let parsedPayload;
      try {
        parsedPayload = JSON.parse(req.body.payload);
      } catch (err) {
        return res.status(400).json({ message: "Invalid payload JSON" });
      }

      const returnedItems = parsedPayload.returnedItems;
      const remarks = req.body.remarks || "";

	// ✅ ADD VALIDATION 
	if (!returnedItems) {
  return res.status(400).json({
    message: "returnedItems field is missing"
  });
}

      if (!Array.isArray(returnedItems) || returnedItems.length === 0) {
        return res.status(400).json({
          message: "At least one returned item is required"
        });
      }

      if (returnedItems.some(item => item.quantity <= 0)) {
        return res.status(400).json({
          message: "Returned quantity must be greater than 0"
        });
      }
    
      // 2️⃣ Fetch borrow log
      const borrowLog = await BorrowItemsLog.findById(logId).populate('labId');

      if (!borrowLog) {
        return res.status(404).json({ message: "Borrow log not found" });
      }

      // 3️⃣ Update item quantities
      returnedItems.forEach(returned => {
        const item = borrowLog.items.id(returned._id);

        if (!item) {
          throw new Error(`Item not found: ${returned._id}`);
        }

   // 🔐 RETURN VALIDATIONS
          if (returned.quantity > item.quantity) {
          throw new Error("Returned quantity exceeds borrowed quantity");
        }

// subtract returned quantity
        item.quantity -= returned.quantity;
      });
// 🔥 REMOVE fully returned items
borrowLog.items = borrowLog.items.filter(item => item.quantity > 0);

      // 4️⃣ Determine status
      const allReturned = borrowLog.items.length === 0;
borrowLog.status = allReturned ? "RETURNED" : "PARTIAL_RETURN";
      borrowLog.returnDate = new Date();

      // 5️⃣ Save images
   const imagePaths = req.files && req.files.length > 0
  ? req.files.map(file => file.path.replace(/\\/g, '/'))
  : [];

borrowLog.images.push(...imagePaths);
      // 6️⃣ Save remarks
      borrowLog.remarks = remarks;

      await borrowLog.save();

      res.status(200).json({
        message: "Items returned successfully ✅",
        data: borrowLog
      });

    } catch (error) {
      console.error("Error returning items:", error);
      res.status(400).json({
        message: error.message
        });
    }
  }
);

// -------------------
// 📦 GET /api/borrow  (Fetch ALL Borrow Logs - ViewAllItems)
// -------------------
router.get('/', async (req, res) => {
  try {
    const logs = await BorrowItemsLog.find({
      status: { $ne: 'RETURNED' }   // show active borrows only
    })
      .populate('labId')
      .sort({ createdAt: -1 });

    const formatted = logs.map(log => ({
      logId: log._id,
      studentId: log.studentId,
      studentName: log.studentName,
      studentEmail: log.studentEmail,
      course: log.course,
      labName: log.labId?.name || '',
      borrowDate: log.borrowDate,
      status: log.status,
      items: log.items,
      images: log.images
    }));

    res.status(200).json(formatted);

  } catch (error) {
    console.error('Error fetching all borrow logs:', error);
    res.status(500).json({
      message: 'Failed to fetch borrow logs',
      error: error.message
    });
  }
});

// -------------------
// 📦 GET /api/borrow/:studentId  (Fetch Borrowed Items by Student ID)
// -------------------
router.get('/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;

    const borrowedItems = await BorrowItemsLog.find({
  studentId: studentId,
  status: { $ne: 'RETURNED' }
}).populate('labId');

//res.status(200).json(borrowedItems);
    if (!borrowedItems || borrowedItems.length === 0) {
      return res.status(404).json({ message: 'No borrowed items found for this student.' });
    }

    return res.status(200).json(borrowedItems);
  } catch (error) {
    console.error('Error fetching borrowed items:', error);
    return res.status(500).json({ message: 'Internal server error.',error: error.message,
    stack: error.stack });
  }
});


module.exports = router;
