const Joi = require('joi');

// Birth data validation schema
const birthDataSchema = Joi.object({
    name: Joi.string().required().max(255).messages({
        'string.empty': 'Name is required',
        'string.max': 'Name must not exceed 255 characters'
    }),
    day: Joi.number().integer().min(1).max(31).required().messages({
        'number.base': 'Day must be a number',
        'number.integer': 'Day must be an integer',
        'number.min': 'Day must be between 1 and 31',
        'number.max': 'Day must be between 1 and 31',
        'any.required': 'Day is required'
    }),
    month: Joi.number().integer().min(1).max(12).required().messages({
        'number.base': 'Month must be a number',
        'number.integer': 'Month must be an integer',
        'number.min': 'Month must be between 1 and 12',
        'number.max': 'Month must be between 1 and 12',
        'any.required': 'Month is required'
    }),
    year: Joi.number().integer().min(1900).max(2100).required().messages({
        'number.base': 'Year must be a number',
        'number.integer': 'Year must be an integer',
        'number.min': 'Year must be between 1900 and 2100',
        'number.max': 'Year must be between 1900 and 2100',
        'any.required': 'Year is required'
    }),
    hour: Joi.number().integer().min(0).max(23).required().messages({
        'number.base': 'Hour must be a number',
        'number.integer': 'Hour must be an integer',
        'number.min': 'Hour must be between 0 and 23',
        'number.max': 'Hour must be between 0 and 23',
        'any.required': 'Hour is required'
    }),
    minute: Joi.number().integer().min(0).max(59).required().messages({
        'number.base': 'Minute must be a number',
        'number.integer': 'Minute must be an integer',
        'number.min': 'Minute must be between 0 and 59',
        'number.max': 'Minute must be between 0 and 59',
        'any.required': 'Minute is required'
    }),
    country: Joi.string().required().max(255).messages({
        'string.empty': 'Country is required',
        'string.max': 'Country must not exceed 255 characters'
    }),
    city: Joi.string().required().max(255).messages({
        'string.empty': 'City is required',
        'string.max': 'City must not exceed 255 characters'
    }),
    timezone_utc: Joi.boolean().default(false).messages({
        'boolean.base': 'Timezone UTC must be a boolean value'
    })
});

// Validation middleware
const validateBirthData = (req, res, next) => {
    const { error, value } = birthDataSchema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true
    });

    if (error) {
        const errors = {};
        error.details.forEach(detail => {
            const field = detail.path.join('.');
            if (!errors[field]) {
                errors[field] = [];
            }
            errors[field].push(detail.message);
        });

        return res.status(422).json({
            success: false,
            message: 'Validation failed',
            errors: errors
        });
    }

    req.body = value;
    next();
};

// Query parameters validation for GET requests
const validateQueryParams = (req, res, next) => {
    const { error, value } = birthDataSchema.validate(req.query, {
        abortEarly: false,
        stripUnknown: true,
        convert: true
    });

    if (error) {
        const errors = {};
        error.details.forEach(detail => {
            const field = detail.path.join('.');
            if (!errors[field]) {
                errors[field] = [];
            }
            errors[field].push(detail.message);
        });

        return res.status(422).json({
            success: false,
            message: 'Validation failed',
            errors: errors
        });
    }

    req.query = value;
    next();
};

module.exports = {
    validateBirthData,
    validateQueryParams,
    birthDataSchema
};
