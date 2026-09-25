import { Room, RoomEvent, RemoteTrack, TrackKind, AudioStream, AudioSource, LocalAudioTrack, AudioFrame, TrackPublishOptions } from "@livekit/rtc-node";
import { type JobContext } from "@livekit/agents";
import dotenv from "dotenv";
import { STTFactory } from "./stt.js";
import { TTSFactory } from "./tts.js";
import { LiveKitEgressRecordingService } from "./recording.js";
import { SessionService, SessionContext } from "./session.js";
import { SileroVAD } from "./vad.js";

dotenv.config();

export class RealtimeAIInterviewAgent {
  private sessionId: string;
  private ctx: JobContext;
  private room: Room | undefined;
  private egressId: string | undefined;
  
  private sessionService: SessionService;
  private recordingService: LiveKitEgressRecordingService;
  private vad: SileroVAD;

  // Diagnostic counters
  private audioFramesReceived = 0;
  private audioBytesReceived = 0;
  private speechFramesDetected = 0;
  private lastAudioFrameAt: string | undefined;
  private candidateAudioTrackSid: string | undefined;

  constructor(ctx: JobContext, sessionId: string) {
    this.ctx = ctx;
    this.sessionId = sessionId;
    this.sessionService = new SessionService();
    this.recordingService = new LiveKitEgressRecordingService();
    this.vad = new SileroVAD();
  }

