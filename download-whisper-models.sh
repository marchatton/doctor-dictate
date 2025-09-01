#!/bin/bash

# Download Whisper models for whisper.cpp
# Models are stored in ~/.whisper-cpp/models/

MODELS_DIR="$HOME/.whisper-cpp/models"
mkdir -p "$MODELS_DIR"

echo "📥 Downloading Whisper models for dual-mode processing..."
echo "Models will be stored in: $MODELS_DIR"
echo "=" 

# Function to download a model
download_model() {
    MODEL_NAME=$1
    FILE_NAME="ggml-$MODEL_NAME.bin"
    URL="https://huggingface.co/ggerganov/whisper.cpp/resolve/main/$FILE_NAME"
    
    if [ -f "$MODELS_DIR/$FILE_NAME" ]; then
        echo "✅ $MODEL_NAME already exists, skipping..."
    else
        echo "📥 Downloading $MODEL_NAME..."
        curl -L --progress-bar "$URL" -o "$MODELS_DIR/$FILE_NAME"
        
        if [ $? -eq 0 ]; then
            echo "✅ $MODEL_NAME downloaded successfully"
        else
            echo "❌ Failed to download $MODEL_NAME"
        fi
    fi
}

# Download models for dual-mode
echo ""
echo "1️⃣ FAST MODE MODEL:"
download_model "tiny.en"

echo ""
echo "2️⃣ ACCURATE MODE MODEL:"
download_model "base.en"

echo ""
echo "3️⃣ OPTIONAL - Better accuracy (if RAM allows):"
download_model "small.en"

echo ""
echo "✅ Model download complete!"
echo ""
echo "Model sizes:"
ls -lh "$MODELS_DIR"/*.bin 2>/dev/null | awk '{print "  " $9 ": " $5}'

echo ""
echo "To test whisper-cpp, run:"
echo "  whisper-cli -m $MODELS_DIR/ggml-tiny.en.bin <audio_file>"