/** @vitest-environment jsdom */
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LocationView, Resume } from "./Home";

describe("LocationView live location control", () => {
  it("keeps the yellow warning on Location only and toggles live display intent", () => {
    const profile = { screen: "3h", notifications: "18", places: "4", messages: "12", calls: "18", distance: "8 km", lastPing: "À l'instant" };
    const resume = render(<Resume device={{ id: 1, name: "Téléphone test", platform: "android", deviceId: "test-1", status: "En ligne" }} profile={profile} telemetry={null} onInvite={() => undefined} onNavigate={() => undefined} />);
    expect(resume.queryByText(/Android peut afficher une notification/i)).toBeNull();
    resume.unmount();
    const onToggle = vi.fn();
    const onIntervalChange = vi.fn();
    render(<LocationView profile={profile} telemetry={null} history={[{ id: 1, latitude: "34.0628744", longitude: "-5.0281816", recordedAt: new Date("2026-08-18T14:49:33Z") }]} liveLocationEnabled onToggleLiveLocation={onToggle} syncIntervalMinutes={60} onSyncIntervalChange={onIntervalChange} />);
    expect(screen.getByText("Position en direct")).toBeTruthy();
    expect(screen.getByText(/Android peut afficher une notification/i)).toBeTruthy();
    const toggle = screen.getByRole("button", { name: "Activée" });
    expect(toggle.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByDisplayValue("2")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Intervalle de synchronisation"), { target: { value: "3" } });
    expect(onIntervalChange).toHaveBeenCalledWith(120);
    const locationLink = screen.getByRole("link", { name: /Position enregistrée 1/i });
    expect(locationLink.getAttribute("href")).toContain("34.0628744%2C-5.0281816");
    expect(screen.queryByText("Domicile")).toBeNull();
    fireEvent.click(toggle);
    expect(onToggle).toHaveBeenCalledOnce();
  });

  it("routes résumé controls and monitoring cards to their corresponding dashboard views", () => {
    const profile = { screen: "3h", notifications: "18", places: "4", messages: "12", calls: "18", distance: "8 km", lastPing: "À l'instant" };
    const onNavigate = vi.fn();
    render(<Resume device={{ id: 1, name: "Téléphone test", platform: "android", deviceId: "test-1", status: "En ligne" }} profile={profile} telemetry={null} onInvite={() => undefined} onNavigate={onNavigate} />);

    fireEvent.click(screen.getByRole("button", { name: "Tout voir" }));
    fireEvent.click(screen.getByRole("button", { name: "Ouvrir" }));
    fireEvent.click(screen.getByRole("button", { name: "Voir tout" }));
    fireEvent.click(screen.getByRole("button", { name: /GPS en temps réel/i }));
    fireEvent.click(screen.getByRole("button", { name: /Messages/i }));
    fireEvent.click(screen.getByRole("button", { name: /Appels/i }));
    fireEvent.click(screen.getByRole("button", { name: /Temps d'écran/i }));
    fireEvent.click(screen.getByRole("button", { name: /Règles d'accès/i }));

    expect(onNavigate.mock.calls.map(([page]) => page)).toEqual(["applis", "localisation", "messages", "localisation", "messages", "appels", "ecran", "regles"]);
  });
});
