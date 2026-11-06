// Fields with `private: true` never leave the API.
const toJSON = (schema) => {
  const existingTransform = schema.options.toJSON?.transform;

  schema.set('toJSON', {
    ...schema.options.toJSON,
    transform(doc, ret, options) {
      Object.entries(schema.paths).forEach(([path, schemaType]) => {
        if (schemaType.options?.private) delete ret[path];
      });
      ret.id = ret._id?.toString();
      delete ret._id;
      delete ret.__v;
      return existingTransform ? existingTransform(doc, ret, options) : ret;
    },
  });
};

module.exports = toJSON;
