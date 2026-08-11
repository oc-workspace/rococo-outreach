'use client';

import { FormEvent, useState } from 'react';

export function LoginForm({ returnTo }: { returnTo: string }) {
  const [token, setToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error ?? 'Login failed.');
      window.location.assign(returnTo);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Login failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="loginForm" onSubmit={submit}>
      <div className="field">
        <label htmlFor="operator-token">Operator token</label>
        <input id="operator-token" className="input" type="password" autoComplete="current-password" value={token} onChange={(event) => setToken(event.target.value)} autoFocus />
      </div>
      {error && <div className="errorText" role="alert">{error}</div>}
      <button className="button buttonPrimary" type="submit" disabled={submitting || !token.trim()}>{submitting ? 'Signing in...' : 'Sign in'}</button>
    </form>
  );
}
