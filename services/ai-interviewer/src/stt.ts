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
      const formData = new FormData();
      const blob = new Blob([new Uint8Array(audioBuffer)], { type: "audio/wav" });
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
      const response = await fetch("https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true", {
        method: "POST",
        headers: {
          "Authorization": `Token ${this.apiKey}`,
          "Content-Type": "audio/wav"
        },
        body: audioBuffer
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
