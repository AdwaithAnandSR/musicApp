import { Stack } from "expo-router";

const _layout = () => {
    return (
        <Stack
            initialRouteName="Playlists"
            screenOptions={{
                headerShown: false,
                animation: "slide_from_right"
            }}
        />
    );
};

export default _layout;
