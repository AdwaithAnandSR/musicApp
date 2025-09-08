import { useEffect } from "react";
import { Stack, Tabs } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import TrackPlayer, {
    Capability,
    AppKilledPlaybackBehavior
} from "react-native-track-player";

import { useAppStatus } from "../store/appState.store.js";

import { PlaybackService } from "../services/playerService.js";

TrackPlayer.registerPlaybackService(() => PlaybackService);

let playerInitialized = false;
const setupPlayer = async () => {
    try {
        await TrackPlayer.setupPlayer();
        await TrackPlayer.updateOptions({
            color: 0xff008055,
            android: {
                appKilledPlaybackBehavior:
                    AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification
            },
            capabilities: [
                Capability.Play,
                Capability.Pause,
                Capability.SkipToNext,
                Capability.SkipToPrevious,
                Capability.Stop
            ],
            notificationCapabilities: [
                Capability.Play,
                Capability.Pause,
                Capability.SkipToNext,
                Capability.SkipToPrevious,
                Capability.Stop
            ],
            compactCapabilities: [
                Capability.SkipToPrevious,
                Capability.Play,
                Capability.SkipToNext,
                Capability.Stop
            ]
        });

        playerInitialized = true;
        console.log("playerInitialized🐻‍❄️");
    } catch (error) {
        console.log("❌ Failed to setup player:", error);
    }
};

const Layout = () => {
    let isAuthenticated = useAppStatus(state => state.isAuthenticated);

    useEffect(() => {
        setupPlayer();
    }, []);

    return (
        <SafeAreaView
            style={{
                flex: 1,
                backgroundColor: "black"
            }}
        >
            <Stack screenOptions={{ headerShown: false }}>
                <Stack.Protected guard={!isAuthenticated}>
                    <Stack.Screen name="index" />
                </Stack.Protected>

                <Stack.Protected guard={isAuthenticated}>
                    <Stack.Screen name="secure" />
                </Stack.Protected>
            </Stack>
        </SafeAreaView>
    );
};

export default Layout;
