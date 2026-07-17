import logging
from typing import Tuple

logger = logging.getLogger("voice-service")


class VoiceService:
    def __init__(self) -> None:
        self.tts_client = None
        self.speech_client = None
        self.enabled = False
        self._initialize_clients()

    def _initialize_clients(self) -> None:
        from google.cloud import speech_v1, texttospeech

        self.tts_client = texttospeech.TextToSpeechClient()
        self.speech_client = speech_v1.SpeechClient()
        self.enabled = True
        logger.info("Google Cloud voice services initialized successfully.")

    def synthesize_speech(self, text: str) -> Tuple[bytes, str]:
        if not text:
            raise ValueError("Text cannot be empty")
        if not self.enabled or self.tts_client is None:
            raise RuntimeError("Google TTS is not available in the current environment")

        from google.cloud import texttospeech

        synthesis_input = texttospeech.SynthesisInput(text=text)
        voice = texttospeech.VoiceSelectionParams(
            language_code="en-US",
            ssml_gender=texttospeech.SsmlVoiceGender.NEUTRAL,
            name="en-US-Standard-A",
        )
        audio_config = texttospeech.AudioConfig(
            audio_encoding=texttospeech.AudioEncoding.MP3
        )

        response = self.tts_client.synthesize_speech(
            input=synthesis_input,
            voice=voice,
            audio_config=audio_config,
        )
        return response.audio_content, "audio/mpeg"

    def transcribe_audio(self, audio_bytes: bytes, content_type: str = "audio/webm") -> str:
        if not self.enabled or self.speech_client is None:
            raise RuntimeError("Google STT is not available in the current environment")

        from google.cloud import speech_v1

        if content_type.endswith("webm"):
            encoding = speech_v1.RecognitionConfig.AudioEncoding.WEBM_OPUS
        elif content_type.endswith("mp3"):
            encoding = speech_v1.RecognitionConfig.AudioEncoding.MP3
        elif content_type.endswith("wav"):
            encoding = speech_v1.RecognitionConfig.AudioEncoding.LINEAR16
        else:
            encoding = speech_v1.RecognitionConfig.AudioEncoding.ENCODING_UNSPECIFIED

        config = speech_v1.RecognitionConfig(
            encoding=encoding,
            sample_rate_hertz=16000,
            language_code="en-US",
            enable_automatic_punctuation=True,
        )
        audio = speech_v1.RecognitionAudio(content=audio_bytes)
        response = self.speech_client.recognize(config=config, audio=audio)

        if not response.results:
            raise RuntimeError("No speech detected")

        transcripts = [result.alternatives[0].transcript for result in response.results if result.alternatives]
        return " ".join(transcripts).strip()


voice_service = VoiceService()
