import React, { useRef, useState, useEffect } from "react";
import {
    BackHandler,
    Alert,
    View,
    Modal,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView
} from "react-native";
import { WebView } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { router } from "expo-router";
import CookieManager from "@preeternal/react-native-cookie-manager";

const Youtube = () => {
    const webviewRef = useRef(null);
    const [canGoBack, setCanGoBack] = useState(false);
    const [currentUrl, setCurrentUrl] = useState("https://m.youtube.com/");

    // Modal state
    const [isModalVisible, setModalVisible] = useState(false);
    const [url, setUrl] = useState("");
    const [skip, setSkip] = useState("0");
    const [limit, setLimit] = useState("1");
    const [cookies, setCookies] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleBackPress = () => {
        if (isModalVisible) {
            setModalVisible(false);
            return true;
        }

        // Strip domain and query parameters to check the path
        const strippedUrl = currentUrl.replace(
            /^https?:\/\/(www\.)?(m\.)?youtube\.com/,
            ""
        );
        const path = strippedUrl.split("?")[0];
        const isHome = path === "/" || path === "";

        if (isHome || !canGoBack) {
            Alert.alert("Exit YouTube", "Do you want to exit YouTube?", [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Exit",
                    style: "destructive",
                    onPress: () => router.back()
                }
            ]);
            return true; // prevent default back action
        } else {
            webviewRef.current?.goBack();
            return true;
        }
    };

    // Handle physical Android hardware back button
    useEffect(() => {
        const backHandler = BackHandler.addEventListener(
            "hardwareBackPress",
            handleBackPress
        );
        return () => backHandler.remove();
    }, [canGoBack, currentUrl, isModalVisible]);

    const handleOpenModal = async () => {
        setUrl(currentUrl);
        setModalVisible(true);

        try {
            const cookieObj = await CookieManager.get("https://m.youtube.com/");

            if (cookieObj) {
                if (typeof cookieObj === "object") {
                    const cookieStr = Object.entries(cookieObj)
                        .map(([name, item]) => {
                            const val =
                                typeof item === "object" &&
                                item !== null &&
                                "value" in item
                                    ? item.value
                                    : item;
                            return `${name}=${val}`;
                        })
                        .join("; ");
                    setCookies(cookieStr);
                } else if (typeof cookieObj === "string") {
                    setCookies(cookieObj);
                }
            }
        } catch (e) {
            console.error("Failed to get cookies via CookieManager:", e);
        }
    };

    const handleDownload = async () => {
        if (!url) {
            Alert.alert("Error", "URL is required");
            return;
        }

        setIsLoading(true);
        try {
            const response = await axios.post("https://musicapp-ju7o.onrender.com/admin/youtubeDownload", {
                url,
                skip: parseInt(skip, 10) || 0,
                limit: parseInt(limit, 10) || 1,
                cookies
            });

            Alert.alert(
                "Success",
                response?.data?.message || "Download process started successfully!"
            );
            setModalVisible(false);
        } catch (error) {
            Alert.alert(
                "Error",
                error?.response?.data?.message || "Failed to start download"
            );
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: "black" }}>
            <WebView
                ref={webviewRef}
                source={{ uri: "https://m.youtube.com/" }}
                style={{ flex: 1, backgroundColor: "black" }}
                onNavigationStateChange={navState => {
                    setCanGoBack(navState.canGoBack);
                    setCurrentUrl(navState.url);
                }}
            />

            {/* Floating Action Button */}
            <TouchableOpacity style={styles.fab} onPress={handleOpenModal}>
                <Ionicons name="download-outline" size={24} color="white" />
            </TouchableOpacity>

            {/* Download Modal */}
            <Modal
                visible={isModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setModalVisible(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={styles.modalContainer}
                >
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>
                            Download from YouTube
                        </Text>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            <Text style={styles.label}>URL</Text>
                            <TextInput
                                style={styles.input}
                                value={url}
                                onChangeText={setUrl}
                                placeholder="Video, Playlist, or Channel URL"
                                placeholderTextColor="#888"
                                selectTextOnFocus={true}
                            />

                            <View style={styles.row}>
                                <View style={{ flex: 1, marginRight: 10 }}>
                                    <Text style={styles.label}>Skip</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={skip}
                                        onChangeText={setSkip}
                                        keyboardType="numeric"
                                        placeholder="0"
                                        placeholderTextColor="#888"
                                        selectTextOnFocus={true}
                                    />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.label}>Limit</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={limit}
                                        onChangeText={setLimit}
                                        keyboardType="numeric"
                                        placeholder="1"
                                        placeholderTextColor="#888"
                                        selectTextOnFocus={true}
                                    />
                                </View>
                            </View>

                            <Text style={styles.label}>Cookies (Optional)</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                value={cookies}
                                onChangeText={setCookies}
                                placeholder="Paste cookies here to bypass bot checks..."
                                placeholderTextColor="#888"
                                multiline
                                numberOfLines={4}
                            />
                        </ScrollView>

                        <View style={styles.buttonContainer}>
                            <TouchableOpacity
                                style={[styles.button, styles.cancelButton]}
                                onPress={() => setModalVisible(false)}
                                disabled={isLoading}
                            >
                                <Text style={styles.buttonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.button, styles.submitButton]}
                                onPress={handleDownload}
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <Text style={styles.buttonText}>
                                        Download
                                    </Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    fab: {
        position: "absolute",
        bottom: 20,
        right: 20,
        backgroundColor: "#ff0000",
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: "center",
        alignItems: "center",
        elevation: 5,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3
    },
    modalContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(0, 0, 0, 0.7)"
    },
    modalContent: {
        width: "90%",
        backgroundColor: "#1e1e1e",
        borderRadius: 15,
        padding: 20,
        maxHeight: "80%"
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: "bold",
        color: "white",
        marginBottom: 20,
        textAlign: "center"
    },
    label: {
        color: "#ccc",
        marginBottom: 5,
        fontSize: 14
    },
    input: {
        backgroundColor: "#333",
        color: "white",
        borderRadius: 8,
        padding: 12,
        marginBottom: 15,
        fontSize: 14
    },
    textArea: {
        height: 100,
        textAlignVertical: "top"
    },
    row: {
        flexDirection: "row",
        justifyContent: "space-between"
    },
    buttonContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 10
    },
    button: {
        flex: 1,
        padding: 12,
        borderRadius: 8,
        justifyContent: "center",
        alignItems: "center"
    },
    cancelButton: {
        backgroundColor: "#555",
        marginRight: 10
    },
    submitButton: {
        backgroundColor: "#ff0000",
        marginLeft: 10
    },
    buttonText: {
        color: "white",
        fontWeight: "bold",
        fontSize: 16
    }
});

export default Youtube;
