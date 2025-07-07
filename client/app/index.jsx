import React from "react";
import { View, Text, StyleSheet } from "react-native";

const Index = () => {
    const list = ["🥳", "😶‍🌫️", "😈", "💫", "🍄", "👨‍🎤", "🧑‍🎤"];
    return (
        <View style={styles.container}>
            <Text style={styles.text}>
                {list[Math.floor(Math.random() * 7)]}
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "black"
    },
    text: {
        color: "white",
        fontSize: 80,
        fontWeight: "bold"
    }
});

export default Index;
