import React, { useState, useRef, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView
} from "react-native";
import ImageColors from "react-native-image-colors";
import api from "../../../services/axios";
import { router } from "expo-router";


const defaultColors = {
    average: "#060606",
    darkMuted: "#484848",
    darkVibrant: "#000000",
    dominant: "#E0E0E0",
    lightMuted: "#E0E0E0",
    lightVibrant: "#000000",
    muted: "#808080",
    platform: "android",
    vibrant: "#000000"
};

const ColorExtractor = () => {
    const [isRunning, setIsRunning] = useState(false);
    const [logs, setLogs] = useState([]);
    const [stats, setStats] = useState({
        processed: 0,
        errors: 0,
        totalRemaining: "Loading..."
    });

    const stopFlag = useRef(false);

    const log = msg => {
        setLogs(prev => [msg, ...prev].slice(0, 50));
    };

    const fetchInitialRemaining = async () => {
        try {
            const res = await api.post("/admin/getSongsWithoutColors", {
                limit: 1
            });
            setStats(s => ({
                ...s,
                totalRemaining: res.data.totalRemaining ?? "Unknown"
            }));
        } catch (error) {
            log(`Failed to fetch initial count: ${error.message}`);
            setStats(s => ({ ...s, totalRemaining: "Error" }));
        }
    };

    useEffect(() => {
        fetchInitialRemaining();
    }, []);

    const processBatch = async () => {
        if (stopFlag.current) {
            log("Stopped by user.");
            setIsRunning(false);
            return;
        }

        try {
            const res = await api.post("/admin/getSongsWithoutColors", {
                limit: 100 
            });

            const songs = res.data.songs;
            const remaining = res.data.totalRemaining;

            setStats(s => ({ ...s, totalRemaining: remaining }));

            if (!songs || songs.length === 0) {
                log("No more songs to process. Finished!");
                setIsRunning(false);
                return;
            }

            log(`Fetched ${songs.length} songs. Extracting colors...`);


            
            const updatePromises = songs.map(async song => {
                if (stopFlag.current) return;
                try {
                    const urlToUse = song.cover;
                    let extractedColors = {};

                    if (urlToUse) {
                        const colors = await ImageColors.getColors(urlToUse, {
                            fallback: "#000000",
                            cache: true,
                            key: urlToUse
                        });
                        extractedColors = {
                            background: colors.background,
                            primary: colors.primary,
                            secondary: colors.secondary,
                            detail: colors.detail,
                            average: colors.average,
                            dominant: colors.dominant,
                            lightVibrant: colors.lightVibrant,
                            vibrant: colors.vibrant,
                            darkVibrant: colors.darkVibrant,
                            lightMuted: colors.lightMuted,
                            muted: colors.muted,
                            darkMuted: colors.darkMuted
                        };
                    }

                    await api.post("/admin/updateSongColors", {
                        id: song._id,
                        colors: urlToUse ? extractedColors : defaultColors
                    });

                    setStats(s => ({ ...s, processed: s.processed + 1 }));
                } catch (err) {
                    console.log(err)
                    await api.post("/admin/updateSongColors", {
                        id: song._id,
                        colors: { average: "#000000" }
                    });
                    setStats(s => ({ ...s, errors: s.errors + 1 }));
                }
            });

            await Promise.all(updatePromises);

            if (!stopFlag.current) {
                setTimeout(processBatch, 200); // Slight delay
            } else {
                log("Stopped by user.");
                setIsRunning(false);
            }
        } catch (error) {
            log(`Batch error: ${error.message}`);
            setIsRunning(false);
        }
    };

    const toggleProcessing = () => {
        if (isRunning) {
            stopFlag.current = true;
            log("Stopping...");
        } else {
            stopFlag.current = false;
            setIsRunning(true);
            log("Starting extraction...");
            processBatch();
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={styles.backBtn}
                >
                    <Text style={styles.backText}>{"< Back"}</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Color Extractor</Text>
            </View>

            <View style={styles.statsCard}>
                <Text style={styles.statText}>
                    Remaining to Process: {stats.totalRemaining}
                </Text>
                <Text style={styles.statText}>
                    Processed (This session): {stats.processed}
                </Text>
                <Text style={styles.statText}>
                    Errors (This session): {stats.errors}
                </Text>
            </View>

            <TouchableOpacity
                style={[
                    styles.actionBtn,
                    isRunning ? styles.stopBtn : styles.startBtn
                ]}
                onPress={toggleProcessing}
            >
                <Text style={styles.btnText}>
                    {isRunning ? "Stop Extraction" : "Start Extraction"}
                </Text>
            </TouchableOpacity>

            <Text style={styles.logsTitle}>Logs (Last 50):</Text>
            <ScrollView style={styles.logsContainer}>
                {logs.map((l, idx) => (
                    <Text key={idx} style={styles.logText}>
                        {l}
                    </Text>
                ))}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#000", padding: 16 },
    header: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 20,
        paddingTop: 40
    },
    backBtn: { marginRight: 16, padding: 8 },
    backText: { color: "#f9c1e9", fontSize: 16 },
    title: { color: "#fff", fontSize: 20, fontWeight: "bold" },
    statsCard: {
        backgroundColor: "#111",
        padding: 16,
        borderRadius: 8,
        marginBottom: 20
    },
    statText: { color: "#ccc", fontSize: 16, marginBottom: 8 },
    actionBtn: {
        padding: 16,
        borderRadius: 8,
        alignItems: "center",
        marginBottom: 20
    },
    startBtn: { backgroundColor: "#163016" },
    stopBtn: { backgroundColor: "#2d0a0a" },
    btnText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
    logsTitle: { color: "#fff", fontSize: 16, marginBottom: 8 },
    logsContainer: {
        flex: 1,
        backgroundColor: "#0a0a0a",
        padding: 12,
        borderRadius: 8
    },
    logText: {
        color: "#aaa",
        fontSize: 12,
        marginBottom: 4,
        fontFamily: "monospace"
    }
});

export default ColorExtractor;
