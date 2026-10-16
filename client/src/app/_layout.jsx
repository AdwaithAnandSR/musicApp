import { useEffect } from "react";
import { Stack } from "expo-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { useAppStatus } from "@store/appState.store.js";
import queryClient from "@services/queryClient.js";

import checkIsAuth from "@controllers/auth/checkIsAuth";
import {
    initWidgetInteractionListener,
    updateMusicWidgetSnapshot
} from "@services/widgetService";
import { usePlayer } from "@store/player";

const Layout = () => {
    const isAuthenticated = useAppStatus(state => state.user?.isVerified);

    useEffect(() => {
        const verify = async () => {
            await checkIsAuth();
        };
        verify();

        const widgetSub = initWidgetInteractionListener();

        // Sync initial widget state with current player state on app launch
        const playerState = usePlayer.getState();
        updateMusicWidgetSnapshot(
            playerState.currentTrack,
            playerState.isPlaying
        );

        return () => {
            widgetSub?.remove?.();
        };
    }, []);

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <QueryClientProvider client={queryClient}>
                <Stack screenOptions={{ headerShown: false }}>
                    {/* Unauthenticated: splash check + login/register */}
                    <Stack.Protected guard={!isAuthenticated}>
                        <Stack.Screen name="index" />
                    </Stack.Protected>

                    {/* Authenticated: main app */}
                    <Stack.Protected guard={isAuthenticated}>
                        <Stack.Screen name="secure" />
                    </Stack.Protected>
                </Stack>
            </QueryClientProvider>
        </GestureHandlerRootView>
    );
};

export default Layout;
