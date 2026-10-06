/**
 * Stub for Next.js 14.2.x App Router projects.
 *
 * Next's build-time `Collecting page data` phase calls `hasCustomGetInitialProps`
 * for `_document` even on pure App Router projects. The require throws
 * `PageNotFoundError`, which Node 22 surfaces as an unhandled rejection and
 * kills the build. This empty stub satisfies the require. App Router pages
 * continue to serve as before, and no `_app.tsx` stub is added — adding one
 * flips Next's type inference into hybrid mode and breaks App Router typing
 * elsewhere.
 *
 * Delete once we upgrade past the Next version that still runs this check on
 * App Router.
 */
import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html>
      <Head />
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
