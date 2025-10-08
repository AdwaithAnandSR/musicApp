import os
import time
import requests
from dotenv import load_dotenv


def transcribe_from_url(audio_url: str, lang: str):
    """
    Transcribe audio from a URL using the Soniox API.
    Returns a list of formatted transcript strings.
    """

    # Load API key
    load_dotenv()
    SONIOX_API_KEY = os.getenv("SONIOX_API_KEY")
    if not SONIOX_API_KEY:
        raise RuntimeError("Missing SONIOX_API_KEY in .env")

    SONIOX_API_BASE = "https://api.soniox.com/v1"
    session = requests.Session()
    session.headers["Authorization"] = f"Bearer {SONIOX_API_KEY}"

    # Create transcription job
    # print("Creating transcription job...")
    config = {
        # "model": "stt-async-preview",
        "model": "stt-async-preview",
        "audio_url": audio_url,
        "language_hints": ["en", "ml", "ta"],
        "enable_language_identification": True,
        "enable_speaker_diarization": True,
        "include_timestamps": True,
    }

    res = session.post(f"{SONIOX_API_BASE}/transcriptions", json=config)
    res.raise_for_status()
    transcription_id = res.json()["id"]
    # print(f"Transcription ID: {transcription_id}")

    # Wait for transcription completion
    # print("Waiting for transcription to finish...")
    while True:
        res = session.get(f"{SONIOX_API_BASE}/transcriptions/{transcription_id}")
        res.raise_for_status()
        data = res.json()
        if data["status"] == "completed":
            # print("✅ Transcription completed!")
            break
        elif data["status"] == "error":
            raise RuntimeError(f"Error: {data.get('error_message')}")
        time.sleep(2)

    # Get transcript tokens
    res = session.get(f"{SONIOX_API_BASE}/transcriptions/{transcription_id}/transcript")
    res.raise_for_status()
    transcript_data = res.json()

    # Build speaker segments
    segments = []
    current_segment = {"speaker": None, "language": None, "start": None, "text": ""}

    for token in transcript_data["tokens"]:
        start = token.get("start_ms", 0) / 1000.0
        end = token.get("end_ms", 0) / 1000.0
        speaker = token.get("speaker", "?")
        lang = token.get("language", "?")
        text = token["text"]

        if current_segment["speaker"] is None:
            current_segment.update({
                "speaker": speaker,
                "language": lang,
                "start": start,
                "end": end,
                "text": text
            })
            continue

        # Detect speaker change or sentence break
        if speaker != current_segment["speaker"] or text.strip() in [".", "?", "!", ","]:
            segments.append(current_segment)
            current_segment = {
                "speaker": speaker,
                "language": lang,
                "start": start,
                "end": end,
                "text": text
            }
        else:
            current_segment["text"] += text

    if current_segment["text"]:
        segments.append(current_segment)

    lines = []

    for i, seg in enumerate(segments):
        clean_text = seg["text"].translate(str.maketrans("", "", "?,!.;")).strip()
        
        # Set end time as next segment's start, or None if last
        end_time = segments[i + 1]['start'] if i + 1 < len(segments) else None
        
        lines.append({
            "start": seg['start'],
            "end": end_time,
            "line": clean_text,
        })
        
            
    # print("✅ Transcription ready!")
    session.delete(f"{SONIOX_API_BASE}/transcriptions/{transcription_id}")
    return lines


if __name__ == "__main__":
    AUDIO_URL = "https://res.cloudinary.com/dmjysfk2r/video/upload/v1758854555/songs/zagitti2fjgqceyeqlni.mp3"
    transcript_lines = transcribe_from_url(AUDIO_URL)
    print("\n".join(transcript_lines))