  /**
   * Executes the real-time WebRTC media agent thread loop adapted to LiveKit Managed Agents
   */
  async startAgentLoop(): Promise<void> {
    console.log(`[RealtimeAgent] Bootstrapping real-time loop from JobContext for session: ${this.sessionId}...`);
    await this.sessionService.updateAgentState(this.sessionId, "CONNECTING");

    try {
      // 1. Zero-trust validation and verification
      const ctx = await this.sessionService.loadAndVerifySession(this.sessionId);
      console.log(`[RealtimeAgent] Session verified. Candidate consent verified at: ${ctx.consent.consentTimestamp}`);

      // 2. Load genuine Silero VAD ONNX model session
      try {
        await this.vad.loadModel();
      } catch (vadErr: any) {
        console.warn("[RealtimeAgent] Silero VAD ONNX runtime not pre-compiled or loaded. Pipeline is restricted:", vadErr.message);
      }

      // 3. Start LiveKit Egress Recording prior to media connections
      try {
        const roomName = this.sessionId;
        this.egressId = await this.recordingService.startRecording(this.sessionId, roomName, ctx.interviewId, ctx.candidateId);
        console.log(`[RealtimeAgent] Recording initiated successfully with Egress ID: ${this.egressId}`);
      } catch (recErr: any) {
        console.warn("[RealtimeAgent] Recording initialization failed/blocked:", recErr.message);
      }

      // 4. Bind connected room directly from JobContext
      this.room = this.ctx.room;
      console.log(`[RealtimeAgent] Successfully bound to LiveKit room ${this.sessionId} as a managed WebRTC media peer.`);
      await this.sessionService.updateAgentState(this.sessionId, "CONNECTED");

      // 5. Register Remote Track Subscription events to capture candidate audio
      this.room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => {
        if (track.kind === TrackKind.KIND_AUDIO) {
          console.log(`[RealtimeAgent] Genuinely subscribed to candidate's RemoteAudioTrack: ${track.sid}`);
          this.candidateAudioTrackSid = track.sid;
          this.subscribeCandidateAudio(track, ctx);
        }
      });

      // 5b. Enumerate existing remote participants and audio tracks (handles candidate pre-joining)
      for (const participant of this.room.remoteParticipants.values()) {
        console.log(`[RealtimeAgent] Detected pre-existing remote participant in room: ${participant.identity}`);
        for (const trackPublication of participant.trackPublications.values()) {
          if (trackPublication.track && trackPublication.track.kind === TrackKind.KIND_AUDIO) {
            console.log(`[RealtimeAgent] Subscribing to pre-existing candidate RemoteAudioTrack: ${trackPublication.track.sid}`);
            this.candidateAudioTrackSid = trackPublication.track.sid;
            this.subscribeCandidateAudio(trackPublication.track as RemoteTrack, ctx);
          }
        }
      }

      this.room.on(RoomEvent.Disconnected, async () => {
        console.log("[RealtimeAgent] Participant disconnected from LiveKit.");
        await this.sessionService.updateAgentState(this.sessionId, "DISCONNECTED");
      });

      // 6. IMMEDIATELY Speak the Initial Question so candidate hears AI speech without deadlock
      const initialQuestion = ctx.currentQuestion || "Hello! Welcome to your HireNest AI interview. Let's begin with our first question.";
      console.log(`[RealtimeAgent] Speaking initial question immediately: "${initialQuestion}"`);
      await this.sessionService.logTranscriptEvent(ctx, "AI", initialQuestion, 1, "q_initial", 1);
      
      try {
        const ttsProvider = TTSFactory.getProvider();
        const ttsOutput = await ttsProvider.synthesize(initialQuestion);
        await this.publishAIAudio(ttsOutput.pcm, ttsOutput.sampleRate);
      } catch (ttsErr: any) {
        console.warn("[RealtimeAgent] Initial question TTS synthesis warning:", ttsErr?.message || ttsErr);
        await this.sessionService.updateAgentState(this.sessionId, "LISTENING");
      }

    } catch (err: any) {
      console.error("[RealtimeAgent] Media pipeline execution failure:", err.message);
      await this.sessionService.updateAgentState(this.sessionId, "ERROR", err.message);
      throw err;
    }
  }

  /**
   * Subscribes to and consumes raw AudioFrame streams from the RemoteAudioTrack
   */
  private async subscribeCandidateAudio(track: RemoteTrack, ctx: SessionContext): Promise<void> {
    // Explicitly request 16000 Hz, 1 channel (mono) 16-bit PCM AudioStream from LiveKit
    const audioStream = new AudioStream(track, 16000, 1);
    let pcmAccumulator: Int16Array = new Int16Array(0);
    let vadBufferFloat32: Float32Array = new Float32Array(0);
    let isSpeechActive = false;
    let silenceCounter = 0;

    console.log("[RealtimeAgent] Spawning live WebRTC audio frame consumption stream (16kHz mono)...");

    try {
      for await (const frame of audioStream) {
        this.audioFramesReceived++;
        this.audioBytesReceived += frame.data.byteLength;
        this.lastAudioFrameAt = new Date().toISOString();

        // Convert 16-bit PCM frame data to Float32
        const pcmFloat32 = this.convertToFloat32(frame.data);
        
        // Append incoming float32 samples to vadBufferFloat32
        const combinedVadBuffer = new Float32Array(vadBufferFloat32.length + pcmFloat32.length);
        combinedVadBuffer.set(vadBufferFloat32, 0);
        combinedVadBuffer.set(pcmFloat32, vadBufferFloat32.length);
        vadBufferFloat32 = combinedVadBuffer;

        // Silero VAD requires exact 512-sample windows at 16kHz (32ms of audio)
        let isSpeakingInFrame = false;
        while (vadBufferFloat32.length >= 512) {
          const window512 = vadBufferFloat32.subarray(0, 512);
          vadBufferFloat32 = vadBufferFloat32.subarray(512);

          let prob = 0;
          try {
            prob = await this.vad.calculateSpeechProbability(window512);
          } catch (vadErr: any) {
            console.error("[RealtimeAgent] VAD inference failure - marking session DEGRADED:", vadErr.message);
            await this.sessionService.updateAgentState(this.sessionId, "DEGRADED", vadErr.message);
            throw vadErr; // Fail fast without fake RMS fallbacks
          }

          if (prob > 0.45) {
            isSpeakingInFrame = true;
          }
        }

        if (isSpeakingInFrame) {
          this.speechFramesDetected++;
          silenceCounter = 0;
          
          // Accumulate Int16 samples for STT transcription
          const nextAcc = new Int16Array(pcmAccumulator.length + frame.data.length);
          nextAcc.set(pcmAccumulator, 0);
          nextAcc.set(frame.data, pcmAccumulator.length);
          pcmAccumulator = nextAcc;

          if (!isSpeechActive) {
            isSpeechActive = true;
            await this.sessionService.updateAgentState(this.sessionId, "LISTENING");
          }
        } else {
          if (isSpeechActive) {
            silenceCounter++;
            // If silence has persisted for ~1.5 seconds (approx. 75 frames of 20ms)
            if (silenceCounter > 75) {
              isSpeechActive = false;
              silenceCounter = 0;
              
              // Extract the complete captured speech segment and hand it to STT and AIGateway
              const speechSegment = Buffer.from(pcmAccumulator.buffer, pcmAccumulator.byteOffset, pcmAccumulator.byteLength);
              pcmAccumulator = new Int16Array(0); // Flush buffer for next dialog round
              this.vad.resetState();

              await this.processCandidateResponse(speechSegment, ctx);
            }
          }
        }
      }
    } catch (streamErr: any) {
      console.error("[RealtimeAgent] AudioStream tracking exception:", streamErr.message);
    }
  }

  /**
   * Helper: Normalize 16-bit signed PCM frames to Float32 sample inputs for Silero model tensors
   */
  private convertToFloat32(int16Array: Int16Array): Float32Array {
    const float32Array = new Float32Array(int16Array.length);
    for (let i = 0; i < int16Array.length; i++) {
      float32Array[i] = int16Array[i] / 32768.0;
    }
    return float32Array;
  }

  /**
   * Process candidate answers and fetch questions from AIGateway
   */
  private async processCandidateResponse(audioBuffer: Buffer, ctx: SessionContext): Promise<void> {
    await this.sessionService.updateAgentState(this.sessionId, "THINKING");

    try {
      // 1. STT provider validation
      const sttProvider = STTFactory.getProvider();
      const sttResponse = await sttProvider.transcribe(audioBuffer);
      console.log(`[RealtimeAgent] Decoded candidate speech: "${sttResponse.text}"`);

      // 2. Submit transcript back to central HireNest platform for evaluation and next question generation
      const centralUrl = process.env.AI_INTERVIEWER_SERVICE_URL || "https://os.hirenestworkforce.com";
      const serviceToken = process.env.AI_INTERVIEWER_SERVICE_TOKEN;

      if (!serviceToken) {
        throw new Error("BLOCKED_AI_GATEWAY_AUTHENTICATION_REQUIRED: Service authorization keys are missing.");
      }

      console.log(`[RealtimeAgent] Communicating transcript with central platform API: ${centralUrl}...`);
      const response = await fetch(`${centralUrl}/api/candidates/screen`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${serviceToken}`
        },
        body: JSON.stringify({
          action: "submit-answer",
          sessionId: ctx.sessionId,
          answer: sttResponse.text
        })
      });

      if (!response.ok) {
        throw new Error(`Central platform API returned HTTP ${response.status}`);
      }

      const data: any = await response.json();
      const nextQuestion = data.nextQuestion || "Thank you. Let's proceed with the evaluation.";

      // 3. Log transcripts into the database
      await this.sessionService.logTranscriptEvent(ctx, "CANDIDATE", sttResponse.text, 1, "q_curr", this.audioFramesReceived);
      await this.sessionService.logTranscriptEvent(ctx, "AI", nextQuestion, 1, "q_next", this.audioFramesReceived + 1);

      // 4. Synthesize TTS voice bytes for the next question
      const ttsProvider = TTSFactory.getProvider();
      const ttsOutput = await ttsProvider.synthesize(nextQuestion);

      // 5. Publish real audio track back to the room
      await this.publishAIAudio(ttsOutput.pcm, ttsOutput.sampleRate);

    } catch (err: any) {
      console.error("[RealtimeAgent] Pipeline failed during processing:", err.message);
      await this.sessionService.updateAgentState(this.sessionId, "ERROR", err.message);
      throw err;
    }
  }

  /**
   * Publishes synthesized PCM audio stream into the LiveKit room
   */
  private async publishAIAudio(pcmBytes: Buffer, sampleRate: number): Promise<void> {
    if (!this.room) {
      throw new Error("LIVEKIT_ROOM_DISCONNECTED: Cannot publish audio to disconnected session.");
    }

    await this.sessionService.updateAgentState(this.sessionId, "SPEAKING");
    console.log(`[RealtimeAgent] Publishing synthesized TTS voice track (${pcmBytes.length} bytes @ ${sampleRate}Hz) to candidates...`);

    try {
      // 1. Create a genuine, non-mock AudioSource in specified sample rate mono PCM
      const audioSource = new AudioSource(sampleRate, 1);
      
      // 2. Instantiate LocalAudioTrack using native static constructor
      const localTrack = LocalAudioTrack.createAudioTrack("tts_voice", audioSource);

      // 3. Publish track to the LiveKit room
      const publishOptions = new TrackPublishOptions({});
      const localParticipant = this.room.localParticipant;
      if (!localParticipant) {
        throw new Error("Local participant not registered inside the LiveKit room.");
      }
      
      const publication = await localParticipant.publishTrack(localTrack, publishOptions);
      console.log(`[RealtimeAgent] TTS AudioTrack published successfully: SID: ${publication.sid}`);

      // 4. Wrap raw PCM bytes into Int16 sample array
      const int16Samples = new Int16Array(
        pcmBytes.buffer,
        pcmBytes.byteOffset,
        pcmBytes.length / 2
      );

      // 5. Stream PCM samples in 20ms chunks (e.g. 320 samples for 16kHz, 480 samples for 24kHz)
      const sampleFrameSize = Math.floor(sampleRate * 0.02);
      for (let i = 0; i < int16Samples.length; i += sampleFrameSize) {
        const chunk = int16Samples.subarray(i, i + sampleFrameSize);
        if (chunk.length > 0) {
          const frame = new AudioFrame(chunk, sampleRate, 1, chunk.length);
          await audioSource.captureFrame(frame);
          // Wait 20ms to stream in real-time speed
          await new Promise((resolve) => setTimeout(resolve, 20));
        }
      }

      // 6. Unpublish track after complete playback is streamed
      await localParticipant.unpublishTrack(publication.sid!);
      console.log("[RealtimeAgent] TTS AudioTrack stream completed and unpublished.");

      await this.sessionService.updateAgentState(this.sessionId, "LISTENING");
    } catch (err: any) {
      console.error("[RealtimeAgent] Failed to publish audio track:", err.message);
      await this.sessionService.updateAgentState(this.sessionId, "ERROR", err.message);
    }
  }

  /**
   * Cleanly tear down connections and finalize recording egresses
   */
  async terminateSession(): Promise<void> {
    console.log(`[RealtimeAgent] Initiating clean termination for session: ${this.sessionId}...`);

    try {
      if (this.egressId) {
        await this.recordingService.stopRecording(this.egressId, this.sessionId);
      }
      
      if (this.room) {
        await this.room.disconnect();
      }

      await this.sessionService.updateAgentState(this.sessionId, "DISCONNECTED");
    } catch (err: any) {
      console.error("[RealtimeAgent] Error during clean disconnect:", err.message);
    }
  }
}
