import { View, TouchableOpacity, StyleSheet, Dimensions } from "react-native";
import { Entypo } from "@expo/vector-icons";
import { router } from "expo-router";

const { height: vh, width: vw } = Dimensions.get("window");

const NavBar = () => {
    return (
        <View style={styles.navbar}>
            <TouchableOpacity onPress={() => router.back()}>
                <Entypo name="chevron-down" size={24} color="white" />
            </TouchableOpacity>
            <TouchableOpacity>
                <Entypo name="dots-three-vertical" size={24} color="white" />
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    navbar: {
        width: "100%",
        height: "10%",
        flexDirection: "row",
        justifyContent: "flex-end",
        alignItems: "flex-end",
        paddingHorizontal: vw * 0.04,
        gap: vw * 0.05
    },
});

export default NavBar;
