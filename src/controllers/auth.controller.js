const User = require('../models/user.model');
const { errorResponse, validationError } = require('../utils/errorHandler');

const register = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Basic validation
    if (!email || !password) {
      return validationError(res, {
        email: 'Email is required',
        password: 'Password is required',
      });
    }

    // Check if user exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return errorResponse(res, 400, 'Email already in use');
    }

    // Create new user
    const user = await User.create({ email, password });
    
    // Generate token
    const token = User.generateToken(user);

    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
      },
      token,
    });
  } catch (error) {
    errorResponse(res, 500, 'Registration failed', error);
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Basic validation
    if (!email || !password) {
      return validationError(res, {
        email: 'Email is required',
        password: 'Password is required',
      });
    }

    // Find user
    const user = await User.findByEmail(email);
    if (!user) {
      return errorResponse(res, 401, 'Invalid credentials');
    }

    // Check password
    const isMatch = await User.comparePassword(password, user.password);
    if (!isMatch) {
      return errorResponse(res, 401, 'Invalid credentials');
    }

    // Generate token
    const token = User.generateToken(user);

    res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
      },
      token,
    });
  } catch (error) {
    errorResponse(res, 500, 'Login failed', error);
  }
};

const getProfile = async (req, res) => {
  try {
    res.status(200).json({
      user: {
        id: req.user.id,
        email: req.user.email,
      }
    });
  } catch (error) {
    errorResponse(res, 500, 'Failed to fetch profile', error);
  }
};

module.exports = {
  register,
  login,
  getProfile,
};