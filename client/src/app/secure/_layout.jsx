import React, { useEffect } from "react";
import { View } from "react-native";
import { Stack } from "expo-router";
import { setAudioModeAsync } from "expo-audio";

import Toast from "@services/Toast.js";

setAudioModeAsync({
    playsInSilentMode: true,
    shouldPlayInBackground: true,
    interruptionMode: "doNotMix"
});

const _layout = () => {
    return (
        <View style={{ flex: 1, backgroundColor: "black" }}>
            <Stack
                screenOptions={{
                    headerShown: false,
                    animation: "none"
                }}
            >
                <Stack.Screen name="(tabs)" />
                <Stack.Screen
                    name="(trackFullView)/TrackControllerFullView"
                    options={{
                        presentation: "modal",
                        animation: "slide_from_bottom",
                        headerShown: false
                    }}
                />

                <Stack.Screen
                    name="others/AddPlaylist"
                    options={{
                        animation: "slide_from_right"
                    }}
                />
            </Stack>
            <Toast />
        </View>
    );
};

export default _layout;
