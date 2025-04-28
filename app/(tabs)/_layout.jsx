import { Tabs } from "expo-router";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { BlurView } from "expo-blur";

const Layout = () => {
    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: "rgb(246,7,135)",
                tabBarShowLabel: false,
                tabBarStyle: { position: "absolute", paddingTop: 10 },
                tabBarBackground: () => (
                    <BlurView
                        tint="light"
                        intensity={100}
                        style={StyleSheet.absoluteFill}
                    />
                )
            }}
        >
            <Tabs.Screen
                title="Home"
                tabBarIcon={({ color }) => (
                    <FontAwesome name="music" size={24} color={color} />
                )}
            />
            <Tabs.Screen
                title="Search"
                tabBarIcon={({ color }) => (
                    <Ionicons name="search" size={24} color={color} />
                )}
            />
        </Tabs>
    );
};

export default Layout;
