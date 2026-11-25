import Icon from '../components/Icon';
import StatCard from '../components/StatCard';
import FormsTable from '../components/FormsTable';

export default function DashboardPage({ forms, loading, error, onRetry, onCreate, onEdit, onView, onDelete, onViewAll }) {
  const published = forms.filter((form) => form.status === 'published').length;
  const drafts = forms.filter((form) => form.status === 'draft').length;
  return (
    <div className="page-stack">
      <section className="welcome-banner">
        <div className="welcome-orb welcome-orb-one" /><div className="welcome-orb welcome-orb-two" />
        <div className="welcome-copy"><div className="eyebrow eyebrow-light"><span className="eyebrow-sparkle"><Icon name="sparkle" size={14} /></span> YOUR FORM WORKSPACE</div>
          <h1>Good things start<br className="welcome-break" /> with a great form.</h1>
          <p>Create polished forms, gather the details that matter, and keep every project moving.</p>
          <button className="button button-welcome" onClick={onCreate}><Icon name="plus" size={17} /> Create new form</button>
        </div>
        <div className="welcome-art" aria-hidden="true"><div className="art-back-card"><span /><span /><span /></div><div className="art-front-card"><div className="art-topline"><i /><i /><i /></div><b /><small /><small /><div className="art-input" /><div className="art-button" /></div><div className="art-star">✦</div></div>
      </section>

      <section className="stats-grid" aria-label="Workspace overview">
        <StatCard label="Total forms" value={loading || error ? '—' : forms.length} note="Across your workspace" icon="file" tone="purple" />
        <StatCard label="Published forms" value={loading || error ? '—' : published} note="Ready to collect responses" icon="check" tone="green" />
        <StatCard label="Draft forms" value={loading || error ? '—' : drafts} note="Still being crafted" icon="edit" tone="amber" />
        <StatCard label="Total submissions" value="—" note="Review responses by form" icon="list" tone="blue" unavailable />
      </section>

      <section className="section-heading"><div><div className="eyebrow">YOUR WORKSPACE</div><h2>Recent forms <span className="section-count">{loading || error ? '…' : forms.length}</span></h2><p>Pick up where you left off.</p></div><button className="button button-secondary" onClick={onViewAll}>View all forms <Icon name="arrow" size={16} /></button></section>

      {error ? <div className="error-panel"><div><strong>We couldn’t load your forms</strong><span>{error}</span></div><button className="button button-secondary" onClick={onRetry}>Try again</button></div> : loading ? <div className="loading-card"><span className="spinner" />Loading your forms…</div> : forms.length === 0 ? (
        <section className="empty-start-card"><div className="empty-illustration"><div><Icon name="file" size={26} /></div><span className="empty-spark">✦</span></div><h3>Your first form is one click away</h3><p>Start with a blank canvas and shape it around the information you need.</p><button className="button button-primary" onClick={onCreate}><Icon name="plus" size={16} /> Create your first form</button></section>
      ) : <FormsTable forms={forms.slice(0, 5)} compact onEdit={onEdit} onView={onView} onDelete={onDelete} />}

      <footer className="page-footer"><span>FORMCRAFT</span><span>Make every question count.</span><span className="footer-status"><i /> API connected</span></footer>
    </div>
  );
}
