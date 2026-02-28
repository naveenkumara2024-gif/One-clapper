export const validate = (schema) => (req, res, next) => {
  try {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors,
      });
    }
    req.validatedBody = result.data;
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Validation error',
      error: error.message,
    });
  }
};

export const validateParams = (schema) => (req, res, next) => {
  try {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      const errors = result.error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      return res.status(400).json({
        success: false,
        message: 'Invalid parameters',
        errors,
      });
    }
    req.validatedParams = result.data;
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Parameter validation error',
      error: error.message,
    });
  }
};

export const validateQuery = (schema) => (req, res, next) => {
  try {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const errors = result.error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      return res.status(400).json({
        success: false,
        message: 'Invalid query parameters',
        errors,
      });
    }
    req.validatedQuery = result.data;
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Query validation error',
      error: error.message,
    });
  }
};
