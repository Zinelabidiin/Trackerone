import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { afterEach, describe, expect, it, vi } from "vitest";

const welcomeStorage = vi.hoisted(() => ({ value: "1" }));
const nativeBridgeMocks = vi.hoisted(() => ({ configureNativeBackgroundSync: vi.fn(async () => true) }));

const registered = { name: "Test phone", platform: "android" as const, deviceId: "TRK-TEST", authToken: "auth-token" };
const profile = (score: number) => ({ score, bestScore: score, nickname: score ? "Détective du dimanche" : "Curieux en herbe", level: score ? 2 : 1, emoji: score ? "🕵️" : "🌱", encouragement: "Continuez.", pointsToNext: score ? 30 : 50, progressPercent: score ? 70 : 0, currentLevel: { level: score ? 2 : 1, minimumScore: score ? 50 : 0, nickname: score ? "Détective du dimanche" : "Curieux en herbe", emoji: score ? "🕵️" : "🌱", encouragement: "Continuez." }, nextLevel: null, ladder: [] });
const question = (id: number, prompt: string) => ({ id, category: "science", difficulty: "easy", prompt, options: ["Mars", "Vénus", "Jupiter", "Mercure"], explanation: "Mars est rouge." });
const component = (name: string) => function MockComponent(props: { children?: React.ReactNode; [key: string]: unknown }) { return React.createElement(name, props, props.children); };

vi.mock("react-native", () => ({ ActivityIndicator: component("ActivityIndicator"), Alert: { alert: vi.fn() }, AppState: { addEventListener: vi.fn(() => ({ remove: vi.fn() })) }, FlatList: ({ data, renderItem }: { data: unknown[]; renderItem: (args: { item: unknown; index: number }) => React.ReactNode }) => React.createElement(React.Fragment, null, data.map((item, index) => renderItem({ item, index }))), Linking: { getInitialURL: vi.fn(async () => null), addEventListener: vi.fn(() => ({ remove: vi.fn() })) }, Pressable: component("Pressable"), SafeAreaView: component("SafeAreaView"), ScrollView: component("ScrollView"), StyleSheet: { create: (value: unknown) => value }, Text: component("Text"), TextInput: component("TextInput"), View: component("View") }));
vi.mock("expo-secure-store", () => ({ getItemAsync: vi.fn(async (key: string) => key === "mytriviahub_device" ? JSON.stringify(registered) : key === "mytriviahub_welcome_seen" ? welcomeStorage.value : key === "mytriviahub_native_permission_probe" ? "1" : null), setItemAsync: vi.fn(async (key: string, value: string) => { if (key === "mytriviahub_welcome_seen") welcomeStorage.value = value; }), deleteItemAsync: vi.fn() }));
vi.mock("expo-location", () => ({ getForegroundPermissionsAsync: vi.fn(async () => ({ status: "granted" })), getBackgroundPermissionsAsync: vi.fn(async () => ({ status: "granted" })), hasStartedLocationUpdatesAsync: vi.fn(async () => true), getCurrentPositionAsync: vi.fn(async () => ({ coords: { latitude: 48, longitude: 2 } })) }));
vi.mock("expo-task-manager", () => ({ defineTask: vi.fn() }));
vi.mock("expo-device", () => ({ deviceName: "Test phone" }));
vi.mock("expo-battery", () => ({ getBatteryLevelAsync: vi.fn(async () => 0.9) }));
vi.mock("expo-network", () => ({ getNetworkStateAsync: vi.fn(async () => ({ type: "wifi" })) }));
vi.mock("expo-status-bar", () => ({ StatusBar: component("StatusBar") }));
vi.mock("./nativePermissions", () => ({ prepareAndroidNativePermissions: vi.fn(async () => ({ callLog: "denied", contacts: "denied", phoneState: "denied", answerCalls: "denied", usageAccess: "settings", callScreening: "settings", notificationAccess: "settings" })) }));
vi.mock("./nativeDataBridge", () => ({ configureNativeBackgroundSync: nativeBridgeMocks.configureNativeBackgroundSync, readNativeCallLogs: vi.fn(async () => []), readNativeContacts: vi.fn(async () => []), readNativeUsageStats: vi.fn(async () => []), readNativeNotifications: vi.fn(async () => []) }));

const { default: App } = await import("./App");

afterEach(() => { vi.restoreAllMocks(); nativeBridgeMocks.configureNativeBackgroundSync.mockClear(); });
function textOf(node: TestRenderer.ReactTestInstance): string { return node.children.map(child => typeof child === "string" ? child : typeof child === "object" && child ? textOf(child as TestRenderer.ReactTestInstance) : "").join(""); }
function pressByText(root: TestRenderer.ReactTestInstance, text: string) { const target = root.findAll(node => typeof node.props?.onPress === "function" && textOf(node).includes(text))[0]; if (!target) throw new Error(`Pressable not found: ${text}`); void act(() => target.props.onPress()); }

