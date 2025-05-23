import { Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import "./(trackFullView)/TrackControllerFullView.jsx";
import Navbar from "../components/Navbar.jsx";
import Toast from "../services/Toast.js";

import { TrackProvider } from "../context/track.context.js";

const _layout = () => {
    return (
        <SafeAreaView
            style={{
                flex: 1,
                backgroundColor: "black"
            }}
        >
            <TrackProvider>
                <Navbar />
                <Stack
                    screenOptions={{
                        headerShown: false,
                        animation: "none"
                    }}
                >
                    <Stack.Screen name="index" />
                    <Stack.Screen name="(tabs)" />
                    <Stack.Screen
                        name="(trackFullView)/TrackControllerFullView"
                        options={{
                            animation: "slide_from_bottom",
                            animationDuration: 50
                        }}
                    />
                </Stack>
                <Toast />
            </TrackProvider>
        </SafeAreaView>
    );
};

export default _layout;
