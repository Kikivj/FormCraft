const { supportedFieldTypes } = require('../models/Form');

const formProperties = new Set(['name', 'description', 'fields', 'status']);
const fieldProperties = new Set([
  'key',
  'label',
  'type',
  'placeholder',
  'defaultValue',
  'required',
  'options',
  'minLength',
  'maxLength',
  'min',
  'max',
]);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function validateFormPayload(payload, { partial = false } = {}) {
  const errors = [];
  if (!isPlainObject(payload)) return ['Request body must be a JSON object.'];

  for (const property of Object.keys(payload)) {
    if (!formProperties.has(property)) errors.push(`Unknown form property: ${property}.`);
  }

  if (!partial || Object.hasOwn(payload, 'name')) {
    if (typeof payload.name !== 'string' || !payload.name.trim()) {
      errors.push('name must be a non-empty string.');
    } else if (payload.name.trim().length > 120) {
      errors.push('name must be 120 characters or fewer.');
    }
  }

  if (Object.hasOwn(payload, 'description') && typeof payload.description !== 'string') {
    errors.push('description must be a string.');
  } else if (typeof payload.description === 'string' && payload.description.length > 2000) {
    errors.push('description must be 2000 characters or fewer.');
  }

  if (!partial || Object.hasOwn(payload, 'fields')) {
    if (!Array.isArray(payload.fields)) {
      errors.push('fields must be an array.');
    } else {
      const keys = new Set();
      payload.fields.forEach((field, index) => {
        const prefix = `fields[${index}]`;
        if (!isPlainObject(field)) {
          errors.push(`${prefix} must be an object.`);
          return;
        }

        for (const property of Object.keys(field)) {
          if (!fieldProperties.has(property)) errors.push(`${prefix} has unknown property: ${property}.`);
        }

        if (typeof field.key !== 'string' || !field.key.trim()) {
          errors.push(`${prefix}.key must be a non-empty string.`);
        } else if (keys.has(field.key.trim())) {
          errors.push(`${prefix}.key duplicates another field key.`);
        } else {
          keys.add(field.key.trim());
        }

        if (typeof field.label !== 'string' || !field.label.trim()) {
          errors.push(`${prefix}.label must be a non-empty string.`);
        }
        if (!supportedFieldTypes.includes(field.type)) {
          errors.push(`${prefix}.type must be one of: ${supportedFieldTypes.join(', ')}.`);
        }
        if (Object.hasOwn(field, 'placeholder') && typeof field.placeholder !== 'string') {
          errors.push(`${prefix}.placeholder must be a string.`);
        }
        if (Object.hasOwn(field, 'required') && typeof field.required !== 'boolean') {
          errors.push(`${prefix}.required must be a boolean.`);
        }
        if (Object.hasOwn(field, 'options') && (!Array.isArray(field.options) || field.options.some((option) => !isPlainObject(option) && typeof option !== 'string'))) {
          errors.push(`${prefix}.options must be an array of strings or objects.`);
        }

        for (const property of ['minLength', 'maxLength']) {
          if (Object.hasOwn(field, property) && (!Number.isInteger(field[property]) || field[property] < 0)) {
            errors.push(`${prefix}.${property} must be a non-negative integer.`);
          }
        }
        for (const property of ['min', 'max']) {
          if (Object.hasOwn(field, property) && (typeof field[property] !== 'number' || !Number.isFinite(field[property]))) {
            errors.push(`${prefix}.${property} must be a finite number.`);
          }
        }
        if (field.minLength !== undefined && field.maxLength !== undefined && field.minLength > field.maxLength) {
          errors.push(`${prefix}.minLength cannot exceed maxLength.`);
        }
        if (field.min !== undefined && field.max !== undefined && field.min > field.max) {
          errors.push(`${prefix}.min cannot exceed max.`);
        }
      });
    }
  }

  if (Object.hasOwn(payload, 'status') && !['draft', 'published'].includes(payload.status)) {
    errors.push('status must be either draft or published.');
  }

  if (partial && Object.keys(payload).length === 0) errors.push('Provide at least one form property to update.');
  return errors;
}

module.exports = { validateFormPayload };
