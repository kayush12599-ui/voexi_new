import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, ActivityIndicator, FlatList, RefreshControl, Modal, Alert, Animated } from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { VOEXITheme } from '../../constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { WalletService } from '../../lib/walletService';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../hooks/useTheme';
import { Image as ExpoImage } from 'expo-image';
import * as Haptics from 'expo-haptics';

// 3D Glowing Purple Diamond Asset from 3D Server Vault (Local 3D Asset + Remote Fallback)
const DIAMOND_3D_LOCAL = 'http://192.168.31.39:8085/avatar/models/diamond_3d.png';
const DIAMOND_3D_REMOTE = 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Gem%20Stone.png';

function Diamond3DIcon({ size = 28 }: { size?: number }) {
  return (
    <Ionicons
      name="diamond"
      size={size * 0.9}
      color="#A855F7"
      style={{
        shadowColor: '#A855F7',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 6,
      }}
    />
  );
}

// Live H:M:S Countdown Timer Component for Expiring Drops
function FlashCountdownTimer({ expiresAt }: { expiresAt: string | null }) {
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number } | null>(null);

  useEffect(() => {
    if (!expiresAt) return;

    const calculateTime = () => {
      const difference = new Date(expiresAt).getTime() - new Date().getTime();
      if (difference <= 0) {
        setTimeLeft(null);
        return;
      }
      setTimeLeft({
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60)
      });
    };

    calculateTime();
    const timer = setInterval(calculateTime, 1000);
    return () => clearInterval(timer);
  }, [expiresAt]);

  if (!timeLeft) return null;

  const pad = (n: number) => n.toString().padStart(2, '0');

  return (
    <View style={styles.timerPill}>
      <Ionicons name="time-outline" size={13} color="#FFD700" />
      <Text style={styles.timerText}>
        {pad(timeLeft.hours)}h:{pad(timeLeft.minutes)}m:{pad(timeLeft.seconds)}s
      </Text>
    </View>
  );
}

