function validate(schema, payload) {
  const { value, error } = schema.validate(payload, {
    abortEarly: false,
    stripUnknown: true,
    convert: true,
  });

  if (!error) return value;

  const validationError = new Error('Validation failed');
  validationError.statusCode = 400;
  validationError.code = 'VALIDATION_ERROR';
  validationError.details = error.details.map((d) => d.message);
  throw validationError;
}

function validateRange({ min, max, minLabel = 'min', maxLabel = 'max' }) {
  if (min === undefined || max === undefined) return;
  if (Number(min) > Number(max)) {
    const error = new Error(`${minLabel} cannot be greater than ${maxLabel}`);
    error.statusCode = 400;
    error.code = 'INVALID_RANGE';
    throw error;
  }
}

module.exports = {
  validate,
  validateRange,
};
