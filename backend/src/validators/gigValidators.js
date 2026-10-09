/**
 * Gig input rules. Free text is trimmed, length-limited and escaped; ids and
 * query values are type-checked so objects cannot be smuggled into MongoDB
 * queries (NoSQL injection) (OWASP, 2025c).
 */

const { body, param, query } = require('express-validator');

const GIG_FIELDS = ['title', 'description', 'category', 'price', 'deliveryDays', 'isActive'];

const rules = {
  title: () => body('title').isString().withMessage('Title is required').bail().trim()
    .isLength({ min: 3, max: 100 }).withMessage('Title must be between 3 and 100 characters')
    .escape(),
  description: () => body('description').isString().withMessage('Description is required').bail().trim()
    .isLength({ min: 10, max: 2000 }).withMessage('Description must be between 10 and 2000 characters')
    .escape(),
  category: () => body('category').isString().withMessage('Category is required').bail().trim()
    .isLength({ min: 2, max: 50 }).withMessage('Category must be between 2 and 50 characters')
    .escape(),
  price: () => body('price').isFloat({ min: 1, max: 1000000 })
    .withMessage('Price must be a number between 1 and 1,000,000').toFloat(),
  deliveryDays: () => body('deliveryDays').isInt({ min: 1, max: 365 })
    .withMessage('Delivery days must be a whole number between 1 and 365').toInt(),
  isActive: () => body('isActive').isBoolean({ strict: true })
    .withMessage('isActive must be true or false'),
};

const createGigValidators = [
  rules.title(),
  rules.description(),
  rules.category(),
  rules.price(),
  rules.deliveryDays(),
];

// Every field is optional on update, but at least one must be supplied.
const updateGigValidators = [
  rules.title().optional(),
  rules.description().optional(),
  rules.category().optional(),
  rules.price().optional(),
  rules.deliveryDays().optional(),
  rules.isActive().optional(),
  body().custom((value, { req }) => {
    if (!GIG_FIELDS.some((field) => req.body[field] !== undefined)) {
      throw new Error('At least one field must be provided');
    }
    return true;
  }),
];

const gigIdValidator = [param('id').isMongoId().withMessage('Invalid gig id')];

const listGigValidators = [
  query('category').optional().isString().withMessage('Invalid category').bail().trim().isLength({ max: 50 }).escape(),
  query('search').optional().isString().withMessage('Invalid search').bail().trim().isLength({ max: 100 }).escape(),
  query('page').optional().isInt({ min: 1, max: 10000 }).withMessage('Invalid page').toInt(),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Invalid limit').toInt(),
];

module.exports = {
  GIG_FIELDS,
  createGigValidators,
  updateGigValidators,
  gigIdValidator,
  listGigValidators,
};
