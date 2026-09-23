import dotenv from "dotenv";

dotenv.config();

export interface TTSOutput {
  pcm: Buffer;
  sampleRate: number;
}

export interface TTSProvider {
  synthesize(text: string): Promise<TTSOutput>;
}

export class ElevenLabsTTSProvider implements TTSProvider {
  private apiKey: string | undefined;
  private voiceId: string;

  constructor() {
    this.apiKey = process.env.ELEVENLABS_API_KEY;
    this.voiceId = process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM"; // Default Rachel Voice
  }

  async synthesize(text: string): Promise<TTSOutput> {
    if (!this.apiKey) {
      throw new Error("BLOCKED_TTS_CONFIGURATION_REQUIRED: ElevenLabs ELEVENLABS_API_KEY is not configured.");
    }

    try {
      // Direct raw 16kHz mono 16-bit PCM streaming
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${this.voiceId}?output_format=pcm_16000`, {
        method: "POST",
        headers: {
          "xi-api-key": this.apiKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_monolingual_v1",
          voice_settings: {
            stability: 0.75,
            similarity_boost: 0.75
          }
        })
      });

      if (!response.ok) {
        throw new Error(`ElevenLabs API responded with HTTP ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      return {
        pcm: Buffer.from(arrayBuffer),
        sampleRate: 16000
      };
    } catch (err: any) {
      console.error("[ElevenLabsTTSProvider] Synthesize failed:", err.message);
      throw new Error(`AI_INTERVIEW_TTS_FAILED: ${err.message}`);
    }
  }
}

export class OpenAITTSProvider implements TTSProvider {
  private apiKey: string | undefined;

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY;
  }

  async synthesize(text: string): Promise<TTSOutput> {
    if (!this.apiKey) {
      throw new Error("BLOCKED_TTS_CONFIGURATION_REQUIRED: OpenAI OPENAI_API_KEY is not configured.");
    }

    try {
      const response = await fetch("https://api.openai.com/v1/audio/speech", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "tts-1",
          input: text,
          voice: "alloy",
          response_format: "pcm" // Standard OpenAI PCM is 24kHz 16-bit mono
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI Speech API responded with HTTP ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      return {
        pcm: Buffer.from(arrayBuffer),
        sampleRate: 24000
      };
    } catch (err: any) {
      console.error("[OpenAITTSProvider] Synthesize failed:", err.message);
      throw new Error(`AI_INTERVIEW_TTS_FAILED: ${err.message}`);
    }
  }
}

export class TTSFactory {
  static getProvider(): TTSProvider {
    const providerType = (process.env.AI_INTERVIEW_TTS_PROVIDER || process.env.TTS_PROVIDER || "elevenlabs").toLowerCase();
    if (providerType === "openai") {
      return new OpenAITTSProvider();
    }
    return new ElevenLabsTTSProvider();
  }
}
