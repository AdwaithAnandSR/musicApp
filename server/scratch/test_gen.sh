# Generate 10s static video
ffmpeg -y -f lavfi -i color=c=blue:s=1280x720 -t 10 -c:v libx264 -b:v 100k scratch/static.mp4 2>/dev/null
# Generate 10s lyrics video (text changes every 2s)
ffmpeg -y -f lavfi -i color=c=blue:s=1280x720 -vf "drawtext=text='%{pts}':x=100:y=100:fontsize=48:fontcolor=white" -t 10 -c:v libx264 -b:v 100k scratch/lyrics.mp4 2>/dev/null
