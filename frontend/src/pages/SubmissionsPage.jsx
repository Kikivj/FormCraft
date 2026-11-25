import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Icon from '../components/Icon';
import { clearSelectedSubmission, deleteSubmission, fetchSubmission, fetchSubmissions } from '../redux/submissionsSlice';

const PAGE_SIZE = 10;

function idOf(form) {
  return form?._id || form?.id || '';
}

function displayAnswer(value) {
  if (Array.isArray(value)) return value.length ? value.map(displayAnswer).join(', ') : '—';
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function formatDate(value) {
  if (!value || Number.isNaN(new Date(value).getTime())) return '—';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export default function SubmissionsPage({ forms, formsStatus, initialFormId }) {
  const dispatch = useDispatch();
  const submissions = useSelector((state) => state.submissions);
  const [selectedFormId, setSelectedFormId] = useState(initialFormId || '');
  const [page, setPage] = useState(1);
  const [viewingId, setViewingId] = useState('');
  const [deleteCandidate, setDeleteCandidate] = useState(null);
  const [notice, setNotice] = useState('');
  const [noticeType, setNoticeType] = useState('success');
  const selectedForm = forms.find((form) => idOf(form) === selectedFormId);
  const fieldLabels = useMemo(() => new Map((selectedForm?.fields || []).map((field) => [field.key, field.label])), [selectedForm]);

  useEffect(() => {
    if (!selectedFormId && forms.length) setSelectedFormId(idOf(forms[0]));
  }, [forms, selectedFormId]);

  useEffect(() => {
    if (selectedFormId) dispatch(fetchSubmissions({ formId: selectedFormId, page, limit: PAGE_SIZE }));
  }, [dispatch, selectedFormId, page]);

  const openSubmission = (submissionId) => {
    setViewingId(submissionId);
    dispatch(fetchSubmission({ formId: selectedFormId, submissionId }));
  };

  const closeSubmission = () => {
    setViewingId('');
    dispatch(clearSelectedSubmission());
  };

  const confirmDelete = async () => {
    if (!deleteCandidate) return;
    try {
      await dispatch(deleteSubmission({ formId: selectedFormId, submissionId: deleteCandidate._id })).unwrap();
      setDeleteCandidate(null);
      setNoticeType('success');
      setNotice('Submission deleted.');
      if (submissions.items.length === 1 && page > 1) setPage((current) => current - 1);
      else dispatch(fetchSubmissions({ formId: selectedFormId, page, limit: PAGE_SIZE }));
    } catch (error) {
      setNoticeType('error');
      setNotice(error || 'The submission could not be deleted.');
    }
  };

  const records = submissions.items;
  const detail = submissions.selected;
  const detailLoading = submissions.detailStatus === 'loading';
  const detailFailed = submissions.detailStatus === 'failed';

  return <div className="page-stack submissions-page">
    <div className="page-title-row"><div><div className="eyebrow">WORKSPACE / RESPONSES</div><h1>Submissions</h1><p>Review responses received from your published forms.</p></div>
      {forms.length > 0 && <label className="submission-form-select"><span>FORM</span><select value={selectedFormId} onChange={(event) => { setSelectedFormId(event.target.value); setPage(1); setNotice(''); }} aria-label="Choose a form">{forms.map((form) => <option key={idOf(form)} value={idOf(form)}>{form.name}</option>)}</select></label>}
    </div>

    {!forms.length && formsStatus === 'loading' && <div className="loading-card"><span className="spinner" />Loading forms…</div>}
    {!forms.length && formsStatus === 'failed' && <div className="error-panel"><div><strong>Couldn’t load forms</strong><span>Return to the dashboard and retry loading the workspace.</span></div></div>}
    {!forms.length && formsStatus !== 'loading' && formsStatus !== 'failed' && <div className="empty-start-card"><h3>No forms available</h3><p>Create a form before reviewing submissions.</p></div>}

    {notice && <div className={`submission-notice ${noticeType === 'error' ? 'submission-notice-error' : ''}`} role={noticeType === 'error' ? 'alert' : 'status'}>{notice}</div>}
    {selectedFormId && submissions.status === 'loading' && <div className="loading-card"><span className="spinner" />Loading submissions…</div>}
    {selectedFormId && submissions.status === 'failed' && <div className="error-panel"><div><strong>Couldn’t load submissions</strong><span>{submissions.error}</span></div><button className="button button-secondary" onClick={() => dispatch(fetchSubmissions({ formId: selectedFormId, page, limit: PAGE_SIZE }))}>Try again</button></div>}
    {selectedFormId && submissions.status === 'succeeded' && records.length === 0 && <section className="empty-start-card submissions-empty"><div className="empty-illustration"><div><Icon name="list" size={24} /></div></div><h3>No submissions yet</h3><p>Responses for {selectedForm?.name || submissions.form?.name || 'this form'} will appear here.</p></section>}

    {selectedFormId && submissions.status === 'succeeded' && records.length > 0 && <section className="list-card submissions-card">
      <div className="list-toolbar"><div><h2>Responses <span className="count-pill">{submissions.total}</span></h2><p>{submissions.total} total submission{submissions.total === 1 ? '' : 's'} for {selectedForm?.name || submissions.form?.name}.</p></div></div>
      <div className="table-scroll"><table className="forms-table submissions-table"><thead><tr><th>SUBMITTED</th><th>RESPONSE SUMMARY</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>
        {records.map((submission) => {
          const entries = Object.entries(submission.responses || {});
          const summary = entries.slice(0, 2).map(([key, value]) => `${fieldLabels.get(key) || key}: ${displayAnswer(value)}`).join(' · ');
          return <tr key={submission._id}><td><span className="date-cell">{formatDate(submission.submittedAt || submission.createdAt)}</span></td><td><span className="submission-summary" title={summary}>{summary || 'No answers'}</span>{entries.length > 2 && <small className="submission-more">+{entries.length - 2} more answer{entries.length - 2 === 1 ? '' : 's'}</small>}</td><td><div className="row-actions"><button title="View answers" aria-label="View submission answers" onClick={() => openSubmission(submission._id)}><Icon name="eye" size={16} /></button><button title="Delete submission" aria-label="Delete submission" className="delete-action" onClick={() => setDeleteCandidate(submission)}><Icon name="trash" size={16} /></button></div></td></tr>;
        })}
      </tbody></table></div>
      <div className="submission-pagination"><span>Page {submissions.page} of {Math.max(1, submissions.totalPages)}</span><div><button className="button button-secondary" disabled={page <= 1 || submissions.status === 'loading'} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</button><button className="button button-secondary" disabled={page >= submissions.totalPages || submissions.status === 'loading'} onClick={() => setPage((current) => current + 1)}>Next</button></div></div>
    </section>}

    {viewingId && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeSubmission(); }}><section className="confirm-modal submission-detail-modal" role="dialog" aria-modal="true" aria-labelledby="submission-detail-title"><button className="submission-modal-close icon-button" onClick={closeSubmission} aria-label="Close answers"><Icon name="close" size={17} /></button><div className="eyebrow">SUBMISSION DETAILS</div><h2 id="submission-detail-title">Submitted answers</h2>{detailLoading && <div className="loading-card"><span className="spinner" />Loading answers…</div>}{detailFailed && <div className="error-panel"><span>{submissions.detailError}</span></div>}{detail && <><p>Received {formatDate(detail.submittedAt || detail.createdAt)}</p><dl className="submission-answers">{Object.entries(detail.responses || {}).map(([key, value]) => <div key={key}><dt>{fieldLabels.get(key) || key}</dt><dd>{displayAnswer(value)}</dd></div>)}</dl></>}<div className="confirm-actions"><button className="button button-secondary" onClick={closeSubmission}>Close</button></div></section></div>}

    {deleteCandidate && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && submissions.deleteStatus !== 'loading') setDeleteCandidate(null); }}><section className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="delete-submission-title"><div className="confirm-icon"><Icon name="trash" size={20} /></div><h2 id="delete-submission-title">Delete this submission?</h2><p>This response will be permanently removed.</p>{submissions.deleteError && <div className="modal-error">{submissions.deleteError}</div>}<div className="confirm-actions"><button className="button button-secondary" disabled={submissions.deleteStatus === 'loading'} onClick={() => setDeleteCandidate(null)}>Cancel</button><button className="button button-danger" disabled={submissions.deleteStatus === 'loading'} onClick={confirmDelete}>{submissions.deleteStatus === 'loading' ? 'Deleting…' : 'Delete submission'}</button></div></section></div>}
  </div>;
}
