import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, TextInput, ScrollView } from 'react-native';
import { getDownloadedPlaylists } from '../../services/downloads/downloadService';

const DestinationPickerModal = ({ visible, onClose, onSelect, defaultName = "My Downloads" }) => {
    const [playlistName, setPlaylistName] = useState(defaultName);
    const [concurrency, setConcurrency] = useState(3);
    const [localPlaylists, setLocalPlaylists] = useState([]);

    useEffect(() => {
        if (visible) {
            getDownloadedPlaylists().then(playlists => {
                // filter out just names or show them as pills
                setLocalPlaylists(playlists || []);
            }).catch(console.error);
        }
    }, [visible]);

    const handleSelect = () => {
        if (playlistName.trim()) {
            onSelect(playlistName.trim(), concurrency);
            onClose();
        }
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
                <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
                    <Text style={styles.title}>Download Destination</Text>
                    
                    <Text style={styles.subtitle}>Select existing:</Text>
                    {localPlaylists.length > 0 ? (
                        <ScrollView 
                            horizontal 
                            showsHorizontalScrollIndicator={false}
                            style={styles.scrollContainer}
                        >
                            {localPlaylists.map((pl, idx) => (
                                <TouchableOpacity 
                                    key={idx} 
                                    style={[
                                        styles.playlistPill, 
                                        playlistName === pl.name && styles.playlistPillActive
                                    ]}
                                    onPress={() => setPlaylistName(pl.name)}
                                >
                                    <Text style={[
                                        styles.playlistPillText,
                                        playlistName === pl.name && styles.playlistPillTextActive
                                    ]}>
                                        {pl.name || "Unnamed"}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    ) : (
                        <Text style={{color: '#888', fontStyle: 'italic', marginBottom: 15}}>No existing playlists found</Text>
                    )}

                    <Text style={styles.subtitle}>Or enter name:</Text>
                    <View style={styles.customContainer}>
                        <TextInput 
                            style={styles.input} 
                            placeholder="Playlist Name" 
                            placeholderTextColor="#888"
                            value={playlistName}
                            onChangeText={setPlaylistName}
                        />
                    </View>

                    <Text style={[styles.subtitle, {marginTop: 20}]}>Parallel Downloads:</Text>
                    <View style={styles.concurrencyContainer}>
                        <TouchableOpacity 
                            style={styles.concurrencyBtn} 
                            onPress={() => setConcurrency(prev => Math.max(1, prev - 1))}
                        >
                            <Text style={styles.concurrencyBtnText}>-</Text>
                        </TouchableOpacity>
                        <Text style={styles.concurrencyText}>{concurrency}</Text>
                        <TouchableOpacity 
                            style={styles.concurrencyBtn} 
                            onPress={() => setConcurrency(prev => prev + 1)}
                        >
                            <Text style={styles.concurrencyBtnText}>+</Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity 
                        style={styles.downloadBtn} 
                        onPress={handleSelect}
                    >
                        <Text style={styles.downloadBtnText}>Start Download</Text>
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center'
    },
    modalContent: {
        width: '85%',
        backgroundColor: '#1f1f1f',
        borderRadius: 16,
        padding: 20
    },
    title: {
        color: 'white',
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 15
    },
    subtitle: {
        color: '#ccc',
        marginBottom: 10,
        fontSize: 13
    },
    scrollContainer: {
        flexDirection: 'row',
        marginBottom: 15,
        maxHeight: 40
    },
    playlistPill: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#333',
        marginRight: 8,
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#444'
    },
    playlistPillActive: {
        backgroundColor: 'rgba(34, 249, 126, 0.2)',
        borderColor: '#22f97e'
    },
    playlistPillText: {
        color: '#ccc',
        fontSize: 13,
        fontWeight: 'bold'
    },
    playlistPillTextActive: {
        color: '#22f97e'
    },
    customContainer: {
        flexDirection: 'row',
        gap: 10
    },
    input: {
        flex: 1,
        backgroundColor: '#333',
        color: 'white',
        borderRadius: 8,
        paddingHorizontal: 15,
        height: 45
    },
    downloadBtn: {
        backgroundColor: '#22f97e',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 12,
        borderRadius: 8,
        marginTop: 10
    },
    downloadBtnText: {
        color: 'black',
        fontWeight: 'bold',
        fontSize: 16
    },
    concurrencyContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 20,
        backgroundColor: '#333',
        alignSelf: 'flex-start',
        borderRadius: 8,
        padding: 5
    },
    concurrencyBtn: {
        backgroundColor: '#444',
        width: 35,
        height: 35,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 8
    },
    concurrencyBtnText: {
        color: 'white',
        fontSize: 20,
        fontWeight: 'bold'
    },
    concurrencyText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
        minWidth: 20,
        textAlign: 'center'
    }
});

export default DestinationPickerModal;
