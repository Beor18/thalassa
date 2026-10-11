import { notFound } from "next/navigation";

// Unknown paths only ever render the not-found page; there is no instant UI to validate.
export const instant = false;

/** Any path the app doesn't know lands here, so the localized not-found page renders. */
export default function Missing() {
  notFound();
}
