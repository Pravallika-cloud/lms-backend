const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const fs = require("fs");
const path = require("path");
const authRoutes = require('./routes/auth');
const borrowItemsLogRoute = require('./routes/borrowItemsLog'); 

dotenv.config();

// Ensure uploads folder exists (important for cloud)
const uploadDir = path.join(__dirname, "uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const app = express();


app.use(express.json());

// Add universal request logger (helps see if phone requests arrive)
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url} from IP: ${req.ip} | Body: ${JSON.stringify(req.body || 'empty')}`);
  next();
});

/* ------------------ ROUTES ------------------ */
app.use('/api/auth', authRoutes);
app.use('/api/borrow', borrowItemsLogRoute);
app.use('/uploads', express.static('uploads'));


// Add simple root test route (GET / - no auth/DB, just echoes back)
app.get('/', (req, res) => {
  res.json({ message: 'Server is alive and reachable!', timestamp: new Date().toISOString() });
});


/* ------------------ GLOBAL ERROR HANDLER (LAST) ------------------ */

/*app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    message: 'Something went wrong',
    error: err.message
  });
});*/

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);

  // Prevent double response
  if (res.headersSent) {
    return next(err);
  }

  res.status(500).json({
    message: 'Something went wrong',
    error: err.message
  });
});

/* ------------------ START SERVER ------------------ */
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');

    //const PORT = 5000;
    const PORT = process.env.PORT || 5000;
    const HOST = '0.0.0.0';

    app.listen(PORT, HOST, () =>
      console.log(`Server running on http://${HOST}:${PORT}`)
    );
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1); // 👈 important
  });


