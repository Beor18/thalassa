import { describe, expect, it, vi } from "vitest";
import { whenVisible } from "./when-visible";

function fakeDoc(state: DocumentVisibilityState) {
  const doc = Object.assign(new EventTarget(), { visibilityState: state });
  const show = (next: DocumentVisibilityState) => {
    doc.visibilityState = next;
    doc.dispatchEvent(new Event("visibilitychange"));
  };
  return { doc, show };
}

describe("whenVisible", () => {
  it("runs right away on a visible tab", () => {
    const { doc } = fakeDoc("visible");
    const fn = vi.fn();
    whenVisible(fn, doc);
    expect(fn).toHaveBeenCalledOnce();
  });

  it("waits for a hidden tab to come back, then runs once", () => {
    const { doc, show } = fakeDoc("hidden");
    const fn = vi.fn();
    whenVisible(fn, doc);
    expect(fn).not.toHaveBeenCalled();
    show("hidden");
    expect(fn).not.toHaveBeenCalled();
    show("visible");
    show("hidden");
    show("visible");
    expect(fn).toHaveBeenCalledOnce();
  });

  it("can be cancelled before the tab comes back", () => {
    const { doc, show } = fakeDoc("hidden");
    const fn = vi.fn();
    const cancel = whenVisible(fn, doc);
    cancel();
    show("visible");
    expect(fn).not.toHaveBeenCalled();
  });
});
