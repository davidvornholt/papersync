// The service worker receives shared photos. This answers only when it is not
// running yet, so Scan can ask for the photos to be shared again.
const seeOtherStatus = 303;

// A relative location: behind the reverse proxy, `request.url` names the
// container's own listen address, not the address the browser used.
export const POST = (): Response =>
  new Response(null, {
    status: seeOtherStatus,
    headers: { location: '/scan?shared=failed' },
  });