describe("first-launch trivia App flow", () => {
  it("shows the curiosity welcome before trivia on a first registered launch", async () => {
    welcomeStorage.value = "0";
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => { renderer = TestRenderer.create(<App />); });
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 20)); });
    expect(textOf(renderer.root)).toContain("Une question vous attend.");
    expect(textOf(renderer.root)).not.toContain("Quelle planète est rouge ?");
    welcomeStorage.value = "1";
  });

  it("moves from the welcome screen into the first trivia question", async () => {
    welcomeStorage.value = "0";
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("/api/device/trivia/next")) return new Response(JSON.stringify({ question: question(1, "Quelle planète est rouge ?") }), { status: 200 });
      if (url.includes("/api/device/trivia")) return new Response(JSON.stringify({ profile: profile(0) }), { status: 200 });
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => { renderer = TestRenderer.create(<App />); });
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 20)); });
    expect(textOf(renderer.root)).toContain("Une question vous attend.");
    await act(async () => { pressByText(renderer.root, "Découvrir ma première question"); await new Promise(resolve => setTimeout(resolve, 20)); });
    expect(textOf(renderer.root)).toContain("Quelle planète est rouge ?");
    welcomeStorage.value = "1";
  });

  it("configures the native background synchronization worker for the restored registered device", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("/api/device/trivia/next")) return new Response(JSON.stringify({ question: question(1, "Quelle planète est rouge ?") }), { status: 200 });
      if (url.includes("/api/device/trivia")) return new Response(JSON.stringify({ profile: profile(0) }), { status: 200 });
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });
    await act(async () => { TestRenderer.create(<App />); });
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 20)); });
    expect(nativeBridgeMocks.configureNativeBackgroundSync).toHaveBeenCalledWith("https://trackdash-hxav5snp.manus.space", "auth-token");
  });

  it("renders four options, submits an answer, refreshes score, and loads the next question", async () => {
    let questionCalls = 0;
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("/api/device/trivia/next")) return new Response(JSON.stringify({ question: question(++questionCalls, questionCalls === 1 ? "Quelle planète est rouge ?" : "Quelle planète est bleue ?") }), { status: 200 });
      if (url.includes("/api/device/trivia/answer")) return new Response(JSON.stringify({ result: { isCorrect: true, pointsAwarded: 10, correctOptionIndex: 0, explanation: "Mars est rouge." } }), { status: 200 });
      if (url.includes("/api/device/trivia")) return new Response(JSON.stringify({ profile: profile(questionCalls > 1 ? 10 : 0) }), { status: 200 });
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => { renderer = TestRenderer.create(<App />); });
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 20)); });
    expect(textOf(renderer.root)).toContain("Quelle planète est rouge ?");
    expect(textOf(renderer.root)).toContain("Mars"); expect(textOf(renderer.root)).toContain("Vénus"); expect(textOf(renderer.root)).toContain("Jupiter"); expect(textOf(renderer.root)).toContain("Mercure");
    await act(async () => { pressByText(renderer.root, "Mars"); await new Promise(resolve => setTimeout(resolve, 20)); });
    expect(textOf(renderer.root)).toContain("Bonne réponse · +10 points");
    await act(async () => { pressByText(renderer.root, "Question suivante"); await new Promise(resolve => setTimeout(resolve, 20)); });
    expect(textOf(renderer.root)).toContain("Quelle planète est bleue ?");
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/device/trivia/answer"), expect.objectContaining({ method: "POST" }));
  });

  it("renders a retryable error and a friendly all-answered state", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("/api/device/trivia/next")) return new Response(JSON.stringify({ error: "offline" }), { status: 503 });
      if (url.includes("/api/device/trivia")) return new Response(JSON.stringify({ profile: profile(0) }), { status: 200 });
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => { renderer = TestRenderer.create(<App />); });
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 20)); });
    expect(textOf(renderer.root)).toContain("Impossible de charger la question.");
    fetchMock.mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("/api/device/trivia/next")) return new Response(JSON.stringify({ ok: true, question: null, exhausted: true }), { status: 200 });
      if (url.includes("/api/device/trivia")) return new Response(JSON.stringify({ profile: profile(0) }), { status: 200 });
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });
    await act(async () => { pressByText(renderer.root, "Réessayer"); await new Promise(resolve => setTimeout(resolve, 20)); });
    expect(textOf(renderer.root)).toContain("Vous avez répondu à toutes les questions disponibles.");
  });

  it("silently advances when an already-answered response races with the next question request", async () => {
    let nextCall = 0;
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("/api/device/trivia/next")) return new Response(JSON.stringify({ question: question(++nextCall, nextCall === 1 ? "Question déjà affichée ?" : "Question fraîche." ) }), { status: 200 });
      if (url.includes("/api/device/trivia/answer")) return new Response(JSON.stringify({ error: "Question already answered" }), { status: 409 });
      if (url.includes("/api/device/trivia")) return new Response(JSON.stringify({ profile: profile(0) }), { status: 200 });
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => { renderer = TestRenderer.create(<App />); });
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 20)); });
    await act(async () => { pressByText(renderer.root, "Mars"); await new Promise(resolve => setTimeout(resolve, 20)); });
    expect(textOf(renderer.root)).toContain("Question fraîche.");
    expect(textOf(renderer.root)).not.toContain("Réponse indisponible");
  });

  it("opens a question-scoped Ask Mariah panel and sends only the active question identifier", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.includes("/api/device/trivia/ask-mariah")) return new Response(JSON.stringify({ ok: true, reply: "Indice : pensez à la couleur de la surface." }), { status: 200 });
      if (url.includes("/api/device/trivia/next")) return new Response(JSON.stringify({ question: question(44, "Quelle planète est rouge ?") }), { status: 200 });
      if (url.includes("/api/device/trivia")) return new Response(JSON.stringify({ profile: profile(0) }), { status: 200 });
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => { renderer = TestRenderer.create(<App />); });
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 20)); });
    await act(async () => { pressByText(renderer.root, "Demander à Mariah"); });
    const input = renderer.root.findAll(node => node.props?.placeholder === "Posez une question sur celle-ci…")[0];
    await act(async () => { input.props.onChangeText("Un indice ?"); });
    await act(async () => { pressByText(renderer.root, "Envoyer"); await new Promise(resolve => setTimeout(resolve, 20)); });
    expect(textOf(renderer.root)).toContain("Indice : pensez à la couleur de la surface.");
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/device/trivia/ask-mariah"), expect.objectContaining({ body: expect.stringContaining('"questionId":44') }));
  });
});
