import { View, ActivityIndicator, StyleSheet } from "react-native";

const Index = () => {
    return (
        <View style={styles.container}>
            <ActivityIndicator size="large" color="#f9c1e9" />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "black"
    }
});

export default Index;
