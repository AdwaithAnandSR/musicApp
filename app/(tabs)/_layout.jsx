import { Tabs } from "expo-router";
import { FontAwesome, Ionicons } from "@expo/vector-icons";

const Layout = () => {
    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: "rgb(246,7,135)",
                tabBarShowLabel: false,
                headerShown: false,
                tabBarStyle: {
                    position: "absolute",
                    paddingTop: 10,
                    backgroundColor: "black",
                    borderTopWidth: 0,
                }
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    tabBarIcon: ({ color }) => (
                        <FontAwesome name="music" size={24} color={color} />
                    )
                }}
            />
            <Tabs.Screen
                name="Search"
                options={{
                    tabBarIcon: ({ color }) => (
                        <Ionicons name="search" size={24} color={color} />
                    )
                }}
            />
        </Tabs>
    );
};

export default Layout;
