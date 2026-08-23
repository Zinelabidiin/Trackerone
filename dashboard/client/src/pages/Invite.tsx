import { useEffect, useState } from "react";
import { useParams, Link } from "wouter";
import { Smartphone, ShieldCheck, ArrowRight, Loader2, Download, ExternalLink } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const androidDownloadUrl = import.meta.env.VITE_ANDROID_DOWNLOAD_URL as string | undefined;

export default function Invite() {
  const { token = "" } = useParams<{ token: string }>();
  const [appOpened, setAppOpened] = useState(false);
  const validation = trpc.invitations.validate.useQuery({ token }, { retry: false });
  const appLink = `mytriviahub://invite/${token}`;

  useEffect(() => {
    if (validation.data?.valid) sessionStorage.setItem("mytriviahub_pending_invite", token);
  }, [token, validation.data?.valid]);

  const openMobileApp = () => {
    setAppOpened(true);
    window.location.href = appLink;
    window.setTimeout(() => { if (androidDownloadUrl) window.location.href = androidDownloadUrl; }, 1200);
  };

  if (validation.isLoading) return <div className="invite-page"><Loader2 className="spin" /></div>;
  if (!validation.data?.valid) return <div className="invite-page"><div className="invite-card"><div className="brand-mark centered"><ShieldCheck size={18} /></div><h1>Lien indisponible</h1><p>Ce lien d'invitation est expiré, invalide ou a déjà été utilisé.</p><Link href="/" className="primary-button">Retour au tableau de bord</Link></div></div>;

  return <div className="invite-page"><div className="invite-card"><div className="brand-mark centered"><ShieldCheck size={18} /></div><div className="modal-kicker mono">MY TRIVIA HUB · INSTALLATION</div><h1>Installer My Trivia Hub</h1><p>Pour connecter ce téléphone, installez l'application mobile puis ouvrez à nouveau ce lien.</p><div className="download-steps"><div><span>01</span><b>Installer l'application</b><small>Utilisez le bouton de téléchargement Android.</small></div><div><span>02</span><b>Ouvrir avec l'invitation</b><small>Le lien sécurisé restera associé à ce téléphone.</small></div><div><span>03</span><b>Reprendre l'inscription</b><small>Après installation, rouvrez ce lien pour continuer.</small></div></div><button className="primary-button" onClick={openMobileApp}><Smartphone size={16} /> Ouvrir My Trivia Hub <ArrowRight size={15} /></button>{androidDownloadUrl ? <a className="secondary-button" href={androidDownloadUrl}><Download size={15} /> Télécharger l'APK Android <ExternalLink size={14} /></a> : <div className="download-placeholder"><Download size={16} /><span><b>APK Android à configurer</b><small>L'administrateur doit renseigner VITE_ANDROID_DOWNLOAD_URL après publication de l'APK.</small></span></div>}{appOpened && <p className="modal-note">Si l'application ne s'est pas ouverte, utilisez le bouton APK ci-dessus puis rouvrez ce lien.</p>}<span className="modal-note"><ShieldCheck size={13} /> Invitation valide jusqu'au {validation.data.expiresAt ? new Date(validation.data.expiresAt).toLocaleDateString("fr-FR") : "dans 7 jours"}.</span></div></div>;
}
