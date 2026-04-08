import React, { useState, useCallback } from "react";
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    StyleSheet,
    Alert,
    RefreshControl,
    StatusBar
} from "react-native";
import { useFocusEffect } from "expo-router";

import {
    fetchAllUsers,
    setUserVerified,
    removeUser
} from "@controllers/admin.js";

const PINK = "#f9c1e9";
const FILTERS = ["All", "Pending", "Verified"];

const AdminPanel = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState("All");
    const [actionInProgress, setActionInProgress] = useState(null); // userId currently being actioned

    const loadUsers = useCallback(async (isRefresh = false) => {
        try {
            isRefresh ? setRefreshing(true) : setLoading(true);
            const data = await fetchAllUsers();
            setUsers(Array.isArray(data) ? data : []);
        } catch (err) {
            Alert.alert(
                "Error",
                err?.response?.data?.message || "Failed to load users."
            );
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    // Reload every time the screen comes into focus
    useFocusEffect(
        useCallback(() => {
            loadUsers();
        }, [loadUsers])
    );

    const handleVerify = async (userId, currentStatus) => {
        const nextStatus = !currentStatus;
        const label = nextStatus ? "verify" : "unverify";
        Alert.alert(
            `${nextStatus ? "Verify" : "Unverify"} User`,
            `Are you sure you want to ${label} this account?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: nextStatus ? "Verify" : "Unverify",
                    onPress: async () => {
                        try {
                            setActionInProgress(userId);
                            const updated = await setUserVerified(
                                userId,
                                nextStatus
                            );
                            setUsers(prev =>
                                prev.map(u => (u._id === userId ? updated : u))
                            );
                        } catch (err) {
                            Alert.alert(
                                "Error",
                                err?.response?.data?.message || "Action failed."
                            );
                        } finally {
                            setActionInProgress(null);
                        }
                    }
                }
            ]
        );
    };

    const handleDelete = async (userId, username) => {
        Alert.alert(
            "Remove User",
            `Permanently delete "${username}"? This cannot be undone.`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            setActionInProgress(userId);
                            await removeUser(userId);
                            setUsers(prev =>
                                prev.filter(u => u._id !== userId)
                            );
                        } catch (err) {
                            Alert.alert(
                                "Error",
                                err?.response?.data?.message || "Delete failed."
                            );
                        } finally {
                            setActionInProgress(null);
                        }
                    }
                }
            ]
        );
    };

    const filtered = users.filter(u => {
        if (filter === "Pending") return !u.isVerified;
        if (filter === "Verified") return u.isVerified;
        return true;
    });

    const pendingCount = users.filter(u => !u.isVerified).length;

    const renderUser = ({ item }) => {
        const isBusy = actionInProgress === item._id;
        return (
            <View style={styles.card}>
                {/* Avatar + Info */}
                <View style={styles.cardLeft}>
                    <View
                        style={[
                            styles.avatar,
                            item.role === "admin" && styles.avatarAdmin
                        ]}>
                        <Text style={styles.avatarText}>
                            {item.username?.[0]?.toUpperCase() ?? "?"}
                        </Text>
                    </View>
                    <View style={styles.userInfo}>
                        <Text style={styles.username} numberOfLines={1}>
                            {item.username}
                        </Text>
                        <View style={styles.badgeRow}>
                            <View
                                style={[
                                    styles.badge,
                                    item.role === "admin"
                                        ? styles.badgeAdmin
                                        : styles.badgeUser
                                ]}>
                                <Text style={styles.badgeText}>
                                    {item.role}
                                </Text>
                            </View>
                            <View
                                style={[
                                    styles.badge,
                                    item.isVerified
                                        ? styles.badgeVerified
                                        : styles.badgePending
                                ]}>
                                <Text style={styles.badgeText}>
                                    {item.isVerified
                                        ? "✓ verified"
                                        : "⏳ pending"}
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Actions */}
                {isBusy ? (
                    <ActivityIndicator
                        color={PINK}
                        style={{ marginLeft: 12 }}
                    />
                ) : (
                    <View style={styles.actions}>
                        {/* Don't allow admins to be modified */}
                        {item.role !== "admin" && (
                            <>
                                <TouchableOpacity
                                    style={[
                                        styles.actionBtn,
                                        item.isVerified
                                            ? styles.btnUnverify
                                            : styles.btnVerify
                                    ]}
                                    onPress={() =>
                                        handleVerify(item._id, item.isVerified)
                                    }>
                                    <Text style={styles.actionBtnText}>
                                        {item.isVerified
                                            ? "Unverify"
                                            : "Verify"}
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.actionBtn, styles.btnDelete]}
                                    onPress={() =>
                                        handleDelete(item._id, item.username)
                                    }>
                                    <Text style={styles.actionBtnText}>
                                        Remove
                                    </Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                )}
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />

            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Admin Panel</Text>
                <Text style={styles.headerSub}>
                    {users.length} user{users.length !== 1 ? "s" : ""}
                    {pendingCount > 0 && (
                        <Text style={styles.pendingBadge}>
                            {" "}
                            · {pendingCount} pending
                        </Text>
                    )}
                </Text>
            </View>

            {/* Filter tabs */}
            <View style={styles.filterRow}>
                {FILTERS.map(f => (
                    <TouchableOpacity
                        key={f}
                        style={[
                            styles.filterBtn,
                            filter === f && styles.filterBtnActive
                        ]}
                        onPress={() => setFilter(f)}>
                        <Text
                            style={[
                                styles.filterText,
                                filter === f && styles.filterTextActive
                            ]}>
                            {f}
                            {f === "Pending" && pendingCount > 0
                                ? ` (${pendingCount})`
                                : ""}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* List */}
            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator color={PINK} size="large" />
                </View>
            ) : filtered.length === 0 ? (
                <View style={styles.centered}>
                    <Text style={styles.emptyIcon}>👤</Text>
                    <Text style={styles.emptyText}>No users found</Text>
                </View>
            ) : (
                <FlatList
                    data={filtered}
                    keyExtractor={item => item._id}
                    renderItem={renderUser}
                    contentContainerStyle={styles.list}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => loadUsers(true)}
                            tintColor={PINK}
                        />
                    }
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#000"
    },
    header: {
        paddingTop: 56,
        paddingHorizontal: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#111"
    },
    headerTitle: {
        color: PINK,
        fontSize: 26,
        fontWeight: "800",
        letterSpacing: 0.5
    },
    headerSub: {
        color: "#555",
        fontSize: 13,
        marginTop: 4
    },
    pendingBadge: {
        color: "#f0a500"
    },
    filterRow: {
        flexDirection: "row",
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 8,
        borderBottomWidth: 1,
        borderBottomColor: "#111"
    },
    filterBtn: {
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: "#111",
        borderWidth: 1,
        borderColor: "#222"
    },
    filterBtnActive: {
        backgroundColor: PINK,
        borderColor: PINK
    },
    filterText: {
        color: "#666",
        fontSize: 13,
        fontWeight: "600"
    },
    filterTextActive: {
        color: "#000"
    },
    list: {
        padding: 16,
        gap: 10
    },
    card: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "#0d0d0d",
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: "#1a1a1a",
        marginBottom: 10
    },
    cardLeft: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
        gap: 12,
        marginRight: 8
    },
    avatar: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: "#1e1e2e",
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#333"
    },
    avatarAdmin: {
        borderColor: PINK,
        backgroundColor: "#2a1a26"
    },
    avatarText: {
        color: PINK,
        fontSize: 18,
        fontWeight: "700"
    },
    userInfo: {
        flex: 1,
        gap: 5
    },
    username: {
        color: "#fff",
        fontSize: 15,
        fontWeight: "600"
    },
    badgeRow: {
        flexDirection: "row",
        gap: 6,
        flexWrap: "wrap"
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8
    },
    badgeAdmin: { backgroundColor: "#3a1a36" },
    badgeUser: { backgroundColor: "#1a1a2e" },
    badgeVerified: { backgroundColor: "#0d2d0d" },
    badgePending: { backgroundColor: "#2d2000" },
    badgeText: {
        color: "#aaa",
        fontSize: 10,
        fontWeight: "700",
        textTransform: "uppercase",
        letterSpacing: 0.5
    },
    actions: {
        flexDirection: "row",
        gap: 8
    },
    actionBtn: {
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 10,
        minWidth: 68,
        alignItems: "center"
    },
    btnVerify: { backgroundColor: "#163016" },
    btnUnverify: { backgroundColor: "#2d1a00" },
    btnDelete: { backgroundColor: "#2d0a0a" },
    actionBtnText: {
        fontSize: 12,
        fontWeight: "700",
        color: "#ccc"
    },
    centered: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        gap: 12
    },
    emptyIcon: { fontSize: 42 },
    emptyText: { color: "#444", fontSize: 15 }
});

export default AdminPanel;
