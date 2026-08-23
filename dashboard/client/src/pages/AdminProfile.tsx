import { FormEvent, useState } from "react";

export default function AdminProfile({ username, onClose }: { username: string; onClose: () => void }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setStatus(null);
    if (newPassword !== confirmPassword) return setStatus({ kind: "error", text: "Les mots de passe ne correspondent pas." });
    if (newPassword.length < 12 || !/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) return setStatus({ kind: "error", text: "Utilisez au moins 12 caractères, avec une majuscule, une minuscule et un chiffre." });
    setSaving(true);
    try {
      const response = await fetch("/api/admin/password", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currentPassword, newPassword, confirmPassword }) });
      const result = await response.json().catch(() => null);
      if (!response.ok) return setStatus({ kind: "error", text: result?.error ?? "Le mot de passe n’a pas pu être modifié." });
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      setStatus({ kind: "success", text: "Mot de passe modifié. Votre session actuelle reste active." });
    } catch {
      setStatus({ kind: "error", text: "Le serveur est momentanément indisponible." });
    } finally {
      setSaving(false);
    }
  }

  return <div className="profile-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="profile-panel" role="dialog" aria-modal="true" aria-labelledby="profile-title">
      <button className="modal-close" onClick={onClose} aria-label="Fermer">×</button>
      <span className="modal-kicker">ADMIN PROFILE · SECURE</span>
      <h2 id="profile-title">Profil administrateur</h2>
      <p className="profile-intro">Gérez le mot de passe de votre compte sans exposer vos identifiants au navigateur.</p>
      <div className="profile-identity"><span className="profile-avatar">{username.slice(0, 1).toUpperCase()}</span><div><b>{username}</b><small>Administrateur My Trivia Hub</small></div></div>
      <form onSubmit={submit}>
        <label className="field-label">Mot de passe actuel<input type="password" autoComplete="current-password" value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} required /></label>
        <label className="field-label">Nouveau mot de passe<input type="password" autoComplete="new-password" value={newPassword} onChange={event => setNewPassword(event.target.value)} required /></label>
        <label className="field-label">Confirmer le nouveau mot de passe<input type="password" autoComplete="new-password" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} required /></label>
        <p className="password-policy">Minimum 12 caractères, une majuscule, une minuscule et un chiffre.</p>
        {status && <div className={`profile-status ${status.kind}`} role="status">{status.text}</div>}
        <div className="profile-actions"><button type="button" className="secondary-button" onClick={onClose}>Annuler</button><button type="submit" className="primary-button" disabled={saving}>{saving ? "Enregistrement…" : "Modifier le mot de passe"}</button></div>
      </form>
    </section>
  </div>;
}
