import { notFound } from "next/navigation";

/** Any path the app doesn't know lands here, so the localized not-found page renders. */
export default function Missing() {
  notFound();
}
