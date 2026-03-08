import React from "react";
import { View, Text, StyleSheet } from "react-native";

const Toast = ({text}) => {
    return (
        <View style={styles.container}>
            <Text style={styles.text} numberOfLines={1}>{text}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        justifyContent: "center",
        alignItems: "center",
        position: 'absolute',
        left: '50%',
        transform: [{ translateX: "-50%"}],
        bottom: "8%",
        backgroundColor: '#171717',
        minWidth: "50%",
        maxWidth: "85%",
        minHeight: "6%",
        borderRadius: 10,
        paddingHorizontal: 15,
    },
    text: {
        color: "white"
    }
});

export default Toast;
