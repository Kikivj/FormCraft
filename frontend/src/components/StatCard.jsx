import Icon from './Icon';

export default function StatCard({ label, value, note, icon, tone, unavailable = false }) {
  return (
    <article className="stat-card">
      <div className={`stat-icon stat-icon-${tone}`}><Icon name={icon} size={18} /></div>
      <div className="stat-label">{label}</div>
      <div className={`stat-value ${unavailable ? 'stat-unavailable' : ''}`}>{value}</div>
      <div className="stat-note">{note}</div>
    </article>
  );
}
