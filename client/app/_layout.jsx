import { Stack } from "expo-router";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import "./(trackFullView)/TrackControllerFullView.jsx";
import Navbar from "../components/Navbar.jsx";
import Toast from "../services/Toast.js";

import { ListProvider } from "../context/list.context.js";
import { TrackProvider } from "../context/track.context.js";
import { AppStateProvider } from "../context/appState.context.js";

const _layout = () => {
    return (
        <View
            style={{
                flex: 1,
                backgroundColor: "black"
            }}
        >
            <AppStateProvider>
                <ListProvider>
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
                </ListProvider>
            </AppStateProvider>
        </View>
    );
};

export default _layout;
