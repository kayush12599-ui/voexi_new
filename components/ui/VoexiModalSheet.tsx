import React from 'react';
import { StyleSheet, View, Text, Modal, Pressable, ScrollView, TouchableOpacity } from 'react-native';
import { VOEXITheme } from '../../constants/theme';
import * as Haptics from 'expo-haptics';

export interface MenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onPress: () => void;
  destructive?: boolean;
}

interface VoexiModalSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  items?: MenuItem[];
  children?: React.ReactNode;
  isLight?: boolean;
}

export const VoexiModalSheet: React.FC<VoexiModalSheetProps> = ({
  visible,
  onClose,
  title,
  items,
  children,
  isLight = false,
}) => {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.optionsSheet, isLight && styles.lightSheet]}>
          {/* Top Drag Handle */}
          <View style={styles.sheetHandle} />

          {title && (
            <Text style={[styles.sheetTitle, isLight && styles.lightSheetTitle]}>
              {title}
            </Text>
          )}

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 15 }}>
            {items && items.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.menuItem, isLight && styles.lightMenuItem]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  item.onPress();
                }}
              >
                <Text style={[
                  styles.menuLabel,
                  item.destructive && styles.destructiveLabel,
                  isLight && !item.destructive && styles.lightMenuLabel
                ]}>
                  {item.label}
                </Text>
                {item.icon && <View style={styles.iconWrapper}>{item.icon}</View>}
              </TouchableOpacity>
            ))}

            {children}
          </ScrollView>

          <TouchableOpacity
            style={styles.closeBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onClose();
            }}
          >
            <Text style={styles.closeText}>CANCEL</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  optionsSheet: {
    backgroundColor: '#0A0A0F',
    borderTopLeftRadius: 35,
    borderTopRightRadius: 35,
    paddingHorizontal: 25,
    paddingTop: 15,
    paddingBottom: 25,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: '#1A1A24',
    borderBottomWidth: 0,
  },
  lightSheet: {
    backgroundColor: '#F9F9FB',
    borderColor: '#EEEEEE',
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#333333',
    alignSelf: 'center',
    marginBottom: 20,
    borderRadius: 2,
  },
  sheetTitle: {
    color: '#666666',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 15,
    textTransform: 'uppercase',
  },
  lightSheetTitle: {
    color: '#888888',
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A24',
  },
  lightMenuItem: {
    borderBottomColor: '#EEEEEE',
  },
  menuLabel: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  lightMenuLabel: {
    color: '#000000',
  },
  destructiveLabel: {
    color: '#FF4444',
  },
  iconWrapper: {
    marginLeft: 10,
  },
  closeBtn: {
    marginTop: 15,
    alignItems: 'center',
    paddingVertical: 12,
  },
  closeText: {
    color: '#888888',
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 1,
  },
});
