import dotenv from "dotenv";

dotenv.config();

export interface STTResponse {
  text: string;
  confidence?: number;
  duration?: number;
  provider: string;
  model: string;
}

export interface STTProvider {
  transcribe(audioBuffer: Buffer): Promise<STTResponse>;
}

export function createWavHeader(dataLength: number, sampleRate = 16000, numChannels = 1, bitsPerSample = 16): Buffer {
  const header = Buffer.alloc(44);
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);

  // RIFF identifier
  header.write("RIFF", 0);
  // RIFF chunk size
  header.writeUInt32LE(36 + dataLength, 4);
  // RIFF type
  header.write("WAVE", 8);

  // format chunk identifier
  header.write("fmt ", 12);
  // format chunk length
  header.writeUInt32LE(16, 16);
  // sample format (1 = PCM)
  header.writeUInt16LE(1, 20);
  // channel count
  header.writeUInt16LE(numChannels, 22);
  // sample rate
  header.writeUInt32LE(sampleRate, 24);
  // byte rate
  header.writeUInt32LE(byteRate, 28);
  // block align
  header.writeUInt16LE(blockAlign, 32);
  // bits per sample
  header.writeUInt16LE(bitsPerSample, 34);

  // data chunk identifier
  header.write("data", 36);
  // data chunk length
  header.writeUInt32LE(dataLength, 40);

  return header;
}

export function pcmToWav(pcmBuffer: Buffer, sampleRate = 16000, numChannels = 1, bitsPerSample = 16): Buffer {
  const header = createWavHeader(pcmBuffer.length, sampleRate, numChannels, bitsPerSample);
  return Buffer.concat([header, pcmBuffer]);
}

export class WhisperSTTProvider implements STTProvider {
  private apiKey: string | undefined;
  private endpoint: string;

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || process.env.WHISPER_API_KEY;
    this.endpoint = process.env.WHISPER_ENDPOINT || "https://api.openai.com/v1/audio/transcriptions";
  }

  async transcribe(audioBuffer: Buffer): Promise<STTResponse> {
    if (!this.apiKey || (this.endpoint.includes("openai.com") && this.apiKey === "devkey")) {
      throw new Error("BLOCKED_STT_CONFIGURATION_REQUIRED: Whisper WHISPER_API_KEY is not configured.");
    }

    try {
      const wavBuffer = pcmToWav(audioBuffer, 16000, 1, 16);
      const formData = new FormData();
      const blob = new Blob([new Uint8Array(wavBuffer)], { type: "audio/wav" });
      formData.append("file", blob, "chunk.wav");
      formData.append("model", "whisper-1");
      formData.append("language", "en");

      const response = await fetch(this.endpoint, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Whisper API responded with HTTP ${response.status}`);
      }

      const data: any = await response.json();
      const text = data.text || "";

      return {
        text,
        confidence: 1.0,
        duration: Math.round(audioBuffer.length / 32000), // Approx 16kHz 16-bit mono duration
        provider: "whisper",
        model: "whisper-1"
      };
    } catch (err: any) {
      console.error("[WhisperSTTProvider] Transcription failed:", err.message);
      throw new Error(`AI_INTERVIEW_STT_FAILED: ${err.message}`);
    }
  }
}

export class DeepgramSTTProvider implements STTProvider {
  private apiKey: string | undefined;

  constructor() {
    this.apiKey = process.env.DEEPGRAM_API_KEY;
  }

  async transcribe(audioBuffer: Buffer): Promise<STTResponse> {
    if (!this.apiKey) {
      throw new Error("BLOCKED_STT_CONFIGURATION_REQUIRED: Deepgram DEEPGRAM_API_KEY is not configured.");
    }

    try {
      const wavBuffer = pcmToWav(audioBuffer, 16000, 1, 16);
      const response = await fetch("https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true", {
        method: "POST",
        headers: {
          "Authorization": `Token ${this.apiKey}`,
          "Content-Type": "audio/wav"
        },
        body: wavBuffer
      });

      if (!response.ok) {
        throw new Error(`Deepgram responded with HTTP ${response.status}`);
      }

      const data: any = await response.json();
      const text = data.results?.channels?.[0]?.alternatives?.[0]?.transcript || "";

      return {
        text,
        confidence: data.results?.channels?.[0]?.alternatives?.[0]?.confidence || 1.0,
        duration: data.metadata?.duration || 0,
        provider: "deepgram",
        model: "nova-2"
      };
    } catch (err: any) {
      console.error("[DeepgramSTTProvider] Transcription failed:", err.message);
      throw new Error(`AI_INTERVIEW_STT_FAILED: ${err.message}`);
    }
  }
}

export class STTFactory {
  static getProvider(): STTProvider {
    const providerType = (process.env.AI_INTERVIEW_STT_PROVIDER || process.env.STT_PROVIDER || "whisper").toLowerCase();
    if (providerType === "deepgram") {
      return new DeepgramSTTProvider();
    }
    return new WhisperSTTProvider();
  }
}
