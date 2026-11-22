export const validateRequest = (schema) => {
  return async (req, res, next) => {
    try {
      const validated = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      if (validated.body) req.body = validated.body;
      if (validated.query) req.query = validated.query;
      if (validated.params) req.params = validated.params;

      next();
    } catch (err) {
      if (err.errors) {
        const errors = err.errors.map((e) => ({
          field: e.path.slice(1).join('.'),
          message: e.message,
        }));
        return res.status(400).json({
          success: false,
          message: errors[0]?.message || 'Validation failed',
          code: 'VALIDATION_ERROR',
          errors,
        });
      }
      next(err);
    }
  };
};
