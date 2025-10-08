import requests
from transcript import transcribe_from_url

LIMIT = 100
curr = 0

payload = {"limit": LIMIT, "page": 1}

try:
    res = requests.post("http://localhost:5000/admin/getRemainingSongsForAddSubtitleAsLyricsEn", json=payload)
    res.raise_for_status()
    songs = res.json().get('songs', [])
except requests.exceptions.RequestException as e:
    print("Error fetching songs:", e, type(e))
    songs = []

isBulk = False 
status = {
    "success": 0,
    "error": 0,
    "skip": 0,
}

command = input("do you want buld upload? ")
if command == "yes" or command == "y":
    isBulk = True 
    
def uploadLyric (lyrics, songId):
    print("\tUploading lyrics...")
    payload = {"lyrics": lyrics, "id": songId}
    try:
        res = requests.post("http://localhost:5000/admin/addSubtitleToLyrics", json=payload)
        print("\tResponse:", res.status_code, res.text)
        if res.status_code == 200:
            status["success"] += 1
            print("✅ upload successfully.")
        else :
            status['error'] += 1
    except Exception as e:
        status["error"] += 1
        print("Error uploading lyric:", e)
    

for song in songs:
    curr += 1
    if song.get("lyrics"):
        status["skip"] += 1
        continue
    
    print(f"({curr}/{LIMIT}) Processing: ", song.get("title", "Unknown Title"))
    
    transcript = transcribe_from_url(song.get("url"), "en")
    
    if not transcript or len(transcript) < 4:
        print("⏩skipping due to no lyrics")
        status["skip"] += 1
        continue
        
    if not isBulk:
        command = input("do you want to continue uploading? ").strip()
        if command == "yes" or command == "y" or command == "":
            uploadLyric(transcript, song["_id"])
        else:
            continue
    else:
        uploadLyric(transcript, song["_id"])

print("\n\n\n\tProcess Status")
print(status)
