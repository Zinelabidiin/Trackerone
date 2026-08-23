import { describe, expect, it } from "vitest";
import { getGpsMapEmbedUrl, getNextMapZoom, getRecenteredMapState } from "./gpsMap";

describe("getGpsMapEmbedUrl", () => {
  it("centers the real map on the device coordinates", () => {
    const url = getGpsMapEmbedUrl("34.0628744", "-5.0281816");
    expect(url).toContain("openstreetmap.org/export/embed.html");
    expect(url).toContain("marker=34.062874%2C-5.028182");
  });

  it("changes the viewport when zoom changes", () => {
    const close = getGpsMapEmbedUrl("34.0628744", "-5.0281816", 18);
    const wide = getGpsMapEmbedUrl("34.0628744", "-5.0281816", 12);
    expect(close).not.toBe(wide);
    expect(close).toContain("#map=18/");
    expect(wide).toContain("#map=12/");
  });

  it("clamps zoom controls and advances recenter revisions", () => {
    expect(getNextMapZoom(19, "in")).toBe(19);
    expect(getNextMapZoom(10, "out")).toBe(10);
    expect(getNextMapZoom(15, "in")).toBe(16);
    expect(getRecenteredMapState(true, 4)).toEqual({ zoom: 15, revision: 5 });
  });

  it("returns no map URL without valid coordinates", () => {
    expect(getGpsMapEmbedUrl(null, null)).toBeNull();
    expect(getGpsMapEmbedUrl("91", "-5")).toBeNull();
  });
});
