import { useState } from 'react';
import Icon from '../components/Icon';
import ThemeToggle from '../components/ThemeToggle';

export default function LoginPage({ theme, onToggleTheme, onLogin, error, loading }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    setFormError('');
    try { await onLogin({ email, password }); }
    catch (loginError) { setFormError(loginError || 'Unable to sign in.'); }
  };

  return <main className="login-page">
    <header className="login-header"><a className="public-brand" href="/" aria-label="FormCraft home"><span className="brand-mark"><span /><span /><span /><span /></span><span>Form<span className="brand-light">Craft</span></span></a><ThemeToggle theme={theme} onToggle={onToggleTheme} /></header>
    <section className="login-card"><div className="login-icon"><Icon name="settings" size={20} /></div><div className="eyebrow">ADMIN WORKSPACE</div><h1>Welcome back</h1><p>Sign in to manage your forms and submissions.</p>
      <form onSubmit={submit}>
        <label className="login-label">Email<input type="email" autoComplete="username" required maxLength="320" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
        <label className="login-label">Password<input type="password" autoComplete="current-password" required maxLength="72" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        {(formError || error) && <div className="login-error" role="alert">{formError || error}</div>}
        <button className="button button-primary login-submit" type="submit" disabled={loading}>{loading ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </section>
    <footer className="login-footer">FormCraft · Secure admin access</footer>
  </main>;
}
