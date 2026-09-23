# HireNestOS Managed LiveKit Cloud Agent E2E Validation

This document establishes the production validation matrix, infrastructure specifications, and runtime test results for the managed **LiveKit Agents Node.js** worker.

---

## 🏗️ 1. INFRASTRUCTURE & PLATFORM MATRIX

| Resource | Value / Target | Notes |
| :--- | :--- | :--- |
| **Worker Host** | LiveKit Cloud Managed Container / Azure VM Daemon | Worker registers with LiveKit Cloud control plane |
| **Node.js Environment** | Node.js v24.x | Target runtime for `@livekit/agents` worker |
| **C++ Build Chain** | gcc-11, g++-11, make, python3 | Required for compilation of native `@livekit/rtc-node` and `onnxruntime-node` |
| **Orchestration** | Managed Job Dispatching | Subprocesses are dynamically spawned by LiveKit Cloud on incoming rooms |

---

## 📊 2. E2E INTEGRATION & READINESS STATUS

* **Current Build Status**: 🟢 **CODE COMPLETE & COMPILING**
* **Deployment Automation**: 🟢 **PREPARED** (`/services/ai-interviewer/deploy_runbook.sh`)
* **Live Runtime Status**: 🔴 **RUNTIME BLOCKED — INFRASTRUCTURE REQUIRED**

### Detailed Component Verification Matrix

| Step | Component | Status | Verification Criteria | Missing Infrastructure Dependency |
| :---: | :--- | :---: | :--- | :--- |
| **1** | **LiveKit Worker Reg** | 🔴 **BLOCKED** | Worker boots and registers with LiveKit Cloud over WebSockets | `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` |
| **2** | **Job Dispatched Link** | 🔴 **BLOCKED** | LiveKit Cloud creates a subprocess job on room instantiation | Candidate joining room |
| **3** | **JobContext Connect** | 🔴 **BLOCKED** | Subprocess connects via `ctx.connect()` and joins room as peer | Active room token |
| **4** | **PCM Frame Extraction** | 🔴 **BLOCKED** | Subscribes to `RemoteAudioTrack` and receives raw Int16 samples | Candidate microphone feed |
| **5** | **Silero VAD Inference** | 🔴 **BLOCKED** | Executes actual ONNX model to segment speech bounds (SPEECH_START/END) | `onnxruntime-node` compiled bindings |
| **6** | **Server-Side STT** | 🔴 **BLOCKED** | Transcribes segmented audio buffers using server-side API | `WHISPER_API_KEY` or `DEEPGRAM_API_KEY` |
| **7** | **Strategic AI Gateway** | 🟢 **PASS** | Communicates transcripts through secure central platform API | *None (Code verified and auth-hardened)* |
| **8** | **Adaptive Decision Engine** | 🟢 **PASS** | Generates dynamic next questions from JD/Resume context | *None (Central platform integration active)* |
| **9** | **Server-Side TTS** | 🔴 **BLOCKED** | Synthesizes voice PCM buffers natively (16kHz or 24kHz) | `ELEVENLABS_API_KEY` or `OPENAI_API_KEY` |
| **10** | **LiveKit Audio Stream** | 🔴 **BLOCKED** | Streams PCM samples in 20ms chunks into native AudioSource | Published local audio track |
| **11** | **S3 composite Egress** | 🔴 **BLOCKED** | Triggers RoomComposite MP4 record piped directly to bucket | `LIVEKIT_EGRESS_S3_BUCKET` & AWS S3 Keys |
| **12** | **Consent Verification** | 🟢 **PASS** | Strictly enforces `consentGiven === true` before record starts | *None (Enforced at DB & schema layers)* |
| **13** | **Zero-Trust Security** | 🟢 **PASS** | Worker endpoint `submit-answer` secured with pre-shared key | *None (Pre-shared token gate active)* |

---

## 🔒 3. DETAILED INFRASTRUCTURE BLOCKED DEPS LIST

To run a real E2E test, the following environment variables must be populated inside `/services/ai-interviewer/.env`:

1. **`LIVEKIT_URL` / `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET`**: Required to register the worker daemon with LiveKit Cloud.
2. **`WHISPER_API_KEY` / `DEEPGRAM_API_KEY`**: Required to perform server-side voice-to-text transcribing without browser dependencies.
3. **`ELEVENLABS_API_KEY` / `OPENAI_API_KEY`**: Required to generate high-fidelity, signed 16-bit Mono PCM synthesized voice tracks.
4. **`LIVEKIT_EGRESS_S3_BUCKET` / `LIVEKIT_EGRESS_AWS_ACCESS_KEY_ID` / `LIVEKIT_EGRESS_AWS_SECRET_ACCESS_KEY`**: Required for RoomComposite S3 upload streams.
5. **`silero_vad.onnx` Weights File**: Must be placed in `/services/ai-interviewer/resources/` (can be downloaded automatically using `deploy_runbook.sh`).

---

## 🛠️ 4. HOW TO RUN HEALTH MONITORING

Once deployed, you can poll each underlying subsystem's readiness directly using these lightweight endpoints:

```bash
# 1. Check general system metrics
curl http://localhost:3001/health

# 2. Check LiveKit Cloud connectivity state
curl http://localhost:3001/health/livekit

# 3. Check STT provider keys state
curl http://localhost:3001/health/stt

# 4. Check TTS provider keys state
curl http://localhost:3001/health/tts

# 5. Check Silero VAD local model file state
curl http://localhost:3001/health/vad

# 6. Check Egress client configurations
curl http://localhost:3001/health/egress

# 7. Check central HireNest platform auth gateway
curl http://localhost:3001/health/aigateway

# 8. Check S3 upload credentials
curl http://localhost:3001/health/storage
```
