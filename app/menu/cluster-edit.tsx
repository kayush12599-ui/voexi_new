import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Image, TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import { uploadToBunny } from '../../lib/bunnyStorage';

export default function ClusterEditScreen() {
  const { clusterId } = useLocalSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isLeader, setIsLeader] = useState(false);

  useEffect(() => {
    fetchClusterData();
  }, [clusterId]);

  const fetchClusterData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase.from('groups').select('*').eq('id', clusterId).single();
      if (data) {
        setName(data.name);
        setDescription(data.description || '');
        setAvatarUrl(data.avatar_url);
        setIsLeader(data.created_by === user?.id);
      }
    } catch (e) {} finally { setLoading(false); }
  };

  const pickImage = async () => {
    if (!isLeader) return;
    let result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.5 });
    if (!result.canceled) {
      setSaving(true);
      try {
        const url = await uploadToBunny(result.assets[0].uri, 'image');
        setAvatarUrl(url);
      } catch (e) { Alert.alert("Upload Failed"); } finally { setSaving(false); }
    }
  };

  const handleSave = async () => {
    if (!name.trim()) return Alert.alert("Name required");
    setSaving(true);
    try {
      const { error } = await supabase.from('groups').update({ name, description, avatar_url: avatarUrl }).eq('id', clusterId);
      if (!error) {
        if (router.canGoBack()) router.back();
        else router.replace('/menu/communities');
      }
      else Alert.alert("Error", error.message);
    } catch (e) {} finally { setSaving(false); }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color="#7C5CFF" /></View>;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/menu/communities')}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>EDIT CLUSTER INFO</Text>
        <TouchableOpacity onPress={handleSave} disabled={!isLeader || saving}>
          {saving ? <ActivityIndicator size="small" color="#7C5CFF" /> : <Text style={[styles.saveText, !isLeader && {opacity: 0.3}]}>DONE</Text>}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{flex: 1}}>
        <ScrollView contentContainerStyle={{padding: 20}}>
          <TouchableOpacity style={styles.avatarSection} onPress={pickImage}>
            <Image source={{ uri: avatarUrl || 'https://via.placeholder.com/150' }} style={styles.avatar} />
            {isLeader && <View style={styles.editBadge}><Ionicons name="camera" size={16} color="#fff" /></View>}
          </TouchableOpacity>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>CLUSTER NAME</Text>
            <TextInput style={[styles.input, !isLeader && styles.disabled]} value={name} onChangeText={setName} editable={isLeader} placeholder="Name your cluster" placeholderTextColor="#444" />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>DESCRIPTION</Text>
            <TextInput style={[styles.input, styles.textArea, !isLeader && styles.disabled]} value={description} onChangeText={setDescription} editable={isLeader} multiline numberOfLines={4} placeholder="What is this cluster about?" placeholderTextColor="#444" />
          </View>

          {!isLeader && (
            <View style={styles.infoBox}>
              <Ionicons name="information-circle-outline" size={20} color="#666" />
              <Text style={styles.infoText}>Only the leader can edit cluster info.</Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15 },
  headerTitle: { color: '#fff', fontSize: 14, fontWeight: '900', letterSpacing: 2, textTransform: 'uppercase' },
  saveText: { color: '#7C5CFF', fontWeight: '900', fontSize: 12, letterSpacing: 1 },
  avatarSection: { alignSelf: 'center', marginBottom: 40, position: 'relative', marginTop: 10 },
  avatar: { width: 130, height: 130, borderRadius: 45, backgroundColor: '#0D0D12', borderWidth: 1, borderColor: '#1A1A1F' },
  editBadge: { position: 'absolute', bottom: -5, right: -5, backgroundColor: '#7C5CFF', width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 4, borderColor: '#000' },
  inputGroup: { marginBottom: 25 },
  label: { color: '#6366F1', fontSize: 10, fontWeight: '900', marginBottom: 10, letterSpacing: 1.5 },
  input: { backgroundColor: '#0D0D12', color: '#fff', padding: 18, borderRadius: 18, borderWidth: 1, borderColor: '#1A1A1F', fontSize: 15, fontWeight: '500' },
  textArea: { height: 120, textAlignVertical: 'top' },
  disabled: { color: '#444', backgroundColor: '#050508', borderColor: '#111' },
  infoBox: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 20, backgroundColor: 'rgba(124, 92, 255, 0.05)', borderRadius: 18, marginTop: 10, borderWidth: 1, borderColor: 'rgba(124, 92, 255, 0.1)' },
  infoText: { color: '#8E8E93', fontSize: 12, flex: 1, lineHeight: 18, fontWeight: '500' }
});
