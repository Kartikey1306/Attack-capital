"""
Python AMD Service
Hugging Face model for Answering Machine Detection
"""

from fastapi import FastAPI, HTTPException, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import torch
import torchaudio
from transformers import Wav2Vec2ForSequenceClassification, Wav2Vec2Processor
import librosa
import numpy as np
import io
import time
from typing import Dict, Any
import warnings

warnings.filterwarnings("ignore")

app = FastAPI(title="AMD Service")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global model and processor
model = None
processor = None
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")


class AnalysisRequest(BaseModel):
    audioUrl: str


class AnalysisResponse(BaseModel):
    prediction: str
    confidence: float
    transcript: str = ""
    processingTime: float


class StreamAnalysisRequest(BaseModel):
    audio: bytes
    format: str = "wav"


class StreamAnalysisResponse(BaseModel):
    prediction: str
    confidence: float


def load_model():
    """Load the Hugging Face model for AMD
    
    Uses jakeBland/wav2vec-vm-finetune - a model specifically fine-tuned for
    voicemail/human detection on telephony audio.
    """
    global model, processor

    if model is None or processor is None:
        try:
            # Use the assignment-specified model: jakeBland/wav2vec-vm-finetune
            model_name = "jakeBland/wav2vec-vm-finetune"

            print(f"Loading model: {model_name}")
            processor = Wav2Vec2Processor.from_pretrained(model_name)
            model = Wav2Vec2ForSequenceClassification.from_pretrained(
                model_name, num_labels=2
            )
            model.to(device)
            model.eval()

            print(f"Model loaded on {device}")
        except Exception as e:
            print(f"Error loading model: {e}")
            print("Attempting fallback to base wav2vec2 model")
            try:
                # Fallback to base model if fine-tuned model unavailable
                model_name = "facebook/wav2vec2-base-960h"
                processor = Wav2Vec2Processor.from_pretrained(model_name)
                model = Wav2Vec2ForSequenceClassification.from_pretrained(
                    model_name, num_labels=2
                )
                model.to(device)
                model.eval()
                print(f"Fallback model loaded on {device}")
            except Exception as fallback_error:
                print(f"Error loading fallback model: {fallback_error}")
                print("Using mock/feature-based detection")
                model = None
                processor = None


def preprocess_audio(audio_data: bytes) -> torch.Tensor:
    """Preprocess audio data for model inference"""
    try:
        # Load audio from bytes
        audio, sr = librosa.load(io.BytesIO(audio_data), sr=16000)

        # Convert to mono if stereo
        if len(audio.shape) > 1:
            audio = np.mean(audio, axis=0)

        # Normalize
        audio = audio / np.max(np.abs(audio))

        return audio
    except Exception as e:
        print(f"Error preprocessing audio: {e}")
        raise


def analyze_audio_features(audio: np.ndarray) -> Dict[str, Any]:
    """
    Analyze audio features for AMD detection
    Uses heuristic features in addition to ML model
    """
    # Calculate features that distinguish humans from machines
    features = {}

    # Zero crossing rate (humans have more variation)
    zcr = librosa.feature.zero_crossing_rate(audio)[0]
    features["zcr_mean"] = float(np.mean(zcr))
    features["zcr_std"] = float(np.std(zcr))

    # Spectral centroid (brightness)
    spectral_centroids = librosa.feature.spectral_centroid(y=audio)[0]
    features["spectral_centroid_mean"] = float(np.mean(spectral_centroids))
    features["spectral_centroid_std"] = float(np.std(spectral_centroids))

    # Spectral rolloff (higher frequencies)
    rolloff = librosa.feature.spectral_rolloff(y=audio)[0]
    features["rolloff_mean"] = float(np.mean(rolloff))

    # MFCC features
    mfccs = librosa.feature.mfcc(y=audio, n_mfcc=13)
    features["mfcc_mean"] = float(np.mean(mfccs))
    features["mfcc_std"] = float(np.std(mfccs))

    # Duration
    features["duration"] = len(audio) / 16000

    # Voice activity detection
    # Machines often have consistent amplitude, humans vary more
    frame_length = 2048
    hop_length = 512
    frames = librosa.util.frame(audio, frame_length=frame_length, hop_length=hop_length)
    energy = np.sum(frames**2, axis=0)
    energy_std = np.std(energy)
    features["energy_variation"] = float(energy_std)

    return features


