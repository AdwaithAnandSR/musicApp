import requests
from transcript import transcribe_from_url
from concurrent.futures import ThreadPoolExecutor, as_completed

API_BASE = "http://localhost:5000"

LIMIT = 10000
lang = "ml"
payload = {"limit": LIMIT, "page": 1}


try:
    res = requests.post(f"{API_BASE}/admin/getRemainingSongsForAddSubtitleAsLyrics", json=payload)
    res.raise_for_status()
    songs = res.json().get('songs', [])
except requests.exceptions.RequestException as e:
    print("Error fetching songs:", e, type(e))
    songs = []

isBulk = False
status = {"success": 0, "error": 0, "skip": 0}

command = input("Do you want bulk upload? ").strip().lower()
if command in ("yes", "y"):
    isBulk = True


def upload_lyric(lyrics, song_id):
    """Upload the transcribed lyrics to the server"""
    payload = {"lyrics": lyrics, "id": song_id}
    try:
        res = requests.post(f"{API_BASE}/admin/addSubtitleToLyrics", json=payload)
        if res.status_code == 200:
            status["success"] += 1
            print(f"✅ upload successfull.")
        else:
            status["error"] += 1
            print(f"❌ upload failed.")
            
    except Exception as e:
        status["error"] += 1
        print("Error uploading lyric:", e)


def process_song(song):
    """Transcribe and upload one song"""
    if song.get("lyrics"):
        status["skip"] += 1
        return f"⏩ Skipped {song.get('title')} (already has lyrics)"

    title = song.get("title", "Unknown Title")
    print(f"({status.get('success') + status.get('error') + status.get('skip')}/{LIMIT}) 🎵 Processing: {title[:20]}")

    try:
        transcript = transcribe_from_url(song.get("url"), lang)
    except Exception as e:
        status["error"] += 1
        return f"❌ Error transcribing {title}: {e}"

    if not transcript or len(transcript) < 4:
        status["skip"] += 1
        return f"⏩ Skipped {title} (no lyrics found)"

    if not isBulk:
        command = input(f"Upload lyrics for {title}? (y/n) ").strip().lower()
        if command not in ("y", "yes", ""):
            return f"🚫 Skipped upload for {title}"

    upload_lyric(transcript, song["_id"])
    return


# Limit threads to avoid overloading network / API
MAX_WORKERS = 10 if isBulk else 1

with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
    futures = [executor.submit(process_song, song) for song in songs]
    for future in as_completed(futures):
        print(future.result())

print("\n\n=== Process Summary ===")
print(status)