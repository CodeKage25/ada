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

function toBase64(pcm: Int16Array): string {
  const bytes = new Uint8Array(pcm.buffer, pcm.byteOffset, pcm.byteLength);
  let binary = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}
