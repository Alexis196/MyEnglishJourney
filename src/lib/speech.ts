/** Reads a word or phrase aloud with the browser's own voice (free, offline, no API). Returns false if unsupported. */
export function speakEnglish(text: string): boolean {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.rate = 0.9;
  const voice = window.speechSynthesis.getVoices().find((item) => item.lang.toLowerCase().startsWith("en"));
  if (voice) utterance.voice = voice;
  window.speechSynthesis.speak(utterance);
  return true;
}

export function canSpeak(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}
