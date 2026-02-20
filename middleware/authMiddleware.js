const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
  try {
    // Get token from header
    const authHeader = req.header('Authorization');

    if (!authHeader) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    // Format: Bearer token
    const token = authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'Invalid token format' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach user to request
    req.user = decoded;

    next();

  } catch (err) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};