export function pickSupportedAudioMimeType(): string {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
  for (const candidate of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(candidate)) {
      return candidate;
    }
  }
  return "audio/webm";
}

/** Strips codec parameters (e.g. ";codecs=opus") since the API schema only validates the base media type. */
export function baseMimeType(mimeType: string): string {
  return mimeType.split(";")[0] ?? mimeType;
}
