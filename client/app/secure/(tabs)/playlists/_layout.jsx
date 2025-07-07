import { Stack } from "expo-router";

const _layout = () => {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
                animation: "slide_from_right"
            }}
        />
    );
};

export default _layout;
