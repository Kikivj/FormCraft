import { createClientId } from '../utils/clientIds';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

function normalizeForm(form) {
  if (!form) return form;
  const { _id, id, __v, ...data } = form;
  const fields = (data.fields || []).map((field) => ({
    ...field,
    clientId: field.clientId || createClientId(),
    optionIds: field.optionIds || (field.options || []).map(() => createClientId()),
  }));
  return { ...data, fields, id: id || (_id ? String(_id) : undefined) };
}

function editableForm(form) {
  const { name, description, status } = form;
  const fields = (form.fields || []).map(({ key, label, type, placeholder, defaultValue, required, options, minLength, maxLength, min, max }) => ({
    key, label, type, placeholder, defaultValue, required, options, minLength, maxLength, min, max,
  }));
  return { name, description, fields, status };
}

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      credentials: 'include',
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new Error('Could not reach the FormCraft API. Make sure the backend is running.');
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && !path.startsWith('/auth/')) {
      window.dispatchEvent(new Event('formcraft:unauthorized'));
    }
    const message = data.errors?.join(' ') || data.message || `Request failed (${response.status}).`;
    const error = new Error(message);
    error.fieldErrors = data.fieldErrors || {};
    error.status = response.status;
    throw error;
  }
  return data;
}

export const formsApi = {
  list: () => request('/forms'),
  async get(id) {
    const result = await request(`/forms/admin/${encodeURIComponent(id)}`);
    return { ...result, form: normalizeForm(result.form) };
  },
  async getPublic(id) {
    const result = await request(`/forms/${encodeURIComponent(id)}`);
    return { ...result, form: normalizeForm(result.form) };
  },
  async create(form) {
    const result = await request('/forms', { method: 'POST', body: JSON.stringify(editableForm(form)) });
    return { ...result, form: normalizeForm(result.form) };
  },
  async update(id, form) {
    const result = await request(`/forms/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(editableForm(form)) });
    return { ...result, form: normalizeForm(result.form) };
  },
  submit(id, responses) {
    return request(`/forms/${encodeURIComponent(id)}/submissions`, {
      method: 'POST',
      body: JSON.stringify({ responses }),
    });
  },
  listSubmissions(formId, page = 1, limit = 10) {
    const query = new URLSearchParams({ page: String(page), limit: String(limit) });
    return request(`/forms/${encodeURIComponent(formId)}/submissions?${query}`);
  },
  getSubmission(formId, submissionId) {
    return request(`/forms/${encodeURIComponent(formId)}/submissions/${encodeURIComponent(submissionId)}`);
  },
  deleteSubmission(formId, submissionId) {
    return request(`/forms/${encodeURIComponent(formId)}/submissions/${encodeURIComponent(submissionId)}`, { method: 'DELETE' });
  },
  remove: (id) => request(`/forms/${encodeURIComponent(id)}`, { method: 'DELETE' }),
};

export const authApi = {
  login: (credentials) => request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  me: () => request('/auth/me'),
};
