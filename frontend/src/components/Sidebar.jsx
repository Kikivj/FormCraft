import Icon from './Icon';

const links = [
  { id: 'dashboard', label: 'Overview', icon: 'grid' },
  { id: 'forms', label: 'All forms', icon: 'file' },
  { id: 'submissions', label: 'Submissions', icon: 'list' },
];

export default function Sidebar({ page, onNavigate, open, onClose }) {
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
          <div className="sidebar-help"><span className="help-dot">?</span><span>Need a hand?<small>Visit our help center</small></span><Icon name="arrow" size={15} /></div>
        </div>
      </aside>
    </>
  );
}
