import { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { VideoView, useVideoPlayer } from "expo-video";
import { usePlayer } from "@store/player";

const VideoBackground = ({ videoUrl, showVideo }) => {
    const isPlaying = usePlayer(state => state.isPlaying);
    const isBuffering = usePlayer(state => state.isBuffering);
    const audioPosition = usePlayer(state => state.position);

    const player = useVideoPlayer(videoUrl, p => {
        p.loop = true;
        p.muted = true;
    });

    useEffect(() => {
        if (player) {
            if (showVideo && isPlaying && !isBuffering) {
                player.play();
            } else {
                player.pause();
            }
        }
    }, [showVideo, isPlaying, isBuffering, player]);

    useEffect(() => {
        if (player && showVideo && isPlaying && !isBuffering) {
            if (player.status === "loading" || player.status === "idle") return;
            const diff = Math.abs(player.currentTime - audioPosition);
            if (diff > 1.5) {
                player.currentTime = audioPosition;
            }
        }
    }, [audioPosition, player, showVideo, isPlaying, isBuffering]);

    if (!showVideo) return null;

    return (
        <>
            <VideoView
                player={player}
                style={[StyleSheet.absoluteFill, styles.fill]}
                contentFit="cover"
                nativeControls={false}
            />
            <View
                style={[StyleSheet.absoluteFill, styles.fill, styles.overlay]}
            />
        </>
    );
};

const styles = StyleSheet.create({
    fill: {
        width: "100%",
        height: "100%"
    },
    overlay: {
        backgroundColor: "#000000a0"
    }
});

export default VideoBackground;
