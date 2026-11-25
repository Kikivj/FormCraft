import Icon from '../components/Icon';
import FormsTable from '../components/FormsTable';

export default function FormsPage({ forms, status, error, onRetry, onCreate, onEdit, onView, onDelete }) {
  return (
    <div className="page-stack">
      <div className="page-title-row"><div><div className="eyebrow">WORKSPACE / FORMS</div><h1>All forms</h1><p>Everything you’ve created, all in one place.</p></div><button className="button button-primary" onClick={onCreate}><Icon name="plus" size={17} /> New form</button></div>
      {status === 'loading' && <div className="loading-card"><span className="spinner" />Loading your forms…</div>}
      {status === 'failed' && <div className="error-panel"><div><strong>We couldn’t load your forms</strong><span>{error}</span></div><button className="button button-secondary" onClick={onRetry}>Try again</button></div>}
      {status !== 'loading' && status !== 'failed' && forms.length === 0 && <div className="empty-start-card forms-empty"><div className="empty-illustration"><div><Icon name="file" size={26} /></div><span className="empty-spark">✦</span></div><h3>No forms yet</h3><p>Create a form to start collecting the information your team needs.</p><button className="button button-primary" onClick={onCreate}><Icon name="plus" size={16} /> Create a form</button></div>}
      {status !== 'loading' && status !== 'failed' && forms.length > 0 && <FormsTable forms={forms} onEdit={onEdit} onView={onView} onDelete={onDelete} publicView />}
    </div>
  );
}
