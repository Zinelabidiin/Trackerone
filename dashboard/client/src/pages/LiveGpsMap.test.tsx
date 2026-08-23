/** @vitest-environment jsdom */
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LiveGpsMap } from "./Home";

describe("LiveGpsMap controls", () => {
  it("changes the iframe viewport on zoom and forces a fresh latest-position viewport on recenter", () => {
    const { container } = render(<LiveGpsMap latitude="34.0628744" longitude="-5.0281816" compact />);
    let iframe = screen.getByTitle("Carte GPS en direct");
    const initialSrc = iframe.getAttribute("src");
    fireEvent.load(iframe);

    fireEvent.click(screen.getByRole("button", { name: "Zoom avant" }));
    iframe = screen.getByTitle("Carte GPS en direct");
    expect(iframe.getAttribute("src")).not.toBe(initialSrc);
    expect(iframe.getAttribute("src")).toContain("#map=16/");
    fireEvent.load(iframe);

    fireEvent.click(screen.getByRole("button", { name: "Recentrer sur la dernière position" }));
    iframe = screen.getByTitle("Carte GPS en direct");
    expect(iframe.getAttribute("src")).toContain("#map=15/");
    expect(container.querySelectorAll("iframe")).toHaveLength(1);
  });
});
