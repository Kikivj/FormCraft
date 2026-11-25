'use strict';

const { test, mock } = require('node:test');
const assert = require('node:assert/strict');
const Form = require('../models/Form');
const Submission = require('../models/Submission');
const formRoutes = require('../routes/formRoutes');
const { requireAdmin } = require('../middleware/requireAdmin');
const {
  getPublicForm,
  deleteSubmission,
  listSubmissions,
} = require('../controllers/formController');

const formId = '507f1f77bcf86cd799439011';
const submissionId = '507f1f77bcf86cd799439022';

function response() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

function query(value, calls = {}) {
  return {
    select(selection) { calls.select = selection; return this; },
    sort(sort) { calls.sort = sort; return this; },
    skip(skip) { calls.skip = skip; return this; },
    limit(limit) { calls.limit = limit; return this; },
    lean() { return Promise.resolve(value); },
  };
}

function formLookup(name = 'Test form') {
  return query({ _id: formId, name });
}

test('public form retrieval only queries published forms and returns 404 for drafts', async (t) => {
  let requestedFilter;
  t.mock.method(Form, 'findOne', (filter) => {
    requestedFilter = filter;
    return query(null);
  });

  const res = response();
  await getPublicForm({ params: { id: formId } }, res);

  assert.deepEqual(requestedFilter, { _id: formId, status: 'published' });
  assert.equal(res.statusCode, 404);
  assert.deepEqual(res.body, { success: false, message: 'Published form not found.' });
});

test('public form retrieval returns a published form', async (t) => {
  const published = { _id: formId, name: 'Published form', status: 'published', fields: [] };
  t.mock.method(Form, 'findOne', (filter) => {
    assert.deepEqual(filter, { _id: formId, status: 'published' });
    return query(published);
  });

  const res = response();
  await getPublicForm({ params: { id: formId } }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.form, published);
});

test('delete submission route requires admin middleware', () => {
  const routeLayer = formRoutes.stack.find((layer) => layer.route?.path === '/:id/submissions/:submissionId');
  assert.ok(routeLayer, 'submission detail route should be registered');
  const deleteLayers = routeLayer.route.stack.filter((layer) => layer.method === 'delete');
  assert.equal(deleteLayers.length, 2);
  assert.equal(deleteLayers[0].handle, requireAdmin);
});

test('delete submission scopes deletion to both IDs and returns success', async (t) => {
  let deleteFilter;
  t.mock.method(Form, 'exists', async (filter) => {
    assert.deepEqual(filter, { _id: formId });
    return { _id: formId };
  });
  t.mock.method(Submission, 'findOneAndDelete', (filter) => {
    deleteFilter = filter;
    return query({ _id: submissionId });
  });

  const res = response();
  await deleteSubmission({ params: { id: formId, submissionId } }, res);

  assert.deepEqual(deleteFilter, { _id: submissionId, formId });
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.id, submissionId);
});

test('delete submission returns 404 when the submission does not belong to that form', async (t) => {
  let deleteFilter;
  t.mock.method(Form, 'exists', async () => ({ _id: formId }));
  t.mock.method(Submission, 'findOneAndDelete', (filter) => {
    deleteFilter = filter;
    return query(null);
  });

  const res = response();
  await deleteSubmission({ params: { id: formId, submissionId } }, res);

  assert.deepEqual(deleteFilter, { _id: submissionId, formId });
  assert.equal(res.statusCode, 404);
  assert.equal(res.body.success, false);
});

test('submission pagination applies defaults and returns metadata', async (t) => {
  const calls = {};
  const records = [{ _id: submissionId }];
  t.mock.method(Form, 'findById', () => formLookup());
  t.mock.method(Submission, 'countDocuments', async (filter) => {
    assert.deepEqual(filter, { formId });
    return 1;
  });
  t.mock.method(Submission, 'find', (filter) => {
    assert.deepEqual(filter, { formId });
    return query(records, calls);
  });

  const res = response();
  await listSubmissions({ params: { id: formId }, query: {} }, res);

  assert.equal(calls.skip, 0);
  assert.equal(calls.limit, 10);
  assert.equal(res.statusCode, 200);
  assert.deepEqual({ total: res.body.total, page: res.body.page, limit: res.body.limit, totalPages: res.body.totalPages }, {
    total: 1, page: 1, limit: 10, totalPages: 1,
  });
  assert.deepEqual(res.body.submissions, records);
});

test('submission pagination parses positive integers and applies skip/limit', async (t) => {
  const calls = {};
  t.mock.method(Form, 'findById', () => formLookup());
  t.mock.method(Submission, 'countDocuments', async () => 25);
  t.mock.method(Submission, 'find', () => query([], calls));

  const res = response();
  await listSubmissions({ params: { id: formId }, query: { page: '2', limit: '10' } }, res);

  assert.equal(calls.skip, 10);
  assert.equal(calls.limit, 10);
  assert.equal(res.statusCode, 200);
  assert.deepEqual({ total: res.body.total, page: res.body.page, limit: res.body.limit, totalPages: res.body.totalPages }, {
    total: 25, page: 2, limit: 10, totalPages: 3,
  });
});

test('submission pagination rejects invalid page and limit values without querying submissions', async (t) => {
  for (const queryParams of [
    { page: '0' },
    { page: '-1' },
    { page: '1.5' },
    { limit: '0' },
    { limit: '101' },
  ]) {
    t.mock.restoreAll();
    let submissionsQueried = false;
    t.mock.method(Form, 'findById', () => formLookup());
    t.mock.method(Submission, 'countDocuments', async () => 0);
    t.mock.method(Submission, 'find', () => { submissionsQueried = true; return query([]); });
    const res = response();
    await listSubmissions({ params: { id: formId }, query: queryParams }, res);
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.success, false);
    assert.equal(submissionsQueried, false);
  }
});
