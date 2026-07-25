/** Microphone capture for voice intake: mic -> 16 kHz mono PCM16 -> base64 frames.
 *
 * Uses an inline AudioWorklet (blob URL) so no separate static file is needed.
 * The worklet forwards Float32 blocks; downsampling to 16 kHz and PCM16
 * conversion happen on the main thread where the AudioContext rate is known.
 */

const WORKLET_SOURCE = `
class CaptureProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const channel = inputs[0]?.[0];
    if (channel) this.port.postMessage(channel.slice(0));
    return true;
  }
}
registerProcessor("ada-capture", CaptureProcessor);
`;

export interface MicSession {
  stop(): void;
}

export async function startMic(
  onFrame: (base64Pcm16: string) => void,
): Promise<MicSession> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
  });
  const ctx = new AudioContext();
  const workletUrl = URL.createObjectURL(
    new Blob([WORKLET_SOURCE], { type: "application/javascript" }),
  );
  await ctx.audioWorklet.addModule(workletUrl);
  URL.revokeObjectURL(workletUrl);

  const source = ctx.createMediaStreamSource(stream);
  const node = new AudioWorkletNode(ctx, "ada-capture");
  const ratio = ctx.sampleRate / 16000;

  node.port.onmessage = (event: MessageEvent<Float32Array>) => {
    const input = event.data;
    const outLength = Math.floor(input.length / ratio);
    if (outLength === 0) return;
    const pcm = new Int16Array(outLength);
    for (let i = 0; i < outLength; i++) {
      const sample = input[Math.floor(i * ratio)] ?? 0;
      pcm[i] = Math.max(-32768, Math.min(32767, Math.round(sample * 32767)));
    }
    onFrame(toBase64(pcm));
  };

  source.connect(node);
  node.connect(ctx.destination);

  return {
    stop() {
      node.disconnect();
      source.disconnect();
      for (const track of stream.getTracks()) track.stop();
      void ctx.close();
    },
  };
}

/** Streaming playback for Ada's voice: 24 kHz mono PCM16 chunks, gapless. */
export interface PcmPlayer {
  enqueue(base64Pcm16: string): void;
  /** Barge-in: drop everything queued and go quiet immediately. */
  flush(): void;
  stop(): void;
}

export function createPcmPlayer(sampleRate = 24000): PcmPlayer {
  const ctx = new AudioContext({ sampleRate });
  let nextTime = 0;
  let live: AudioBufferSourceNode[] = [];

  return {
    enqueue(base64Pcm16: string) {
      const binary = atob(base64Pcm16);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const pcm = new Int16Array(bytes.buffer, 0, Math.floor(bytes.length / 2));
      if (pcm.length === 0) return;
      const buffer = ctx.createBuffer(1, pcm.length, sampleRate);
      const channel = buffer.getChannelData(0);
      for (let i = 0; i < pcm.length; i++) channel[i] = pcm[i] / 32768;
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      live.push(source);
      source.onended = () => {
        live = live.filter((s) => s !== source);
      };
      const at = Math.max(ctx.currentTime, nextTime);
      source.start(at);
      nextTime = at + buffer.duration;
    },
    flush() {
      for (const source of live) {
        try {
          source.stop();
        } catch {
          /* already ended */
        }
      }
      live = [];
      nextTime = 0;
    },
    stop() {
      this.flush();
      void ctx.close();
    },
  };
}

function toBase64(pcm: Int16Array): string {
  const bytes = new Uint8Array(pcm.buffer, pcm.byteOffset, pcm.byteLength);
  let binary = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}