export default function DiamondStoreScreen() {
  const router = useRouter();
  const { isLight } = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [diamondBalance, setDiamondBalance] = useState<number>(0);
  const [packages, setPackages] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedPkg, setSelectedPkg] = useState<any | null>(null);
  const [buying, setBuying] = useState(false);

  // Pulse animation for gem icon
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!userId) return;

    // Pulse animation for balance bar
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.0, duration: 800, useNativeDriver: true }),
      ])
    ).start();

    // Real-time Subscriptions
    const packageSub = WalletService.subscribeToFlashDrops(() => {
      fetchData(true);
    });

    const balanceSub = WalletService.subscribeToUserDiamonds(userId, (newBal) => {
      setDiamondBalance(newBal);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    });

    const txSub = WalletService.subscribeToDiamondTransactions(userId, (newTx) => {
      setTransactions(prev => [newTx, ...prev]);
    });

    return () => {
      packageSub.unsubscribe();
      balanceSub.unsubscribe();
      txSub.unsubscribe();
    };
  }, [userId]);

  const fetchData = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const [bal, pkgs, txs] = await Promise.all([
        WalletService.getDiamondBalance(user.id),
        WalletService.getDiamondPackages(),
        WalletService.getDiamondTransactions(user.id)
      ]);

      setDiamondBalance(bal);
      setPackages(pkgs);
      setTransactions(txs);
    } catch (e) {
      console.error("[DIAMOND_STORE] Error fetching data:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handlePurchase = async () => {
    if (!userId || !selectedPkg || buying) return;
    setBuying(true);

    try {
      const result = await WalletService.purchaseDiamondPackage(userId, selectedPkg.id);
      if (result?.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setDiamondBalance(result.new_balance);
        Alert.alert("🔥 TOP-UP SUCCESSFUL!", `Added +${result.gems_added} Diamonds to your wallet!`);
        setSelectedPkg(null);
        fetchData(true);
      } else {
        Alert.alert("Purchase Failed", result?.error || "Transaction could not be processed.");
      }
    } catch (e: any) {
      Alert.alert("Purchase Error", e.message || "Network error occurred.");
    } finally {
      setBuying(false);
    }
  };

  const flashDrops = packages.filter(p => p.expires_at !== null && new Date(p.expires_at).getTime() > Date.now());
  const permanentPackages = packages.filter(p => p.expires_at === null || new Date(p.expires_at).getTime() <= Date.now());

  if (loading && !refreshing) {
    return (
      <View style={[styles.loader, isLight && { backgroundColor: '#fff' }]}>
        <ActivityIndicator color={VOEXITheme.colors.primary} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, isLight && { backgroundColor: '#fff' }]}>
      {/* HEADER */}
      <View style={[styles.header, isLight && { borderBottomColor: '#EEE', borderBottomWidth: 1 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={26} color={isLight ? '#000' : '#fff'} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isLight && { color: '#000' }]}>DIAMOND STORE</Text>
        <View style={styles.balanceBadge}>
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <Diamond3DIcon size={20} />
          </Animated.View>
          <Text style={styles.balanceText}>{diamondBalance.toLocaleString()}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(true); }} tintColor="#00D4FF" />}
        showsVerticalScrollIndicator={false}
      >
        {/* HERO FLASH REWARD DROPS SECTION */}
        {flashDrops.map((drop) => (
          <LinearGradient
            key={drop.id}
            colors={['#1a0b2e', '#090a1a', '#000000']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.flashDropCard}
          >
            {/* ROW 1: BADGE & COUNTDOWN TIMER */}
            <View style={styles.flashHeaderRow}>
              <View style={styles.flashBadge}>
                <Text style={styles.flashBadgeText}>{drop.badge_tag || '🔥 LIMITED EVENT DROP'}</Text>
              </View>
              <FlashCountdownTimer expiresAt={drop.expires_at} />
            </View>

            {/* ROW 2: TITLE & BASE + BONUS GEMS DISPLAY */}
            <View style={styles.flashBodyRow}>
              <Text style={styles.flashTitle}>{drop.title}</Text>
              <View style={styles.gemsDisplayRow}>
                <View style={styles.baseGemBox}>
                  <Diamond3DIcon size={36} />
                  <Text style={styles.baseGemValue}>{drop.base_diamonds}</Text>
                </View>

                {drop.bonus_gems > 0 && (
                  <View style={styles.bonusPillBadge}>
                    <Text style={styles.bonusPillText}>+{drop.bonus_gems} BONUS GEMS</Text>
                  </View>
                )}
              </View>
            </View>

            {/* ROW 3: PRICE & ACTION BUTTON */}
            <TouchableOpacity style={styles.buyFlashBtn} onPress={() => setSelectedPkg(drop)}>
              <LinearGradient colors={['#A855F7', '#00D4FF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.buyGradient}>
                <Text style={styles.buyBtnText}>₹{drop.price_inr} TOP-UP NOW</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>
        ))}

        {/* PERMANENT PACKAGES SECTION */}
        <View style={styles.sectionHeader}>
          <Ionicons name="flash-outline" size={18} color="#A855F7" />
          <Text style={[styles.sectionTitle, isLight && { color: '#333' }]}>PERMANENT STORE PACKAGES</Text>
        </View>

        <View style={styles.packagesGrid}>
          {permanentPackages.map((pkg) => (
            <TouchableOpacity
              key={pkg.id}
              style={[
                styles.gridCard,
                pkg.title.includes('Yantra') && styles.yantraCard,
                isLight && { backgroundColor: '#F9F9F9', borderColor: '#EEE' }
              ]}
              onPress={() => setSelectedPkg(pkg)}
            >
              {pkg.badge_tag && (
                <View style={styles.miniBadge}>
                  <Text style={styles.miniBadgeText}>{pkg.badge_tag}</Text>
                </View>
              )}

              <View style={styles.gridIconCircle}>
                <Diamond3DIcon size={36} />
              </View>

              <Text style={[styles.gridTitle, isLight && { color: '#000' }]} numberOfLines={1}>{pkg.title}</Text>

              <View style={styles.gridGemsRow}>
                <Diamond3DIcon size={16} />
                <Text style={styles.gridBaseGems}>{pkg.base_diamonds}</Text>
                {pkg.bonus_gems > 0 && (
                  <Text style={styles.gridBonusGems}>+{pkg.bonus_gems}</Text>
                )}
              </View>

              <View style={styles.pricePill}>
                <Text style={styles.pricePillText}>₹{pkg.price_inr}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* TRANSACTIONS LEDGER SECTION */}
        <View style={styles.sectionHeader}>
          <Ionicons name="receipt-outline" size={18} color="#00D4FF" />
          <Text style={[styles.sectionTitle, isLight && { color: '#333' }]}>DIAMOND TRANSACTIONS LEDGER</Text>
        </View>

        {transactions.length === 0 ? (
          <View style={styles.emptyLedger}>
            <Text style={styles.emptyText}>No recent diamond transactions logged.</Text>
          </View>
        ) : (
          transactions.map((tx) => (
            <View key={tx.id} style={[styles.txCard, isLight && { backgroundColor: '#F9F9F9', borderColor: '#EEE' }]}>
              <View style={styles.txLeft}>
                <View style={[styles.txIconBox, { backgroundColor: tx.amount >= 0 ? 'rgba(0, 212, 255, 0.15)' : 'rgba(255, 68, 68, 0.15)' }]}>
                  <Ionicons name={tx.amount >= 0 ? "diamond" : "arrow-up"} size={16} color={tx.amount >= 0 ? "#00D4FF" : "#ff4444"} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.txDescription, isLight && { color: '#000' }]} numberOfLines={1}>{tx.description || 'Diamond Event'}</Text>
                  <Text style={styles.txTime}>{new Date(tx.created_at).toLocaleString()}</Text>
                </View>
              </View>
              <Text style={[styles.txDelta, { color: tx.amount >= 0 ? '#00D4FF' : '#ff4444' }]}>
                {tx.amount >= 0 ? `+${tx.amount}` : tx.amount} 💎
              </Text>
            </View>
          ))
        )}
      </ScrollView>

      {/* CONFIRMATION MODAL */}
      <Modal visible={!!selectedPkg} transparent animationType="slide" onRequestClose={() => setSelectedPkg(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, isLight && { backgroundColor: '#FFF' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, isLight && { color: '#000' }]}>CONFIRM TOP-UP</Text>
              <TouchableOpacity onPress={() => setSelectedPkg(null)}>
                <Ionicons name="close" size={24} color={isLight ? '#000' : '#fff'} />
              </TouchableOpacity>
            </View>

            {selectedPkg && (
              <View style={styles.modalContent}>
                <Text style={styles.modalPackageName}>{selectedPkg.title}</Text>
                <View style={styles.modalGemsSummary}>
                  <Diamond3DIcon size={48} />
                  <Text style={styles.modalGemsTotal}>{selectedPkg.total_diamonds || selectedPkg.base_diamonds}</Text>
                </View>

                <View style={styles.modalDetailsRow}>
                  <Text style={styles.modalLabel}>Base Diamonds:</Text>
                  <Text style={styles.modalValue}>{selectedPkg.base_diamonds}</Text>
                </View>

                {selectedPkg.bonus_gems > 0 && (
                  <View style={styles.modalDetailsRow}>
                    <Text style={styles.modalLabel}>Bonus Gems:</Text>
                    <Text style={[styles.modalValue, { color: '#00ff88' }]}>+{selectedPkg.bonus_gems}</Text>
                  </View>
                )}

                <View style={styles.modalDetailsRow}>
                  <Text style={styles.modalLabel}>Price (INR):</Text>
                  <Text style={[styles.modalValue, { color: '#FFD700', fontSize: 18 }]}>₹{selectedPkg.price_inr}</Text>
                </View>

                <TouchableOpacity style={styles.confirmBuyBtn} onPress={handlePurchase} disabled={buying}>
                  <LinearGradient colors={['#A855F7', '#00D4FF']} style={styles.confirmGradient}>
                    {buying ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.confirmText}>CONFIRM & TOP-UP NOW</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15 },
  backBtn: { padding: 5 },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '900', letterSpacing: 2 },
  balanceBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0, 212, 255, 0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(0, 212, 255, 0.3)' },
  balanceText: { color: '#00D4FF', fontSize: 13, fontWeight: '900' },
  scrollContent: { padding: 20, paddingBottom: 50 },

  // FLASH DROP HERO CARD
  flashDropCard: { borderRadius: 24, padding: 20, marginBottom: 25, borderWidth: 1, borderColor: '#3b1d60' },
  flashHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  flashBadge: { backgroundColor: '#ff0055', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  flashBadgeText: { color: '#fff', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  timerPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,215,0,0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,215,0,0.3)' },
  timerText: { color: '#FFD700', fontSize: 11, fontWeight: 'bold' },

  flashBodyRow: { marginBottom: 20 },
  flashTitle: { color: '#fff', fontSize: 20, fontWeight: '900', marginBottom: 10 },
  gemsDisplayRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  baseGemBox: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  baseGemValue: { color: '#fff', fontSize: 28, fontWeight: '900' },
  bonusPillBadge: { backgroundColor: 'rgba(0,255,136,0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: '#00ff88' },
  bonusPillText: { color: '#00ff88', fontSize: 12, fontWeight: '900' },

  buyFlashBtn: { borderRadius: 16, overflow: 'hidden' },
  buyGradient: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, paddingVertical: 14 },
  buyBtnText: { color: '#fff', fontSize: 15, fontWeight: '900', letterSpacing: 1 },

  // PERMANENT PACKAGES SECTION
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 15, marginTop: 10 },
  sectionTitle: { color: '#888', fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
  packagesGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 25 },
  gridCard: { width: '48%', backgroundColor: '#09090e', borderRadius: 18, padding: 15, marginBottom: 15, borderWidth: 1, borderColor: '#1a1a26', alignItems: 'center' },
  yantraCard: { borderColor: '#A855F7', backgroundColor: '#100b20' },
  miniBadge: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(168, 85, 247, 0.2)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  miniBadgeText: { color: '#A855F7', fontSize: 7, fontWeight: '900' },
  gridIconCircle: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.03)', justifyContent: 'center', alignItems: 'center', marginVertical: 10 },
  gridTitle: { color: '#eee', fontSize: 13, fontWeight: 'bold', marginBottom: 5 },
  gridGemsRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 12 },
  gridBaseGems: { color: '#00D4FF', fontSize: 15, fontWeight: '900' },
  gridBonusGems: { color: '#00ff88', fontSize: 11, fontWeight: 'bold' },
  pricePill: { backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 12, width: '100%', alignItems: 'center' },
  pricePillText: { color: '#FFD700', fontSize: 13, fontWeight: '900' },

  // TRANSACTIONS LEDGER
  emptyLedger: { padding: 20, alignItems: 'center' },
  emptyText: { color: '#444', fontSize: 12 },
  txCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#08080c', padding: 12, borderRadius: 14, marginBottom: 10, borderWidth: 1, borderColor: '#12121c' },
  txLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, marginRight: 10 },
  txIconBox: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  txDescription: { color: '#ccc', fontSize: 12, fontWeight: 'bold' },
  txTime: { color: '#555', fontSize: 9, marginTop: 2 },
  txDelta: { fontSize: 13, fontWeight: '900' },

  // MODAL STYLES
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#0a0a10', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 25, borderTopWidth: 1, borderColor: '#1f1f30' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { color: '#fff', fontSize: 14, fontWeight: '900', letterSpacing: 2 },
  modalContent: { alignItems: 'center' },
  modalPackageName: { color: '#fff', fontSize: 20, fontWeight: '900', marginBottom: 15 },
  modalGemsSummary: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  modalGemsTotal: { color: '#00D4FF', fontSize: 32, fontWeight: '900' },
  modalDetailsRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  modalLabel: { color: '#888', fontSize: 13, fontWeight: 'bold' },
  modalValue: { color: '#fff', fontSize: 14, fontWeight: '900' },
  confirmBuyBtn: { width: '100%', borderRadius: 16, overflow: 'hidden', marginTop: 25 },
  confirmGradient: { paddingVertical: 16, alignItems: 'center' },
  confirmText: { color: '#fff', fontSize: 14, fontWeight: '900', letterSpacing: 1 }
});
