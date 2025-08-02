# pip install -r requirements.txt

import os
import json
import re
import requests
from yt_dlp import YoutubeDL
from rich.progress import Progress, BarColumn, TextColumn, TimeRemainingColumn, DownloadColumn, TransferSpeedColumn
from rich.console import Console

# Constants
SONGS_DIR = "songs"
COVERS_DIR = "covers"
METADATA_FILE = "songs_metadata.json"
console = Console()

# Ensure necessary folders exist
os.makedirs(SONGS_DIR, exist_ok=True)
os.makedirs(COVERS_DIR, exist_ok=True)

def format_duration(seconds):
    mins, secs = divmod(int(seconds), 60)
    return f"{mins}:{secs:02}"

def load_metadata():
    if os.path.exists(METADATA_FILE):
        with open(METADATA_FILE, "r") as f:
            return json.load(f)
    return []

def save_metadata(data):
    with open(METADATA_FILE, "w") as f:
        json.dump(data, f, indent=4)

def download_cover_image(thumbnail_url, video_id):
    try:
        cover_path = os.path.join(COVERS_DIR, f"{video_id}.jpg")
        response = requests.get(thumbnail_url, timeout=60)
        with open(cover_path, 'wb') as f:
            f.write(response.content)
        return cover_path
    except Exception as e:
        console.print(f"[yellow]⚠ Failed to download thumbnail: {e}")
        return None

def download_youtube_audio(uri: str):
    existing_metadata = load_metadata()

    progress = Progress(
        TextColumn("[progress.description]{task.description}"),
        BarColumn(),
        DownloadColumn(),
        TransferSpeedColumn(),
        TimeRemainingColumn(),
        transient=True
    )

    with progress:
        def hook(d):
            if d["status"] == "downloading":
                total_bytes = d.get("total_bytes", 0) or d.get("total_bytes_estimate", 0)
                if not hasattr(hook, "task"):
                    hook.task = progress.add_task(f"[cyan]Downloading", total=total_bytes)
                progress.update(hook.task, completed=d.get("downloaded_bytes", 0))

        ydl_opts = {
            'format': 'bestaudio/best',
            'outtmpl': f'{SONGS_DIR}/%(id)s.%(ext)s',
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': '320',
            }],
            'progress_hooks': [hook],
            'quiet': True,
            'no_warnings': True
        }

        with YoutubeDL(ydl_opts) as ydl:
            try:
                print('getting info...')
                info = ydl.extract_info(uri, download=True)

                video_id = info["id"]
                filename = os.path.join(SONGS_DIR, f"{video_id}.mp3")

                if not os.path.exists(filename):
                    console.print(f"[red]❌ Error: file not found after download: {filename}")
                    return

                filesize = os.path.getsize(filename) / (1024 * 1024)

                # Download thumbnail as cover
                cover_path = None
                if "thumbnail" in info:
                    cover_path = download_cover_image(info["thumbnail"], video_id)

                metadata = {
                    "id": video_id,
                    "title": info["title"],
                    "duration": format_duration(info["duration"]),
                    "path": filename,
                    "cover": cover_path,
                    "size_mb": round(filesize, 2)
                }

                if not any(song["id"] == video_id for song in existing_metadata):
                    existing_metadata.append(metadata)
                    save_metadata(existing_metadata)
                    console.print(f"[green]✔ Downloaded:[/green] {metadata['title']} "
                                  f"({metadata['duration']}, {metadata['size_mb']} MB)")
                else:
                    console.print(f"[yellow]⚠ Skipped:[/yellow] Already downloaded: {metadata['title']}")

                return metadata

            except Exception as e:
                console.print(f"[red]❌ Error:[/red] {e}")
                return None

# Example usage
if __name__ == "__main__":
    download_youtube_audio("https://www.youtube.com/watch?v=xrZWJ315VQI")