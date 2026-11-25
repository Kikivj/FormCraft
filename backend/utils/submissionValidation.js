const supportedFieldTypes = new Set(['TEXT', 'EMAIL', 'NUMBER', 'PHONE', 'TEXTAREA', 'DATE', 'SELECT', 'RADIO', 'CHECKBOX']);

function isPlainObject(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function optionValue(option) {
  if (typeof option === 'string') return option;
  if (!isPlainObject(option)) return '';
  return String(option.value ?? option.label ?? '');
}

function isEmpty(value) {
  return value === undefined || value === null || value === '' || (typeof value === 'string' && value.trim() === '') || (Array.isArray(value) && value.length === 0);
}

function validateSubmission(form, payload) {
  const errors = [];
  const fieldErrors = Object.create(null);
  const sanitized = Object.create(null);
  const addError = (key, message) => {
    const label = form.fields.find((field) => field.key === key)?.label || key;
    errors.push(`${label}: ${message}`);
    fieldErrors[key] = message;
  };

  if (!isPlainObject(payload)) return { errors: ['Request body must be a JSON object.'], fieldErrors, responses: sanitized };
  for (const property of Object.keys(payload)) {
    if (property !== 'responses') errors.push(`Unknown request property: ${property}.`);
  }
  if (!isPlainObject(payload.responses)) {
    errors.push('responses must be an object containing submitted answers.');
    return { errors, fieldErrors, responses: sanitized };
  }

  const fieldsByKey = new Map((form.fields || []).map((field) => [field.key, field]));
  for (const key of Object.keys(payload.responses)) {
    if (!fieldsByKey.has(key)) addError(key, 'This field is not part of this form.');
  }

  for (const field of form.fields || []) {
    if (!supportedFieldTypes.has(field.type)) {
      addError(field.key, 'This field has an unsupported configuration.');
      continue;
    }

    const supplied = Object.hasOwn(payload.responses, field.key);
    const raw = supplied ? payload.responses[field.key] : undefined;
    const emptySingleCheckbox = field.type === 'CHECKBOX' && !(field.options || []).length && raw === false;
    if (!supplied || isEmpty(raw) || emptySingleCheckbox) {
      if (field.required) addError(field.key, 'This field is required.');
      else if (supplied) {
        sanitized[field.key] = field.type === 'CHECKBOX'
          ? (field.options || []).length ? [] : false
          : '';
      }
      continue;
    }

    const choiceOptions = (field.options || []).map(optionValue);
    let value = raw;
    let message = '';

    if (field.type === 'TEXT' || field.type === 'TEXTAREA' || field.type === 'EMAIL' || field.type === 'PHONE' || field.type === 'DATE') {
      if (typeof raw !== 'string') message = 'Enter a text value.';
      else {
        value = raw.trim();
        if (field.minLength != null && value.length < field.minLength) message = `Enter at least ${field.minLength} characters.`;
        if (!message && field.maxLength != null && value.length > field.maxLength) message = `Enter no more than ${field.maxLength} characters.`;
        if (!message && field.type === 'EMAIL' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) message = 'Enter a valid email address.';
        if (!message && field.type === 'PHONE') {
          const digits = value.replace(/\D/g, '');
          if (!/^[+\d().\-\s]+$/.test(value) || digits.length < 7 || digits.length > 15) message = 'Enter a valid phone number with 7 to 15 digits.';
        }
        if (!message && field.type === 'DATE') {
          const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00.000Z`) : null;
          if (!date || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) message = 'Enter a valid date.';
        }
      }
    } else if (field.type === 'NUMBER') {
      if (typeof raw !== 'number' && typeof raw !== 'string') message = 'Enter a valid number.';
      else if (typeof raw === 'string' && raw.trim() === '') value = '';
      else {
        const numericText = typeof raw === 'string' ? raw.trim() : String(raw);
        if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(numericText)) message = 'Enter a valid number.';
        value = message ? raw : Number(numericText);
        if (!message && !Number.isFinite(value)) message = 'Enter a valid number.';
        else if (field.min != null && value < field.min) message = `Enter a number of at least ${field.min}.`;
        else if (field.max != null && value > field.max) message = `Enter a number no greater than ${field.max}.`;
      }
    } else if (field.type === 'SELECT' || field.type === 'RADIO') {
      if (typeof raw !== 'string') message = 'Choose one of the available options.';
      else {
        value = raw;
        if (!choiceOptions.includes(value)) message = 'Choose one of the available options.';
      }
    } else if (field.type === 'CHECKBOX') {
      if (choiceOptions.length) {
        if (!Array.isArray(raw) || raw.some((choice) => typeof choice !== 'string' || !choiceOptions.includes(choice)) || new Set(raw).size !== raw.length) {
          message = 'Select only the available options, without duplicates.';
        } else value = [...raw];
      } else if (typeof raw !== 'boolean') message = 'This checkbox value must be true or false.';
      else value = raw;
    }

    if (message) addError(field.key, message);
    else sanitized[field.key] = value;
  }

  return { errors, fieldErrors, responses: sanitized };
}

module.exports = { validateSubmission };
