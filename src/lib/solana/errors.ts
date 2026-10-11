import type { Text } from "@/i18n/config";

/**
 * An error whose text is safe to show to the player as-is, in every language.
 * `message` is the English line (like GameError); show `t(err.text)` to follow the player's language.
 */
export class FriendlyError extends Error {
  readonly text: Text;
  constructor(message: string | Text) {
    const text = typeof message === "string" ? { en: message, es: message } : message;
    super(text.en);
    this.name = "FriendlyError";
    this.text = text;
  }
}
