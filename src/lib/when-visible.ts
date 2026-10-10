type VisibilityDoc = Pick<Document, "visibilityState" | "addEventListener" | "removeEventListener">;

/**
 * Runs `fn` now if the tab is visible, otherwise once it comes back. Returns a cancel function.
 * Background refreshes would start a view transition Chrome aborts on hidden documents.
 */
export function whenVisible(fn: () => void, doc: VisibilityDoc = document): () => void {
  if (doc.visibilityState === "visible") {
    fn();
    return () => {};
  }
  const onChange = () => {
    if (doc.visibilityState !== "visible") return;
    doc.removeEventListener("visibilitychange", onChange);
    fn();
  };
  doc.addEventListener("visibilitychange", onChange);
  return () => doc.removeEventListener("visibilitychange", onChange);
}
