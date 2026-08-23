import { FormEvent, useEffect, useState } from "react";
import Home from "./Home";

export default function AdminGate() {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [adminUsername, setAdminUsername] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/admin/session", { credentials: "include" })
      .then(response => response.ok ? response.json() : null)
      .then(session => { if (active) { setAuthenticated(Boolean(session?.authenticated)); setAdminUsername(session?.admin?.username ?? ""); } })
      .catch(() => { if (active) setAuthenticated(false); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        setError(result?.error ?? "Connexion refusée.");
        return;
      }
      setAuthenticated(true);
      setAdminUsername(result?.admin?.username ?? username);
      setPassword("");
    } catch {
      setError("Le serveur est momentanément indisponible.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="admin-gate-shell"><div className="admin-login-card"><span className="eyebrow mono">MY TRIVIA HUB · SECURE ACCESS</span><h1>Vérification de l’accès…</h1><p>Connexion sécurisée au tableau de bord.</p></div></div>;
  if (authenticated) return <div className="admin-authenticated-shell"><Home adminUsername={adminUsername} onLogout={async () => { await fetch("/api/admin/logout", { method: "POST", credentials: "include" }); setAuthenticated(false); setAdminUsername(""); }} /></div>;

  return <div className="admin-gate-shell">
    <form className="admin-login-card" onSubmit={submit}>
      <div className="brand admin-brand"><div className="brand-mark">✓</div><div><div className="brand-name">My Trivia Hub</div><div className="brand-id mono">ADMIN CONSOLE</div></div></div>
      <span className="eyebrow mono">SECURE ACCESS · 01</span>
      <h1>Accès administrateur</h1>
      <p>Entrez vos identifiants administrateur pour ouvrir le tableau de bord.</p>
      <label className="admin-field">Nom d’utilisateur<input autoComplete="username" value={username} onChange={event => setUsername(event.target.value)} required /></label>
      <label className="admin-field">Mot de passe<input type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} required /></label>
      {error && <div className="admin-error" role="alert">{error}</div>}
      <button className="primary-button admin-submit" type="submit" disabled={submitting}>{submitting ? "Vérification…" : "Ouvrir le tableau de bord"}</button>
      <small className="admin-security-note">Session administrateur sécurisée par cookie HTTP uniquement.</small>
    </form>
  </div>;
}