def predict_from_features(features: Dict[str, Any]) -> tuple[str, float]:
    """
    Predict human vs machine from audio features
    Uses heuristics based on empirical observations
    """
    score = 0.5  # Start with uncertainty

    # Heuristics
    # 1. Longer greetings (>3s) are often machines
    if features["duration"] > 3.0:
        score -= 0.2

    # 2. Machines have less energy variation
    if features["energy_variation"] < 0.01:
        score -= 0.2

    # 3. Humans have more ZCR variation
    if features["zcr_std"] > 0.05:
        score += 0.1

    # 4. Machines often have consistent spectral characteristics
    if features["spectral_centroid_std"] < 100:
        score -= 0.1

    # 5. Overall duration patterns
    if 2 < features["duration"] < 5:
        # Typical greeting length for humans
        score += 0.1
    elif features["duration"] > 8:
        # Very long, likely machine
        score -= 0.3

    # Ensure score is in [0, 1]
    score = max(0, min(1, score))

    prediction = "HUMAN" if score > 0.5 else "MACHINE"
    confidence = abs(score - 0.5) * 2  # Scale to [0, 1]

    return prediction, confidence


async def fetch_audio(url: str) -> bytes:
    """Fetch audio from URL"""
    import requests

    try:
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        return response.content
    except Exception as e:
        print(f"Error fetching audio: {e}")
        raise HTTPException(status_code=400, detail=f"Failed to fetch audio: {e}")


@app.on_event("startup")
async def startup_event():
    """Load model on startup"""
    load_model()


@app.get("/")
async def root():
    """Health check"""
    return {
        "status": "healthy",
        "model_loaded": model is not None,
        "device": str(device),
    }


@app.get("/health")
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "model_loaded": model is not None,
        "processor_loaded": processor is not None,
        "device": str(device),
    }


@app.post("/analyze", response_model=AnalysisResponse)
async def analyze_audio(request: AnalysisRequest):
    """Analyze audio from URL for AMD"""
    start_time = time.time()

    try:
        # Fetch audio
        audio_data = await fetch_audio(request.audioUrl)

        # Preprocess
        audio_array = preprocess_audio(audio_data)

        # Extract features
        features = analyze_audio_features(audio_array)

        # Predict
        prediction, confidence = predict_from_features(features)

        # If model is loaded, use it
        if model is not None and processor is not None:
            try:
                inputs = processor(audio_array, sampling_rate=16000, return_tensors="pt")
                inputs = {k: v.to(device) for k, v in inputs.items()}

                with torch.no_grad():
                    outputs = model(**inputs)
                    logits = outputs.logits
                    probabilities = torch.nn.functional.softmax(logits, dim=-1)
                    predicted_class = torch.argmax(probabilities, dim=-1).item()
                    model_confidence = probabilities[0][predicted_class].item()

                # Combine heuristic and model results
                combined_confidence = (confidence + model_confidence) / 2
                prediction = "HUMAN" if predicted_class == 1 else "MACHINE"
                confidence = combined_confidence
            except Exception as e:
                print(f"Model inference error: {e}")

        processing_time = time.time() - start_time

        return AnalysisResponse(
            prediction=prediction,
            confidence=confidence,
            transcript="[Transcript not available]",
            processingTime=processing_time,
        )

    except Exception as e:
        print(f"Error analyzing audio: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/analyze-stream", response_model=StreamAnalysisResponse)
async def analyze_stream(file: UploadFile = File(...)):
    """Analyze streamed audio chunk"""
    try:
        audio_data = await file.read()

        # Preprocess
        audio_array = preprocess_audio(audio_data)

        # Extract features
        features = analyze_audio_features(audio_array)

        # Predict
        prediction, confidence = predict_from_features(features)

        return StreamAnalysisResponse(
            prediction=prediction, confidence=confidence
        )

    except Exception as e:
        print(f"Error analyzing stream: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8001)


