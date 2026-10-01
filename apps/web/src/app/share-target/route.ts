// The service worker receives shared photos. This answers only when it is not
// running yet, so Scan can ask for the photos to be shared again.
const seeOtherStatus = 303;

export const POST = (request: Request): Response =>
  Response.redirect(
    new URL('/scan?shared=failed', request.url),
    seeOtherStatus,
  );
