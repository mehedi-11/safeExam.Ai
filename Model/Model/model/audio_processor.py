import whisper
import numpy as np

class AudioProcessor:
    def __init__(self, model_size="tiny"):
        # Load the Whisper model ('tiny' is fast and good for realtime)
        self.model = whisper.load_model(model_size)

    def transcribe(self, audio_data: np.ndarray):
        """
        Transcribes a chunk of audio.
        audio_data: 1D numpy array of float32 (16kHz sample rate)
        """
        if audio_data.dtype != np.float32:
            audio_data = audio_data.astype(np.float32)
            
        # Run Whisper transcription without fp16 if running on CPU
        result = self.model.transcribe(audio_data, fp16=False)
        
        text = result.get("text", "").strip()
        
        warning = False
        # Simple heuristic: if any text is detected, flag it
        if len(text) > 2:
            warning = True
            
        return {
            "text": text,
            "language": result.get("language", "unknown"),
            "warning": warning
        }
