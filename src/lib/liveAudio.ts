/** Browser audio plumbing for the live conversation: microphone -> 16 kHz PCM, and 24 kHz PCM -> speakers. */

const INPUT_RATE = 16000;
const OUTPUT_RATE = 24000;

const WORKLET_SOURCE = `
class PcmTap extends AudioWorkletProcessor {
  process(inputs) {
    const channel = inputs[0] && inputs[0][0];
    if (channel) this.port.postMessage(channel.slice(0));
    return true;
  }
}
registerProcessor("pcm-tap", PcmTap);
`;

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Averages groups of input samples down to 16 kHz, carrying the fractional remainder between chunks. */
class Downsampler {
  private carry: number[] = [];
  private position = 0;
  constructor(private readonly inputRate: number) {}

  push(samples: Float32Array): Int16Array {
    const ratio = this.inputRate / INPUT_RATE;
    const out: number[] = [];
    for (const sample of samples) this.carry.push(sample);
    while (this.position + ratio <= this.carry.length) {
      const start = Math.floor(this.position);
      const end = Math.min(this.carry.length, Math.ceil(this.position + ratio));
      let sum = 0;
      for (let i = start; i < end; i += 1) sum += this.carry[i]!;
      const value = Math.max(-1, Math.min(1, sum / Math.max(1, end - start)));
      out.push(value < 0 ? value * 0x8000 : value * 0x7fff);
      this.position += ratio;
    }
    const consumed = Math.floor(this.position);
    if (consumed > 0) {
      this.carry = this.carry.slice(consumed);
      this.position -= consumed;
    }
    return Int16Array.from(out);
  }
}

export interface MicCapture {
  /** Mutes/unmutes the microphone without closing the connection. */
  setMuted: (muted: boolean) => void;
  stop: () => void;
}

/** Streams the microphone as base64 16 kHz mono PCM chunks. Throws if the permission is denied. */
export async function startMicCapture(onChunk: (base64Pcm: string) => void): Promise<MicCapture> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
  });
  const context = new AudioContext();
  const blobUrl = URL.createObjectURL(new Blob([WORKLET_SOURCE], { type: "application/javascript" }));
  try {
    await context.audioWorklet.addModule(blobUrl);
  } finally {
    URL.revokeObjectURL(blobUrl);
  }

  const source = context.createMediaStreamSource(stream);
  const tap = new AudioWorkletNode(context, "pcm-tap");
  const downsampler = new Downsampler(context.sampleRate);
  tap.port.onmessage = (event: MessageEvent<Float32Array>) => {
    const pcm = downsampler.push(event.data);
    if (pcm.length > 0) onChunk(bytesToBase64(new Uint8Array(pcm.buffer)));
  };
  // The tap must be connected to run, but it produces no output, so nothing is played back to the student.
  source.connect(tap);
  tap.connect(context.destination);

  return {
    setMuted: (muted) => stream.getAudioTracks().forEach((track) => (track.enabled = !muted)),
    stop: () => {
      tap.port.onmessage = null;
      source.disconnect();
      tap.disconnect();
      stream.getTracks().forEach((track) => track.stop());
      void context.close();
    },
  };
}

export interface AudioPlayer {
  enqueue: (base64Pcm: string) => void;
  /** Playback speed for what arrives from now on (1 = as received). */
  setRate: (rate: number) => void;
  /** Drops everything queued (the student interrupted the tutor). */
  interrupt: () => void;
  /** True while queued audio is still playing. */
  isSpeaking: () => boolean;
  close: () => void;
}

export function createAudioPlayer(): AudioPlayer {
  const context = new AudioContext({ sampleRate: OUTPUT_RATE });
  let nextStart = 0;
  let rate = 1;
  let sources: AudioBufferSourceNode[] = [];

  return {
    setRate(next) {
      rate = Math.min(1.5, Math.max(0.5, next));
    },
    enqueue(base64Pcm) {
      const bytes = base64ToBytes(base64Pcm);
      const pcm = new Int16Array(bytes.buffer, bytes.byteOffset, Math.floor(bytes.byteLength / 2));
      if (pcm.length === 0) return;
      const buffer = context.createBuffer(1, pcm.length, OUTPUT_RATE);
      const channel = buffer.getChannelData(0);
      for (let i = 0; i < pcm.length; i += 1) channel[i] = pcm[i]! / 0x8000;
      const node = context.createBufferSource();
      node.buffer = buffer;
      node.playbackRate.value = rate;
      node.connect(context.destination);
      nextStart = Math.max(context.currentTime + 0.02, nextStart);
      node.start(nextStart);
      nextStart += buffer.duration / rate;
      sources.push(node);
      node.onended = () => {
        sources = sources.filter((source) => source !== node);
      };
      if (context.state === "suspended") void context.resume();
    },
    interrupt() {
      for (const node of sources) {
        node.onended = null;
        try {
          node.stop();
        } catch {
          // already finished
        }
      }
      sources = [];
      nextStart = 0;
    },
    isSpeaking: () => sources.length > 0,
    close() {
      sources = [];
      void context.close();
    },
  };
}
