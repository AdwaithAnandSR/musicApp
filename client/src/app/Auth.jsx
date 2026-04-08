import React, { useState } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView
} from "react-native";

import { useAppStatus } from "@store/appState.store.js";
import login from "@controllers/auth/login.js";
import register from "@controllers/auth/register.js";

const PINK = "#f9c1e9";

const Auth = () => {
    const [mode, setMode] = useState("login"); // "login" | "register" | "pending"
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const setIsAuthenticated = useAppStatus(state => state.setIsAuthenticated);

    const clearError = () => setError("");

    const handleLogin = async () => {
        if (!username.trim() || !password)
            return setError("Please fill in all fields");

        await login({
            username,
            password,
            setIsAuthenticated,
            setAuthError: setError,
            setLoading
        });
    };

    const handleRegister = async () => {
        if (!username.trim() || !password || !confirmPassword)
            return setError("Please fill in all fields");
        if (password !== confirmPassword)
            return setError("Passwords do not match");
        if (password.length < 6)
            return setError("Password must be at least 6 characters");

        await register({
            username,
            password,
            setAuthError: setError,
            setLoading,
            onSuccess: () => {
                setMode("pending");
                setUsername("");
                setPassword("");
                setConfirmPassword("");
                setError("");
            }
        });
    };

    const switchMode = next => {
        setMode(next);
        setError("");
        setPassword("");
        setConfirmPassword("");
    };

    // ── Pending verification screen ──────────────────────
    if (mode === "pending") {
        return (
            <View style={styles.container}>
                <View style={styles.centeredBox}>
                    <Text style={styles.bigIcon}>⏳</Text>
                    <Text style={styles.title}>Awaiting Verification</Text>
                    <Text style={styles.subtitle}>
                        Your account has been created.{"\n"}
                        An admin will verify it shortly.
                    </Text>
                    <TouchableOpacity
                        style={styles.button}
                        onPress={() => switchMode("login")}>
                        <Text style={styles.buttonText}>Back to Sign In</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    // ── Login / Register form ────────────────────────────
    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.bigIcon}>♪</Text>
                <Text style={styles.title}>
                    {mode === "login" ? "Welcome back" : "Create account"}
                </Text>
                <Text style={styles.subtitle}>
                    {mode === "login"
                        ? "Sign in to continue"
                        : "Register to request access"}
                </Text>
            </View>

            {/* Form */}
            <View style={styles.form}>
                <Text style={styles.label}>Username</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Enter username"
                    placeholderTextColor="#444"
                    value={username}
                    onChangeText={v => {
                        setUsername(v);
                        clearError();
                    }}
                    autoCapitalize="none"
                    autoCorrect={false}
                />

                <Text style={styles.label}>Password</Text>
                <View style={styles.passwordRow}>
                    <TextInput
                        style={[styles.input, styles.passwordInput]}
                        placeholder="Enter password"
                        placeholderTextColor="#444"
                        value={password}
                        onChangeText={v => {
                            setPassword(v);
                            clearError();
                        }}
                        secureTextEntry={!showPassword}
                        autoCapitalize="none"
                    />
                    <TouchableOpacity
                        style={styles.eyeBtn}
                        onPress={() => setShowPassword(p => !p)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Text style={styles.eyeIcon}>
                            {showPassword ? "🙈" : "👁️"}
                        </Text>
                    </TouchableOpacity>
                </View>

                {mode === "register" && (
                    <>
                        <Text style={styles.label}>Confirm Password</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Re-enter password"
                            placeholderTextColor="#444"
                            value={confirmPassword}
                            onChangeText={v => {
                                setConfirmPassword(v);
                                clearError();
                            }}
                            secureTextEntry={!showPassword}
                            autoCapitalize="none"
                        />
                    </>
                )}

                {!!error && (
                    <View style={styles.errorBox}>
                        <Text style={styles.errorText}>{error}</Text>
                    </View>
                )}

                <TouchableOpacity
                    style={[styles.button, loading && styles.buttonDisabled]}
                    onPress={mode === "login" ? handleLogin : handleRegister}
                    disabled={loading}
                    activeOpacity={0.85}>
                    {loading ? (
                        <ActivityIndicator color="black" />
                    ) : (
                        <Text style={styles.buttonText}>
                            {mode === "login" ? "Sign In" : "Register"}
                        </Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.switchBtn}
                    onPress={() =>
                        switchMode(mode === "login" ? "register" : "login")
                    }>
                    <Text style={styles.switchText}>
                        {mode === "login"
                            ? "Don't have an account? Register"
                            : "Already have an account? Sign In"}
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "black",
        justifyContent: "center",
        paddingHorizontal: 8,
        gap: 16
    },
    centeredBox: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        gap: 16,
        padding: 28
    },
    header: {
        alignItems: "center",
        marginBottom: 40
    },
    bigIcon: {
        fontSize: 56,
        marginBottom: 16,
        color: "white"
    },
    title: {
        color: PINK,
        fontSize: 26,
        fontWeight: "bold",
        marginBottom: 6
    },
    subtitle: {
        color: "#666",
        fontSize: 14,
        textAlign: "center",
        lineHeight: 20
    },
    form: {
        gap: 4
    },
    label: {
        color: "#888",
        fontSize: 12,
        fontWeight: "600",
        textTransform: "uppercase",
        letterSpacing: 0.8,
        marginTop: 16,
        marginBottom: 6
    },
    input: {
        backgroundColor: "#0f0f0f",
        borderWidth: 1,
        borderColor: "#222",
        borderRadius: 12,
        color: "white",
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 15
    },
    passwordRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8
    },
    passwordInput: {
        flex: 1
    },
    eyeBtn: {
        backgroundColor: "#0f0f0f",
        borderWidth: 1,
        borderColor: "#222",
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 14
    },
    eyeIcon: {
        fontSize: 16
    },
    errorBox: {
        backgroundColor: "#1a0a0a",
        borderWidth: 1,
        borderColor: "#4a1010",
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 10,
        marginTop: 8
    },
    errorText: {
        color: "#ff6b6b",
        fontSize: 13,
        textAlign: "center"
    },
    button: {
        backgroundColor: PINK,
        paddingVertical: 16,
        borderRadius: 14,
        alignItems: "center",
        marginTop: 24
    },
    buttonDisabled: {
        opacity: 0.55
    },
    buttonText: {
        color: "black",
        fontWeight: "700",
        fontSize: 16,
        paddingHorizontal: 8
    },
    switchBtn: {
        alignItems: "center",
        paddingVertical: 16
    },
    switchText: {
        color: "#555",
        fontSize: 13
    }
});

export default Auth;
