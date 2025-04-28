import { Stack } from "expo-router";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import TrackController from "../components/TrackController.jsx";
// import NavBar from "../components/Navbar.jsx";

import { ListProvider } from "../context/list.context.js";
import { TrackProvider } from "../context/track.context.js";
// import { AppStateProvider } from "../context/state.context.js";

// import "../track-player-init.js";

const _layout = () => {
    return (
        <SafeAreaView
            style={{
                flex: 1,
                backgroundColor: "black"
            }}
        >
            <TrackProvider>
                <ListProvider>
                    <Stack screenOptions={{ headerShown: false }} />
                    <TrackController />
                </ListProvider>
            </TrackProvider>
        </SafeAreaView>
    );
};

export default _layout;
