/** @vitest-environment jsdom */
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AppsView, CallsView, ContactsView, MessagesView } from "./Home";

const data = {
  calls: [{ id: 1, phoneNumber: "+212600000000", cachedName: "Test appel", callType: 1, startedAt: new Date("2026-08-17T18:00:00Z"), durationSeconds: 42 }],
  contacts: [{ id: 2, displayName: "Contact test", phoneNumber: "+212611111111", contactType: 2 }],
  usage: [{ id: 3, packageName: "com.example.reader", totalTimeForegroundMillis: 12 * 60 * 1000, lastTimeUsed: new Date("2026-08-17T18:30:00Z"), usageDate: new Date("2026-08-17T00:00:00Z") }],
  notifications: [{ id: 4, packageName: "com.example.reader", appName: "Lecteur", title: "Nouvelle alerte", body: "Un aperçu réel", postedAt: new Date("2026-08-17T18:31:00Z") }, { id: 5, packageName: "com.example.calendar", appName: "Agenda", title: "Rappel", body: "Un autre aperçu réel", postedAt: new Date("2026-08-17T18:32:00Z") }],
};

describe("native data dashboard views", () => {
  it("renders real call, contact, app-usage, and notification rows", () => {
    render(<><CallsView data={data} loading={false} /><ContactsView data={data} loading={false} /><AppsView data={data} loading={false} /><MessagesView data={data} loading={false} /></>);
    expect(screen.getByText("Test appel")).toBeTruthy();
    expect(screen.getByText("Contact test")).toBeTruthy();
    expect(screen.getByText("com.example.reader")).toBeTruthy();
    expect(screen.getByText("12 min")).toBeTruthy();
    expect(screen.getByText("Nouvelle alerte")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Filtrer les notifications"), { target: { value: "Agenda" } });
    expect(screen.getByText("Rappel")).toBeTruthy();
    expect(screen.queryByText("Nouvelle alerte")).toBeNull();
  });

  it("renders explicit empty states without demo rows", () => {
    const empty = { calls: [], contacts: [], usage: [], notifications: [] };
    render(<><CallsView data={empty} loading={false} /><ContactsView data={empty} loading={false} /><AppsView data={empty} loading={false} /><MessagesView data={empty} loading={false} /></>);
    expect(screen.getAllByText("Aucun relevé").length).toBe(3);
    expect(screen.getByText("Aucune statistique synchronisée")).toBeTruthy();
    expect(screen.queryByText("Maman")).toBeNull();
    expect(screen.getByText("Flux de notifications en attente")).toBeTruthy();
  });
});
