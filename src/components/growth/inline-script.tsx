"use client";

/**
 * A script that runs while the server HTML is parsed (before first paint) and is ignored on
 * client-side navigations, where React would otherwise warn about rendering a <script>.
 * Pattern from Next.js "Preventing flash before hydration".
 */
export function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
