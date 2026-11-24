const { validationResult } = require('express-validator');

/**
 * Express middleware that collects express-validator errors and returns a
 * consistent 400 JSON payload with a top-level `message` for frontend alerts.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const list = errors.array();
    return res.status(400).json({
      success: false,
      message: list[0]?.msg || 'Validation failed',
      errors: list,
    });
  }
  next();
};

module.exports = validate;
