import React, { useRef, useState } from "react";
import { View, Button, Text, TouchableOpacity } from "react-native";
import { WebView } from "react-native-webview";

import handleDownload from "../controllers/downloadViaUrl.js"

export default function App() {
    const webviewRef = useRef(null);
    const [currentUrl, setCurrentUrl] = useState("");

    const handleGetUrl = () => {
        if (webviewRef.current) {
            webviewRef.current.injectJavaScript(`
        window.ReactNativeWebView.postMessage(window.location.href);
        true;
      `);
        }
    };

    const handleMessage = event => {
        const url = event.nativeEvent.data;
        setCurrentUrl(url);
    };

    return (
        <View style={{ flex: 1 }}>
            <WebView
                ref={webviewRef}
                source={{ uri: "https://m.youtube.com" }}
                onMessage={handleMessage}
                javaScriptEnabled={true}
                style={{ flex: 1 }}
            />
            <Button title="Get Current URL" onPress={handleGetUrl} />
            {currentUrl ? (
                <View>
                    <Text style={{ padding: 10 }}>
                        Current URL: {currentUrl}
                    </Text>

                    <TouchableOpacity onPress={()=> handleDownload(currentUrl)}>
                        <Text style={{ padding: 10 }}>Download</Text>
                    </TouchableOpacity>
                </View>
            ) : null}
        </View>
    );
}
