import fs from "fs";
import path from "path";

export class SileroVAD {
  private session: any | undefined;
  private isLoaded = false;
  private state: Float32Array;

  constructor() {
    // Silero VAD state tensor requires 2x1x64 Float32 matrix initially populated with zeroes
    this.state = new Float32Array(2 * 1 * 64);
  }

  /**
   * Genuine loading of Silero VAD ONNX model using onnxruntime-node
   */
  async loadModel(): Promise<void> {
    try {
      // Dynamic string-based import of native ONNX Runtime Node dependency to prevent compile-time resolution blocks
      const ort = await import("" + "onnxruntime-node");
      
      const modelPath = path.resolve("resources/silero_vad.onnx");
      if (!fs.existsSync(modelPath)) {
        console.warn(`[SileroVAD] Local model not found at ${modelPath}. Silero ONNX weight file must be placed in resources directory.`);
        throw new Error("BLOCKED_VAD_MODEL_WEIGHTS_MISSING: Silero ONNX weight file is missing.");
      }

      console.log(`[SileroVAD] Loading genuine Silero model from: ${modelPath}...`);
      this.session = await ort.InferenceSession.create(modelPath);
      this.isLoaded = true;
      console.log("[SileroVAD] Model loaded successfully.");
    } catch (err: any) {
      console.warn("[SileroVAD] Failed to initialize native ONNX Runtime loader:", err.message);
      throw new Error(`RUNTIME_BLOCKED_ONNX_LOAD_FAILED: Native onnxruntime-node compiled binary failed to load. ${err.message}`);
    }
  }

  /**
   * Feed a genuine 16kHz Mono Float32 PCM sample array into the Silero model inference session
   * Returns speech probability between 0.0 and 1.0
   */
  async calculateSpeechProbability(pcmFloat32: Float32Array): Promise<number> {
    if (!this.isLoaded || !this.session) {
      throw new Error("RUNTIME_BLOCKED_ONNX_LOAD_FAILED: Silero VAD model session is not loaded.");
    }

    try {
      const ort = await import("" + "onnxruntime-node");
      
      // Wrap standard inputs into model-expected Tensors
      const inputTensor = new ort.Tensor("float32", pcmFloat32, [1, pcmFloat32.length]);
      const srTensor = new ort.Tensor("int64", new BigInt64Array([16000n]), []);
      const stateTensor = new ort.Tensor("float32", this.state, [2, 1, 64]);

      // Execute Silero ONNX VAD inference
      const feeds = {
        input: inputTensor,
        sr: srTensor,
        state: stateTensor
      };

      const results = await this.session.run(feeds);
      
      // Update state matrix with output state tensor for sequential audio frame memory
      const outputState = results.output_state.data as Float32Array;
      this.state.set(outputState);

      // Speech probability output tensor
      const outputProb = results.output.data as Float32Array;
      return outputProb[0] || 0.0;
    } catch (err: any) {
      console.error("[SileroVAD] Inference runtime failure:", err.message);
      return 0.0;
    }
  }

  /**
   * Reset Silero VAD session history state
   */
  resetState(): void {
    this.state.fill(0);
  }
}
