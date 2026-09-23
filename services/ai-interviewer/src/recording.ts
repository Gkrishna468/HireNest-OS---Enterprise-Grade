import { EgressClient, EncodedFileOutput, S3Upload } from "livekit-server-sdk";
import dotenv from "dotenv";
import { adminDb } from "./firebase.js";

dotenv.config();

export interface RecordingMetadata {
  recordingId: string;
  egressId?: string;
  roomName: string;
  sessionId: string;
  interviewId: string;
  candidateId: string;
  status: "STARTING" | "RECORDING" | "COMPLETED" | "FAILED";
  startedAt: string;
  completedAt?: string;
  duration?: number;
  storagePath?: string;
  contentType: string;
}

export class LiveKitEgressRecordingService {
  private egressClient: EgressClient | undefined;

  constructor() {
    const livekitUrl = process.env.LIVEKIT_URL;
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (livekitUrl && apiKey && apiSecret) {
      this.egressClient = new EgressClient(livekitUrl, apiKey, apiSecret);
    }
  }

  /**
   * Start a LiveKit RoomComposite Egress recording of the candidate session
   */
  async startRecording(sessionId: string, roomName: string, interviewId: string, candidateId: string): Promise<string> {
    const timestamp = new Date().toISOString();
    const recordingId = `rec_${Math.floor(Math.random() * 1000000)}`;

    if (!this.egressClient) {
      console.warn("[RecordingService] Egress Client not initialized. Missing credentials.");
      await this.logRecordingState({
        recordingId,
        roomName,
        sessionId,
        interviewId,
        candidateId,
        status: "FAILED",
        startedAt: timestamp,
        contentType: "video/mp4"
      });
      throw new Error("BLOCKED_LIVEKIT_EGRESS_REQUIRED: LiveKit Egress client requires active LIVEKIT_URL, API_KEY, and API_SECRET.");
    }

    try {
      const bucket = process.env.LIVEKIT_EGRESS_S3_BUCKET || "hirenest-interview-recordings";
      const key = `interviews/${interviewId}/${sessionId}/recording.mp4`;

      // Structuring output options matching livekit-server-sdk v2 definitions
      const s3Config = new S3Upload({
        accessKey: process.env.LIVEKIT_EGRESS_AWS_ACCESS_KEY_ID || "",
        secret: process.env.LIVEKIT_EGRESS_AWS_SECRET_ACCESS_KEY || "",
        bucket: bucket,
        region: "us-east-1"
      });

      const fileOutput = new EncodedFileOutput({
        filepath: key,
        output: {
          case: "s3",
          value: s3Config
        }
      });

      console.log(`[RecordingService] Launching LiveKit RoomComposite Egress for room: ${roomName}...`);
      const egressInfo = await this.egressClient.startRoomCompositeEgress(roomName, {
        file: fileOutput
      });

      await this.logRecordingState({
        recordingId,
        egressId: egressInfo.egressId,
        roomName,
        sessionId,
        interviewId,
        candidateId,
        status: "RECORDING",
        startedAt: timestamp,
        storagePath: `s3://${bucket}/${key}`,
        contentType: "video/mp4"
      });

      return egressInfo.egressId;
    } catch (err: any) {
      console.error("[RecordingService] Failed to start RoomComposite Egress:", err.message);
      await this.logRecordingState({
        recordingId,
        roomName,
        sessionId,
        interviewId,
        candidateId,
        status: "FAILED",
        startedAt: timestamp,
        contentType: "video/mp4"
      });
      throw new Error(`RECORDING_FAILED: ${err.message}`);
    }
  }

  /**
   * Stop an active LiveKit Egress recording
   */
  async stopRecording(egressId: string, sessionId: string): Promise<void> {
    if (!this.egressClient) {
      throw new Error("BLOCKED_LIVEKIT_EGRESS_REQUIRED: Cannot stop recording, Egress client not active.");
    }

    try {
      console.log(`[RecordingService] Requesting termination for Egress ID: ${egressId}...`);
      await this.egressClient.stopEgress(egressId);

      const docRef = adminDb.collection("interview_recordings").doc(sessionId);
      await docRef.update({
        status: "COMPLETED",
        completedAt: new Date().toISOString()
      });
    } catch (err: any) {
      console.error("[RecordingService] Failed to cleanly terminate egress session:", err.message);
      const docRef = adminDb.collection("interview_recordings").doc(sessionId);
      await docRef.update({
        status: "FAILED"
      });
    }
  }

  private async logRecordingState(meta: RecordingMetadata): Promise<void> {
    try {
      await adminDb.collection("interview_recordings").doc(meta.sessionId).set(meta, { merge: true });
    } catch (dbErr: any) {
      console.error("[RecordingService] Failed to log recording metadata to Firestore:", dbErr.message);
    }
  }
}
