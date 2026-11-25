import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { deleteForm, fetchForms } from './redux/formsSlice';
import Sidebar from './components/Sidebar';
import Icon from './components/Icon';
import DashboardPage from './pages/DashboardPage';
import FormsPage from './pages/FormsPage';
import BuilderPage from './pages/BuilderPage';
import ThemeToggle from './components/ThemeToggle';
import PublicFormPage from './pages/PublicFormPage';
import SubmissionsPage from './pages/SubmissionsPage';
import LoginPage from './pages/LoginPage';
import { checkSession, clearAuth, login, logout } from './redux/authSlice';

function readTheme() {
  try { return window.localStorage.getItem('formcraft-theme') === 'dark' ? 'dark' : 'light'; }
  catch { return 'light'; }
}

function readRoute() {
  const path = window.location.pathname.replace(/\/+$/, '') || '/';
  if (path === '/forms') return { page: 'forms' };
  const submissionsMatch = path.match(/^\/submissions(?:\/([^/]+))?$/);
  if (submissionsMatch) return { page: 'submissions', formId: submissionsMatch[1] ? decodeURIComponent(submissionsMatch[1]) : null };
  const publicFormMatch = path.match(/^\/forms\/([^/]+)$/);
  if (publicFormMatch) return { page: 'publicForm', id: decodeURIComponent(publicFormMatch[1]) };
  const builderMatch = path.match(/^\/builder\/([^/]+)$/);
  if (builderMatch) return { page: 'builder', id: decodeURIComponent(builderMatch[1]), previewOnly: new URLSearchParams(window.location.search).get('mode') === 'preview' };
  return { page: 'dashboard' };
}

export default function App() {
  const dispatch = useDispatch();
  const { items: forms, status, error } = useSelector((state) => state.forms);
  const auth = useSelector((state) => state.auth);
  const [route, setRoute] = useState(readRoute);
  const [theme, setTheme] = useState(readTheme);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState(null);
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { window.localStorage.setItem('formcraft-theme', theme); } catch { /* Theme remains active for this session. */ }
  }, [theme]);
  const toggleTheme = () => setTheme((current) => current === 'dark' ? 'light' : 'dark');

  useEffect(() => { dispatch(checkSession()); }, [dispatch]);
  useEffect(() => {
    const handleUnauthorized = () => dispatch(clearAuth());
    window.addEventListener('formcraft:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('formcraft:unauthorized', handleUnauthorized);
  }, [dispatch]);

  const navigate = (path) => {
    window.history.pushState({}, '', path);
    setRoute(readRoute());
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const handlePop = () => setRoute(readRoute());
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, []);

  useEffect(() => {
    if (auth.status === 'authenticated' && (route.page === 'dashboard' || route.page === 'forms' || route.page === 'submissions')) dispatch(fetchForms());
  }, [dispatch, route.page, auth.status]);

  if (route.page === 'publicForm') {
    return <PublicFormPage key={route.id} formId={route.id} theme={theme} onToggleTheme={toggleTheme} />;
  }

  if (auth.status === 'checking') return <main className="login-page"><div className="public-state"><span className="spinner" />Checking admin session…</div></main>;
  if (auth.status !== 'authenticated') {
    return <LoginPage theme={theme} onToggleTheme={toggleTheme} error={auth.error} loading={auth.status === 'signingIn'} onLogin={(credentials) => dispatch(login(credentials)).unwrap()} />;
  }

  const createNew = () => navigate('/builder/new');
  const deleteSelected = async () => {
    setDeleting(true);
    setDeleteError('');
    try {
      await dispatch(deleteForm(deleteCandidate._id)).unwrap();
      setDeleteCandidate(null);
    } catch (actionError) {
      setDeleteError(actionError);
    } finally {
      setDeleting(false);
    }
  };

  if (route.page === 'builder') {
    return <BuilderPage key={`${route.id}-${route.previewOnly}`} id={route.id} previewOnly={route.previewOnly} onNavigate={navigate} theme={theme} onToggleTheme={toggleTheme} onLogout={() => dispatch(logout())} adminEmail={auth.user?.email} />;
  }

  return (
    <div className="app-shell">
      <Sidebar page={route.page} onNavigate={navigate} open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      <div className="main-shell">
        <header className="main-header">
          <button className="mobile-menu" onClick={() => setMobileNavOpen(true)} aria-label="Open navigation"><Icon name="menu" size={21} /></button>
          <div className="header-breadcrumb"><span>Workspace</span><Icon name="chevron" size={14} /><strong>{route.page === 'forms' ? 'All forms' : route.page === 'submissions' ? 'Submissions' : 'Overview'}</strong></div>
          <div className="header-right"><span className="header-date">{new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date())}</span><ThemeToggle theme={theme} onToggle={toggleTheme} /><span className="header-divider" /><div className="profile-chip"><span className="profile-avatar">{auth.user?.email?.[0]?.toUpperCase() || 'A'}</span><span className="profile-name">{auth.user?.email || 'Workspace admin'}</span></div><button className="logout-button" onClick={() => dispatch(logout())}>Log out</button></div>
        </header>
        <main className="main-content">
          {deleteError && <div className="toast-error"><Icon name="close" size={15} />{deleteError}<button onClick={() => setDeleteError('')} aria-label="Dismiss error"><Icon name="close" size={14} /></button></div>}
          {route.page === 'forms' ? (
            <FormsPage forms={forms} status={status} error={error} onRetry={() => dispatch(fetchForms())} onCreate={createNew} onEdit={(id) => navigate(`/builder/${id}`)} onView={(id) => navigate(`/builder/${id}?mode=preview`)} onDelete={setDeleteCandidate} />
          ) : route.page === 'submissions' ? (
            <SubmissionsPage forms={forms} formsStatus={status} initialFormId={route.formId} />
          ) : (
            <DashboardPage forms={forms} loading={status === 'loading'} error={status === 'failed' ? error : null} onRetry={() => dispatch(fetchForms())} onCreate={createNew} onEdit={(id) => navigate(`/builder/${id}`)} onView={(id) => navigate(`/builder/${id}?mode=preview`)} onDelete={setDeleteCandidate} onViewAll={() => navigate('/forms')} />
          )}
        </main>
      </div>
      {deleteCandidate && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !deleting) setDeleteCandidate(null); }}><section className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="delete-title"><div className="confirm-icon"><Icon name="trash" size={20} /></div><h2 id="delete-title">Delete this form?</h2><p><strong>{deleteCandidate.name}</strong> will be removed from your forms. This action can’t be undone.</p>{deleteError && <div className="modal-error">{deleteError}</div>}<div className="confirm-actions"><button className="button button-secondary" disabled={deleting} onClick={() => setDeleteCandidate(null)}>Cancel</button><button className="button button-danger" disabled={deleting} onClick={deleteSelected}>{deleting ? 'Deleting…' : 'Delete form'}</button></div></section></div>}
    </div>
  );
}
