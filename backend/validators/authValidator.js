const { body } = require('express-validator');

/**
 * Returns express-validator rules for user registration.
 * @returns {import('express-validator').ValidationChain[]}
 */
const signupValidationRules = () => [
  body('name')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Name must be between 3 and 50 characters long'),

  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail({ gmail_remove_dots: false }),

  body('password')
    .trim()
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6, max: 64 })
    .withMessage('Password must be between 6 and 64 characters long')
    .matches(/\d/)
    .withMessage('Password must contain at least one number'),
];

/**
 * Returns express-validator rules for user login.
 * @returns {import('express-validator').ValidationChain[]}
 */
const loginValidationRules = () => [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail({ gmail_remove_dots: false }),

  body('password')
    .trim()
    .notEmpty()
    .withMessage('Password is required'),
];

module.exports = {
  signupValidationRules,
  loginValidationRules,
};
