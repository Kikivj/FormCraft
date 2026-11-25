import { useState } from 'react';
import Icon from './Icon';

const links = [
  { id: 'dashboard', label: 'Overview', icon: 'grid' },
  { id: 'forms', label: 'All forms', icon: 'file' },
  { id: 'submissions', label: 'Submissions', icon: 'list' },
];

export default function Sidebar({ page, onNavigate, open, onClose }) {
  const [helpOpen, setHelpOpen] = useState(false);
  const help = {
    dashboard: ['Workspace overview', 'See your form totals and recent activity. Use Create new form to start, or open a recent form to edit, preview, or manage responses.'],
    forms: ['Managing forms', 'Create a form, open a draft to continue editing, preview a published form, or use its actions to manage it.'],
    submissions: ['Reviewing responses', 'Choose a form to browse its responses. Open a response to see every answer, or delete it from the actions menu.'],
  }[page] || ['FormCraft help', 'Use the workspace navigation to find your forms and responses.'];
  return (
    <>
      {open && <button className="sidebar-scrim" aria-label="Close navigation" onClick={onClose} />}
      <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
        <button className="brand" onClick={() => onNavigate('/')} aria-label="FormCraft dashboard">
          <span className="brand-mark"><span /><span /><span /><span /></span>
          <span>Form<span className="brand-light">Craft</span><small>FORM WORKSPACE</small></span>
        </button>

        <div className="sidebar-label">WORKSPACE</div>
        <nav className="side-nav" aria-label="Main navigation">
          {links.map((link) => (
            <button key={link.id} className={`side-link ${page === link.id ? 'side-link-active' : ''}`} onClick={() => { onNavigate(link.id === 'dashboard' ? '/' : link.id === 'forms' ? '/forms' : '/submissions'); onClose?.(); }}>
              <Icon name={link.icon} size={18} /> <span>{link.label}</span>
              {link.id === 'forms' && <span className="nav-count">↗</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-label">YOUR WORKSPACE</div>
          <div className="workspace-card">
            <div className="workspace-avatar">F</div>
            <div><strong>FormCraft team</strong><span>Free workspace</span></div>
            <Icon name="down" size={14} />
          </div>
          <button className="sidebar-help" onClick={() => setHelpOpen(true)} aria-haspopup="dialog"><span className="help-dot">?</span><span>Need a hand?<small>Quick page guide</small></span><Icon name="arrow" size={15} /></button>
        </div>
      </aside>
      {helpOpen && <div className="modal-backdrop help-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setHelpOpen(false); }}><section className="confirm-modal help-modal" role="dialog" aria-modal="true" aria-labelledby="help-title"><button className="icon-button help-close" onClick={() => setHelpOpen(false)} aria-label="Close help"><Icon name="close" size={17} /></button><div className="confirm-icon help-icon">?</div><div className="eyebrow">QUICK GUIDE</div><h2 id="help-title">{help[0]}</h2><p>{help[1]}</p><div className="confirm-actions"><button className="button button-primary" onClick={() => setHelpOpen(false)}>Got it</button></div></section></div>}
    </>
  );
}
