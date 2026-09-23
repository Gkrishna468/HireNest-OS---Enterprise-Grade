#!/bin/bash
# ==============================================================================
# HIRENEST-OS REALTIME LIVEKIT CLOUD AGENT — AZURE & LIVEKIT DEPLOYMENT RUNBOOK
# ==============================================================================
# This shell script prepares, compiles, and launches the managed LiveKit Agent
# worker, fully integrated with LiveKit Cloud and LiveKit Components-React.
#
# Execution: chmod +x deploy_runbook.sh && ./deploy_runbook.sh
# ==============================================================================

set -e

echo "🚦 Starting HireNest Realtime LiveKit Managed Agent Provisioning..."

# 1. Update system packages and install compiler tools for native node-gyp bindings
echo "📦 Installing build essential tools and Node.js 24..."
sudo apt-get update -y
sudo apt-get install -y build-essential python3 curl wget git

# Install Node.js v24 if not already present
if ! command -v node &> /dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi

node -v
npm -v

# 2. Setup production folders and weight files
echo "📂 Creating weights directory for Silero VAD neural network..."
mkdir -p resources

# Download official genuine Silero VAD v4 weights (required for neural speech inference)
if [ ! -f "resources/silero_vad.onnx" ]; then
  echo "📥 Downloading genuine Silero VAD ONNX weights..."
  wget -O resources/silero_vad.onnx https://github.com/snakers4/silero_vad/raw/master/files/silero_vad.onnx
  echo "✅ Weights loaded into /resources/silero_vad.onnx"
else
  echo "✅ Silero VAD ONNX weights already present."
fi

# 3. Install production dependencies and trigger native compiler bindings
echo "🔨 Running npm install and triggering native Node bindings compilation..."
npm install --production --no-workspaces

# Verify compilation output
echo "🔍 Verifying node_modules compilation states..."
find node_modules/@livekit/rtc-node/ -name "*.node" || echo "Warning: No compiled WebRTC static binaries found."
find node_modules/onnxruntime-node/ -name "*.node" || echo "Warning: No compiled ONNX runtime static binaries found."

# 4. Environment Template Setup
if [ ! -f ".env" ]; then
  echo "📝 Creating production .env template..."
  cat <<EOT > .env
# --- LIVEKIT CLOUD HANDSHAKE ---
LIVEKIT_URL=wss://your-livekit-project.livekit.cloud
LIVEKIT_API_KEY=your_livekit_key_id
LIVEKIT_API_SECRET=your_livekit_api_secret

# --- COGNITIVE AI PROVIDERS ---
STT_PROVIDER=whisper
WHISPER_API_KEY=your_openai_or_whisper_token

TTS_PROVIDER=elevenlabs
ELEVENLABS_API_KEY=your_elevenlabs_api_key
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM # default Rachel Voice

# --- STORAGE & RECORDING (S3 TARGET) ---
LIVEKIT_EGRESS_S3_BUCKET=hirenest-interview-recordings
LIVEKIT_EGRESS_AWS_ACCESS_KEY_ID=your_aws_s3_key_id
LIVEKIT_EGRESS_AWS_SECRET_ACCESS_KEY=your_aws_s3_secret_key

# --- SERVICE GATEWAY ROUTING ---
AI_INTERVIEWER_SERVICE_URL=https://os.hirenestworkforce.com
AI_INTERVIEWER_SERVICE_TOKEN=your_secure_pre_shared_secret_bearer_token

# --- WORKER NODE NETWORK CONFIG ---
AGENT_WORKER_PORT=3001
EOT
  echo "⚠️  Production .env template created! PLEASE REPLACE PLACEHOLDER VALUE KEYS BEFORE RUNNING!"
else
  echo "✅ Production .env already exists."
fi

# 5. Compile TypeScript files to JavaScript targets
echo "🚀 Building production TypeScript targets..."
npm run build

# 6. Service Manager Automation
if ! command -v pm2 &> /dev/null; then
  echo "📦 Installing PM2 daemon process manager..."
  sudo npm install -g pm2
fi

echo "=========================================================================="
echo "🎉 DEPLOYMENT PROVISION COMPLETE!"
echo "=========================================================================="
echo "To start the long-running worker daemon on your Azure host VM:"
echo "   pm2 start 'node dist/index.js start' --name hirenest-ai-interviewer"
echo ""
echo "To run the worker locally in dev mode connected to your LiveKit Cloud:"
echo "   npm run dev dev"
echo "=========================================================================="
