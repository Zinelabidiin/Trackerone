/** @vitest-environment jsdom */
import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ModuleUnavailable } from "./Home";

describe("ModuleUnavailable", () => {
  it("labels native telemetry modules as unavailable without demo rows", () => {
    render(<ModuleUnavailable title="Messages récents" code="ACTIVITY_LOG" detail="Native API required" />);
    expect(screen.getByText("Messages récents")).toBeTruthy();
    expect(screen.getByText("Données indisponibles")).toBeTruthy();
    expect(screen.getByText("Aucune donnée synchronisée")).toBeTruthy();
    expect(screen.queryByText("Maman")).toBeNull();
  });
});
