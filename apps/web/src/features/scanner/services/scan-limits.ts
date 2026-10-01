const bytesPerMebibyte = 1_048_576;
// The browser sends photos of at most 2048 px, usually well below 2 MB.
const pageMebibytes = 4;
// Analysis holds several copies of the upload in memory, and the container
// has 512 MB; the old Server Action allowed the same 16 MB per request.
const uploadMebibytes = 16;

/** Enough for a sheet's front and back plus retakes. */
export const scanPageLimit = 8;
export const scanPageByteLimit = pageMebibytes * bytesPerMebibyte;
export const scanUploadByteLimit = uploadMebibytes * bytesPerMebibyte;
