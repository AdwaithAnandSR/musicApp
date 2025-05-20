import { Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import "./(trackFullView)/TrackControllerFullView.jsx"
import Navbar from "../components/Navbar.jsx";

import { ListProvider } from "../context/list.context.js";
import { TrackProvider } from "../context/track.context.js";
import { AppStateProvider } from "../context/appState.context.js";

const _layout = () => {
    return (
        <SafeAreaView
            style={{
                flex: 1,
                backgroundColor: "black"
            }}
        >
            <AppStateProvider>
                <TrackProvider>
                    <ListProvider>
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
                                options={{ animation: "slide_from_bottom", }}
                            />
                        </Stack>
                    </ListProvider>
                </TrackProvider>
            </AppStateProvider>
        </SafeAreaView>
    );
};

export default _layout;
