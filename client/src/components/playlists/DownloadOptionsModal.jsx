import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, TextInput } from 'react-native';

const DownloadOptionsModal = ({ visible, onClose, onSelect }) => {
    const [custom, setCustom] = useState('');
    const options = [15, 30, 50, 100];

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
                <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
                    <Text style={styles.title}>Download Songs</Text>
                    <Text style={styles.subtitle}>Select the number of songs to download:</Text>
                    
                    <View style={styles.optionsContainer}>
                        {options.map((opt) => (
                            <TouchableOpacity key={opt} style={styles.optionBtn} onPress={() => { onSelect(opt); onClose(); }}>
                                <Text style={styles.optionText}>{opt} Songs</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    
                    <View style={styles.customContainer}>
                        <TextInput 
                            style={styles.input} 
                            placeholder="Custom number" 
                            placeholderTextColor="#888"
                            keyboardType="numeric"
                            value={custom}
                            onChangeText={setCustom}
                        />
                        <TouchableOpacity 
                            style={styles.customBtn} 
                            onPress={() => {
                                const num = parseInt(custom, 10);
                                if (!isNaN(num) && num > 0) {
                                    onSelect(num);
                                    onClose();
                                }
                            }}
                        >
                            <Text style={styles.customBtnText}>Download</Text>
                        </TouchableOpacity>
                    </View>
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
        width: '80%',
        backgroundColor: '#1f1f1f',
        borderRadius: 16,
        padding: 20
    },
    title: {
        color: 'white',
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 10
    },
    subtitle: {
        color: '#ccc',
        marginBottom: 20
    },
    optionsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 20
    },
    optionBtn: {
        backgroundColor: '#333',
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 8,
        width: '45%',
        alignItems: 'center'
    },
    optionText: {
        color: 'white',
        fontWeight: 'bold'
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
    customBtn: {
        backgroundColor: '#22f97e',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
        borderRadius: 8,
        height: 45
    },
    customBtnText: {
        color: 'black',
        fontWeight: 'bold'
    }
});

export default DownloadOptionsModal;
