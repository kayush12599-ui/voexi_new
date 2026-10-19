import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { getAvailableEffects } from '../modules/voexi-ar-shot';

interface AREffect {
    id: string;
    name: string;
    category: string;
    thumbnail?: string;
}

/**
 * VOEXI AR SHOT PANEL
 * Redesigned to work with the modern High-Security AR Engine.
 */
export default function ARShotPanel({ onSelectEffect }: { onSelectEffect: (id: string | null) => void }) {
    const [effects, setEffects] = useState<AREffect[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [activeCategory, setActiveCategory] = useState('Trending');

    useEffect(() => {
        // Load effects from the modern Native Registry
        getAvailableEffects().then(setEffects).catch(() => setEffects([]));
    }, []);

    const categories = ['Trending', 'Face', '3D', 'World', 'Accessories'];

    return (
        <BlurView intensity={80} tint="dark" style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>VOEXI AR ENGINE</Text>
                <View style={styles.statusRow}>
                    <View style={styles.dot} />
                    <Text style={styles.statusText}>SIGNAL SYNC ACTIVE</Text>
                </View>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryBar}>
                {categories.map(cat => (
                    <TouchableOpacity
                        key={cat}
                        onPress={() => setActiveCategory(cat)}
                        style={[styles.catBtn, activeCategory === cat && styles.catBtnActive]}
                    >
                        <Text style={[styles.catText, activeCategory === cat && styles.catTextActive]}>{cat.toUpperCase()}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.effectGrid}>
                <TouchableOpacity
                    style={styles.effectCard}
                    onPress={() => { setSelectedId(null); onSelectEffect(null); }}
                >
                    <View style={styles.noneBox}>
                        <Ionicons name="close" size={30} color="#fff" />
                    </View>
                    <Text style={styles.effectName}>PURE</Text>
                </TouchableOpacity>

                {effects.map(effect => (
                    <TouchableOpacity
                        key={effect.id}
                        style={styles.effectCard}
                        onPress={() => { setSelectedId(effect.id); onSelectEffect(effect.id); }}
                    >
                        <View style={[styles.thumbBox, selectedId === effect.id && styles.thumbBoxActive]}>
                            <View style={[styles.placeholderThumb, { backgroundColor: effect.id.includes('CAT') ? '#FF0055' : '#3B82F6' }]} />
                        </View>
                        <Text style={styles.effectName}>{effect.name.toUpperCase()}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </BlurView>
    );
}

const styles = StyleSheet.create({
    container: {
        height: 220,
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        padding: 20,
        borderTopWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        backgroundColor: 'rgba(0,0,0,0.5)'
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    title: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '900',
        letterSpacing: 1,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#00F2FE',
    },
    statusText: {
        color: '#00F2FE',
        fontSize: 8,
        fontWeight: 'bold',
    },
    categoryBar: {
        marginBottom: 20,
    },
    catBtn: {
        marginRight: 20,
        paddingBottom: 4,
    },
    catBtnActive: {
        borderBottomWidth: 2,
        borderBottomColor: '#A855F7',
    },
    catText: {
        color: '#666',
        fontSize: 10,
        fontWeight: 'bold',
    },
    catTextActive: {
        color: '#fff',
    },
    effectGrid: {
        flexDirection: 'row',
    },
    effectCard: {
        alignItems: 'center',
        marginRight: 15,
        width: 70,
    },
    noneBox: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#444',
    },
    thumbBox: {
        width: 64,
        height: 64,
        borderRadius: 32,
        padding: 2,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    thumbBoxActive: {
        borderColor: '#A855F7',
        borderWidth: 2,
    },
    placeholderThumb: {
        flex: 1,
        borderRadius: 30,
        backgroundColor: '#1A0B35',
    },
    effectName: {
        color: '#fff',
        fontSize: 8,
        fontWeight: 'bold',
        marginTop: 8,
        textAlign: 'center',
    }
});
