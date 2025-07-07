import { Stack } from "expo-router";
import { View } from "react-native";
import { SQLiteProvider } from "expo-sqlite";

import Navbar from "../../components/Navbar.jsx";
import Toast from "../../services/Toast.js";

import { TrackProvider } from "../../context/track.context.js";
import { AppStateProvider } from "../../context/app.context.js";

const _layout = () => {
    return (
        <SQLiteProvider databaseName="musicApp.db">
            <AppStateProvider>
                <TrackProvider>
                    <Navbar />
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
                                animation: "slide_from_bottom",
                                animationDuration: 50
                            }}
                        />
                    </Stack>
                    <Toast />
                </TrackProvider>
            </AppStateProvider>
        </SQLiteProvider>
    );
};

export default _layout;
