import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  Dimensions,
  ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { VOEXITheme } from '../../constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { WalletService, WalletData } from '../../lib/walletService';
import { LinearGradient } from 'expo-linear-gradient';
import { rewardCoins } from '../../lib/earnings';
import { useTheme } from '../../hooks/useTheme';
import { TopHeaderDiamondBadge } from '../../components/TopHeaderDiamondBadge';
import { useDiamondTheme } from '../../hooks/useDiamondTheme';
import { GlowingDiamond } from '../../components/ui/GlowingDiamond';
import { DiamondColorPickerModal } from '../../components/DiamondColorPickerModal';

const { width } = Dimensions.get('window');

export default function WalletScreen() {
  const router = useRouter();
  const { isLight } = useTheme();
  const { activeColor, glowEnabled } = useDiamondTheme();

  const [activeTab, setActiveTab] = useState<'diamonds' | 'cash'>('diamonds');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Cash State
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [cashTransactions, setCashTransactions] = useState<any[]>([]);

  // Diamond State
  const [diamondBalance, setDiamondBalance] = useState<number>(0);
  const [diamondPackages, setDiamondPackages] = useState<any[]>([]);
  const [diamondTransactions, setDiamondTransactions] = useState<any[]>([]);

  // Spend Modal State
  const [showSpendModal, setShowSpendModal] = useState(false);
  const [spendAmount, setSpendAmount] = useState('50');
  const [spendPurpose, setSpendPurpose] = useState('Creator Gift 🎁');
  const [spendingLoading, setSpendingLoading] = useState(false);

  // Diamond Color Picker Modal
  const [showColorPicker, setShowColorPicker] = useState(false);

  useEffect(() => {
    fetchData();

    let channel: any = null;
    let isMounted = true;

    const setupRealtime = async () => {
      try {
        const channelName = `realtime_diamond_packages_${Date.now()}`;
        channel = supabase.channel(channelName);
        channel
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'diamond_packages' },
            () => {
              if (isMounted) {
                WalletService.getDiamondPackages().then((data) => {
                  if (data && isMounted) setDiamondPackages(data);
                });
              }
            }
          )
          .subscribe();
      } catch (err) {
        console.error('Packages realtime setup error:', err);
      }
    };

    setupRealtime();

    return () => {
      isMounted = false;
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  const formatTimeRemaining = (expiresAt?: string) => {
    if (!expiresAt) return 'ENDS IN 23:59:59 ⏳';
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return 'LIMITED TIME EVENT ⏳';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `ENDS IN ${hours}h ${mins}m ⏳`;
  };

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      // Parallel fetch for Cash, Diamonds, Packages & Transactions
      const [
        walletData,
        cTxData,
        profileRes,
        packagesData,
        dTxData
      ] = await Promise.all([
        WalletService.getWalletData(user.id).catch(() => null),
        WalletService.getTransactions(user.id).catch(() => []),
        supabase.from('profiles').select('diamond_balance').eq('id', user.id).maybeSingle(),
        WalletService.getDiamondPackages(),
        WalletService.getDiamondTransactions(user.id)
      ]);

      if (walletData) setWallet(walletData);
      setCashTransactions(cTxData || []);

      if (profileRes?.data && profileRes.data.diamond_balance !== undefined) {
        setDiamondBalance(profileRes.data.diamond_balance || 0);
      }

      setDiamondPackages(packagesData || []);
      setDiamondTransactions(dTxData || []);
    } catch (e) {
      console.error('Wallet Screen Error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // --- PURCHASE DIAMOND PACKAGE ---
  const handleBuyPackage = (pkg: any) => {
    Alert.alert(
      'Diamond Store Top-Up',
      `Buy "${pkg.title}" for ₹${pkg.price_inr} and receive ${pkg.diamond_amount + (pkg.bonus_diamonds || 0)} ${activeColor.emoji}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Top-Up',
          onPress: async () => {
            if (!userId) return;
            try {
              const bonus = pkg.bonus_diamonds || 0;
              const totalGems = pkg.diamond_amount + bonus;

              const { data: profile } = await supabase
                .from('profiles')
                .select('diamond_balance')
                .eq('id', userId)
                .single();

              const newBal = (profile?.diamond_balance || 0) + totalGems;

              await supabase
                .from('profiles')
                .update({ diamond_balance: newBal })
                .eq('id', userId);

              await supabase.from('diamond_transactions').insert({
                user_id: userId,
                amount: totalGems,
                transaction_type: 'PURCHASE',
                reference_id: pkg.id,
                description: `Purchased package: ${pkg.title} (₹${pkg.price_inr})`
              });

              Alert.alert('Success!', `Added ${totalGems} ${activeColor.emoji} to your Diamond Vault!`);
              fetchData();
            } catch (e: any) {
              Alert.alert('Top-Up Error', e.message || 'Transaction failed');
            }
          }
        }
      ]
    );
  };

  // --- SPEND DIAMONDS ---
  const handleConfirmSpend = async () => {
    if (!userId) return;
    const numAmount = parseInt(spendAmount, 10);
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid diamond amount.');
      return;
    }

    if (numAmount > diamondBalance) {
      Alert.alert('Insufficient Balance', 'You do not have enough diamonds in your vault.');
      return;
    }

    setSpendingLoading(true);
    try {
      const res = await WalletService.spendDiamonds(userId, numAmount, spendPurpose);
      if (res && res.success) {
        Alert.alert('🎉 Transaction Complete', `Successfully spent ${numAmount} ${activeColor.emoji} on ${spendPurpose}!`);
        setShowSpendModal(false);
        fetchData();
      } else {
        Alert.alert('Spend Failed', res?.message || 'Could not complete diamond transaction.');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Transaction error.');
    } finally {
      setSpendingLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.loader, isLight && { backgroundColor: '#fff' }]}>
        <ActivityIndicator color={VOEXITheme.colors.primary} size="large" />
      </View>
    );
  }

  // Filter Special Reward Event Drops vs Standard Packages
  const specialDrops = diamondPackages.filter((p) => {
    const tag = (p.badge_tag || '').toUpperCase();
    return (
      tag.includes('OFF') ||
      tag.includes('DROP') ||
      tag.includes('SPECIAL') ||
      tag.includes('LIMITED') ||
      tag.includes('FLASH') ||
      tag.includes('UNMISSABLE') ||
      p.display_order === 1
    );
  });

  const standardPackages = diamondPackages.filter((p) => !specialDrops.includes(p));

  return (
    <SafeAreaView style={[styles.container, isLight && { backgroundColor: '#fff' }]}>
      <StatusBar style={isLight ? 'dark' : 'light'} />

      {/* HEADER */}
      <View style={[styles.header, isLight && { borderBottomColor: '#EEE', borderBottomWidth: 1 }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color={isLight ? '#000' : '#fff'} />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, isLight && { color: '#000' }]}>DIAMOND VAULT & STORE</Text>

        <TopHeaderDiamondBadge isLight={isLight} />
      </View>

      {/* TAB SWITCHER */}
      <View style={[styles.tabBar, isLight && { backgroundColor: '#F3F4F6' }]}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'diamonds' && { backgroundColor: activeColor.secondaryColor }]}
          onPress={() => setActiveTab('diamonds')}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <GlowingDiamond size={16} glow={false} animated={false} />
            <Text style={[styles.tabText, activeTab === 'diamonds' && styles.tabTextActive]}>
              DIAMOND VAULT
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'cash' && styles.tabBtnActive]}
          onPress={() => setActiveTab('cash')}
        >
          <Text style={[styles.tabText, activeTab === 'cash' && styles.tabTextActive]}>
            💵 CASH VAULT
          </Text>
        </TouchableOpacity>
      </View>

      {/* MAIN CONTENT AREA */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={isLight ? '#000' : '#fff'} />
        }
      >
        {activeTab === 'diamonds' ? (
          <View>
            {/* DIAMOND BALANCE BANNER */}
            <LinearGradient
              colors={isLight ? ['#0F172A', '#1E293B', '#0F172A'] : ['#0B132B', '#1C2541', '#0B132B']}
              style={[
                styles.diamondCard,
                {
                  borderColor: activeColor.mainColor,
                  borderWidth: 1.5,
                  shadowColor: activeColor.mainColor,
                },
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.diamondCardHeader}>
                <Text style={styles.diamondCardLabel}>LIVE DIAMOND BALANCE</Text>
                <TouchableOpacity
                  style={[styles.glowingTag, { borderColor: activeColor.mainColor, backgroundColor: activeColor.glowColor }]}
                  onPress={() => setShowColorPicker(true)}
                >
                  <Text style={[styles.glowingTagText, { color: '#FFF' }]}>{activeColor.tag} ATOMIC LEDGER</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.diamondRow}>
                <GlowingDiamond size="xlarge" glow={glowEnabled} animated />
                <Text style={[styles.diamondBalanceVal, { color: activeColor.mainColor }]}>
                  {diamondBalance.toLocaleString()}
                </Text>
              </View>

              <Text style={styles.diamondSubtext}>Use diamonds to send gifts & unlock VIP perks</Text>

              <TouchableOpacity
                style={styles.spendActionBtn}
                onPress={() => setShowSpendModal(true)}
              >
                <LinearGradient
                  colors={[activeColor.mainColor, activeColor.secondaryColor]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.spendActionGradient}
                >
                  <Ionicons name="gift-outline" size={18} color="#fff" />
                  <Text style={styles.spendActionText}>SPEND & GIFT DIAMONDS 🎁</Text>
                </LinearGradient>
              </TouchableOpacity>
            </LinearGradient>

            {/* DIAMOND COLOR & LIGHT GLOW CUSTOMIZER CARD */}
            <TouchableOpacity
              activeOpacity={0.85}
              style={[
                styles.customizerCard,
                { borderColor: activeColor.mainColor },
                isLight && styles.customizerCardLight,
              ]}
              onPress={() => setShowColorPicker(true)}
            >
              <LinearGradient
                colors={isLight ? ['#F8FAFC', '#EFF6FF'] : ['#0F172A', '#1E1B4B']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.customizerGradient}
              >
                <View style={styles.customizerLeft}>
                  <GlowingDiamond size="medium" glow={glowEnabled} animated />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.customizerTitle, isLight && { color: '#000' }]}>
                      DIAMOND COLOR & LIGHT GLOW
                    </Text>
                    <Text style={styles.customizerSub}>
                      Active Theme: <Text style={{ color: activeColor.mainColor, fontWeight: '800' }}>{activeColor.name}</Text>
                    </Text>
                  </View>
                </View>

                <View style={[styles.customizeBadge, { backgroundColor: activeColor.mainColor }]}>
                  <Text style={styles.customizeBadgeText}>CHANGE 🎨</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>

            {/* ⚡ SPECIAL REWARD DROPS & FLASH EVENTS (FREE FIRE STYLE EVENTS) */}
            {specialDrops.length > 0 && (
              <View style={{ marginBottom: 20 }}>
                <View style={styles.sectionHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="flash" size={20} color="#F59E0B" />
                    <Text style={[styles.sectionTitleText, isLight && { color: '#000' }]}>
                      ⚡ SPECIAL REWARD DROPS & EVENTS
                    </Text>
                  </View>
                  <Text style={styles.sectionSubText}>Free Fire style high-value reward drops - Limited Time!</Text>
                </View>

                {specialDrops.map((drop) => (
                  <View key={drop.id} style={styles.specialDropCard}>
                    <LinearGradient
                      colors={['#1E1B4B', '#311042', '#0F172A']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.specialDropGradient}
                    >
                      <View style={styles.specialDropHeader}>
                        <View style={styles.specialDropTagBox}>
                          <Text style={styles.specialDropTagText}>{drop.badge_tag || '🔥 FLASH DROP'}</Text>
                        </View>
                        <Text style={styles.specialDropTimer}>{formatTimeRemaining(drop.expires_at)}</Text>
                      </View>

                      <View style={styles.specialDropBody}>
                        <GlowingDiamond size="xlarge" glow={glowEnabled} animated />

                        <View style={{ flex: 1, marginLeft: 14 }}>
                          <Text style={styles.specialDropTitle}>{drop.title}</Text>
                          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
                            <Text style={[styles.specialDropGems, { color: activeColor.mainColor }]}>
                              {drop.diamond_amount}
                            </Text>
                            {drop.bonus_diamonds > 0 && (
                              <Text style={styles.specialDropBonus}>
                                +{drop.bonus_diamonds} EXTRA GEMS
                              </Text>
                            )}
                          </View>
                          <Text style={styles.specialDropTotal}>
                            Total: {drop.diamond_amount + (drop.bonus_diamonds || 0)} {activeColor.emoji}
                          </Text>
                        </View>

                        <TouchableOpacity
                          style={styles.specialBuyBtn}
                          onPress={() => handleBuyPackage(drop)}
                        >
                          <LinearGradient
                            colors={['#EC4899', '#A855F7']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.specialBuyGradient}
                          >
                            <Text style={styles.specialBuyPrice}>₹{drop.price_inr}</Text>
                            <Text style={styles.specialBuyText}>CLAIM DROP 🎯</Text>
                          </LinearGradient>
                        </TouchableOpacity>
                      </View>
                    </LinearGradient>
                  </View>
                ))}
              </View>
            )}

            {/* DIAMOND STORE STANDARD PACKAGES */}
            <View style={styles.sectionHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <GlowingDiamond size={20} animated glow={false} />
                <Text style={[styles.sectionTitleText, isLight && { color: '#000' }]}>DIAMOND STORE</Text>
              </View>
              <Text style={styles.sectionSubText}>Select a package to top-up instantly</Text>
            </View>

            <View style={styles.packagesGrid}>
              {(standardPackages.length > 0 ? standardPackages : diamondPackages).map((pkg) => (
                <View
                  key={pkg.id}
                  style={[
                    styles.packageCard,
                    { borderColor: activeColor.mainColor + '44' },
                    isLight && styles.packageCardLight,
                  ]}
                >
                  {pkg.badge_tag && (
                    <View style={[styles.badgeTagBox, { backgroundColor: activeColor.secondaryColor }]}>
                      <Text style={styles.badgeTagText}>{pkg.badge_tag}</Text>
                    </View>
                  )}

                  <View style={{ marginTop: 12, marginBottom: 6 }}>
                    <GlowingDiamond size="large" glow={glowEnabled} animated />
                  </View>

                  <Text style={[styles.packageTitle, isLight && { color: '#000' }]}>{pkg.title}</Text>

                  <View style={styles.gemAmountRow}>
                    <Text style={[styles.gemAmountMain, { color: activeColor.mainColor }]}>{pkg.diamond_amount}</Text>
                    {pkg.bonus_diamonds > 0 && (
                      <Text style={styles.gemAmountBonus}>+{pkg.bonus_diamonds} Bonus</Text>
                    )}
                  </View>

                  <Text style={[styles.packagePrice, isLight && { color: '#059669' }]}>₹{pkg.price_inr}</Text>

                  <TouchableOpacity
                    style={styles.buyBtn}
                    onPress={() => handleBuyPackage(pkg)}
                  >
                    <LinearGradient
                      colors={[activeColor.mainColor, activeColor.secondaryColor]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.buyBtnGradient}
                    >
                      <Text style={styles.buyBtnText}>BUY NOW</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            {/* DIAMOND TRANSACTION HISTORY */}
            <Text style={[styles.sectionTitleText, isLight && { color: '#000' }, { marginTop: 25, marginBottom: 10 }]}>
              📜 DIAMOND TRANSACTIONS
            </Text>

            {diamondTransactions.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="receipt-outline" size={40} color={isLight ? '#CCC' : '#333'} />
                <Text style={[styles.emptyText, isLight && { color: '#888' }]}>No diamond transactions yet.</Text>
              </View>
            ) : (
              diamondTransactions.map((tx) => (
                <View key={tx.id} style={[styles.txItem, isLight && styles.txItemLight]}>
                  <View style={styles.txLeft}>
                    <View style={[styles.txIcon, { backgroundColor: tx.amount > 0 ? '#00C85122' : '#ff444422' }]}>
                      <Ionicons
                        name={tx.amount > 0 ? 'arrow-down' : 'arrow-up'}
                        size={16}
                        color={tx.amount > 0 ? '#00C851' : '#ff4444'}
                      />
                    </View>
                    <View>
                      <Text style={[styles.txTitle, isLight && { color: '#000' }]}>{tx.description || tx.transaction_type}</Text>
                      <Text style={styles.txDate}>{new Date(tx.created_at).toLocaleDateString()}</Text>
                    </View>
                  </View>
                  <Text style={[styles.txAmount, { color: tx.amount > 0 ? '#00C851' : '#ff4444' }]}>
                    {tx.amount > 0 ? '+' : ''}{tx.amount} {activeColor.emoji}
                  </Text>
                </View>
              ))
            )}
          </View>
        ) : (
          /* CASH VAULT TAB */
          <View>
            <LinearGradient colors={[VOEXITheme.colors.primary, '#300']} style={styles.balanceCard}>
              <Text style={styles.balanceLabel}>AVAILABLE CASH BALANCE</Text>
              <View style={styles.coinRow}>
                <Text style={[styles.balanceVal, { color: '#00C851' }]}>₹{wallet?.balance.toFixed(2)}</Text>
              </View>
              <Text style={styles.estimatedText}>Direct Bank / UPI Redeemable</Text>
            </LinearGradient>

            <View style={styles.statsGrid}>
              <View style={[styles.statBox, isLight && { backgroundColor: '#F9F9F9', borderColor: '#EEE' }]}>
                <Text style={styles.statLab}>EARNINGS TODAY</Text>
                <Text style={[styles.statVal, { color: '#00C851' }]}>+₹{wallet?.today_earnings || '0.00'}</Text>
              </View>
              <View style={[styles.statBox, isLight && { backgroundColor: '#F9F9F9', borderColor: '#EEE' }]}>
                <Text style={styles.statLab}>TOTAL EARNED</Text>
                <Text style={[styles.statVal, isLight && { color: '#000' }]}>₹{wallet?.total_earned || '0.00'}</Text>
              </View>
            </View>

            <Text style={[styles.sectionTitleText, isLight && { color: '#000' }, { marginTop: 25, marginBottom: 10 }]}>
              TRANSACTION LEDGER
            </Text>

            {cashTransactions.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="receipt-outline" size={40} color={isLight ? '#CCC' : '#333'} />
                <Text style={[styles.emptyText, isLight && { color: '#888' }]}>No cash transactions yet.</Text>
              </View>
            ) : (
              cashTransactions.map((item) => (
                <View key={item.id} style={[styles.txItem, isLight && styles.txItemLight]}>
                  <View style={styles.txLeft}>
                    <View style={[styles.txIcon, { backgroundColor: item.coins > 0 ? '#00C85122' : '#ff444422' }]}>
                      <Ionicons
                        name={item.coins > 0 ? 'arrow-down' : 'arrow-up'}
                        size={16}
                        color={item.coins > 0 ? '#00C851' : '#ff4444'}
                      />
                    </View>
                    <View>
                      <Text style={[styles.txTitle, isLight && { color: '#000' }]}>{item.description || 'Transaction'}</Text>
                      <Text style={styles.txDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
                    </View>
                  </View>
                  <Text style={[styles.txAmount, { color: item.coins > 0 ? '#00C851' : '#ff4444' }]}>
                    {item.coins > 0 ? '+' : ''}{item.coins}
                  </Text>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* SPEND DIAMONDS MODAL */}
      <Modal
        visible={showSpendModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSpendModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, isLight && styles.modalBoxLight]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, isLight && { color: '#000' }]}>SPEND / GIFT DIAMONDS {activeColor.emoji}</Text>
              <TouchableOpacity onPress={() => setShowSpendModal(false)}>
                <Ionicons name="close" size={24} color={isLight ? '#000' : '#fff'} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalLabel, isLight && { color: '#555' }]}>Select Purpose / Target:</Text>
            <View style={styles.purposeRow}>
              {['Creator Gift 🎁', 'Boost Reel 🚀', 'VIP Badge 👑', 'Custom Emoji 🎨'].map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[styles.purposeChip, spendPurpose === p && { backgroundColor: activeColor.mainColor }]}
                  onPress={() => setSpendPurpose(p)}
                >
                  <Text style={[styles.purposeText, spendPurpose === p && { color: '#FFF', fontWeight: '900' }]}>{p}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.modalLabel, isLight && { color: '#555' }, { marginTop: 15 }]}>Diamond Amount:</Text>
            <TextInput
              style={[styles.input, isLight && styles.inputLight]}
              keyboardType="number-pad"
              value={spendAmount}
              onChangeText={setSpendAmount}
              placeholder="e.g. 50"
              placeholderTextColor="#888"
            />

            <View style={styles.quickAmounts}>
              {['10', '50', '100', '500'].map((amt) => (
                <TouchableOpacity
                  key={amt}
                  style={styles.quickAmtBtn}
                  onPress={() => setSpendAmount(amt)}
                >
                  <Text style={styles.quickAmtText}>{amt} {activeColor.emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.confirmSpendBtn}
              disabled={spendingLoading}
              onPress={handleConfirmSpend}
            >
              <LinearGradient
                colors={[activeColor.mainColor, activeColor.secondaryColor]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.confirmSpendGradient}
              >
                {spendingLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.confirmSpendText}>CONFIRM SPEND</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* DIAMOND COLOR PICKER MODAL */}
      <DiamondColorPickerModal
        visible={showColorPicker}
        onClose={() => setShowColorPicker(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold', letterSpacing: 1 },

  // TAB SWITCHER
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#111',
    marginHorizontal: 15,
    borderRadius: 12,
    padding: 4,
    marginBottom: 10,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabBtnActive: {
    backgroundColor: VOEXITheme.colors.primary,
  },
  tabText: {
    color: '#888',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  tabTextActive: {
    color: '#FFF',
  },

  scrollContent: {
    paddingHorizontal: 15,
    paddingBottom: 40,
  },

  // DIAMOND CARD
  diamondCard: {
    borderRadius: 20,
    padding: 20,
    marginTop: 5,
    marginBottom: 14,
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  diamondCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  diamondCardLabel: { color: '#9CA3AF', fontSize: 11, fontWeight: 'bold', letterSpacing: 1 },
  glowingTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  glowingTagText: { fontSize: 9, fontWeight: '900' },
  diamondRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 },
  diamondBalanceVal: { fontSize: 38, fontWeight: '900' },
  diamondSubtext: { color: '#D1D5DB', fontSize: 12, marginTop: 6 },
  spendActionBtn: { marginTop: 15, borderRadius: 12, overflow: 'hidden' },
  spendActionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  spendActionText: { color: '#FFF', fontSize: 13, fontWeight: '800' },

  // CUSTOMIZER CARD
  customizerCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    overflow: 'hidden',
    marginBottom: 16,
  },
  customizerCardLight: {
    borderColor: '#E2E8F0',
  },
  customizerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  customizerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  customizerTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  customizerSub: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  customizeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  customizeBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },

  // SPECIAL REWARD DROP CARD
  specialDropCard: {
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#A855F7',
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#EC4899',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    marginBottom: 12,
  },
  specialDropGradient: {
    padding: 16,
  },
  specialDropHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  specialDropTagBox: {
    backgroundColor: '#EC4899',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  specialDropTagText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  specialDropTimer: {
    color: '#F59E0B',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  specialDropBody: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  specialDropTitle: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '900',
  },
  specialDropGems: {
    fontSize: 26,
    fontWeight: '900',
  },
  specialDropBonus: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '800',
  },
  specialDropTotal: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  specialBuyBtn: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  specialBuyGradient: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
  },
  specialBuyPrice: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '900',
  },
  specialBuyText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginTop: 2,
  },

  // SECTION HEADERS
  sectionHeader: { marginTop: 10, marginBottom: 12 },
  sectionTitleText: { color: '#FFF', fontSize: 15, fontWeight: '900', letterSpacing: 0.8 },
  sectionSubText: { color: '#888', fontSize: 11, marginTop: 2 },

  // PACKAGES GRID
  packagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 15,
  },
  packageCard: {
    width: (width - 42) / 2,
    backgroundColor: '#0D1117',
    borderWidth: 1,
    borderRadius: 16,
    padding: 15,
    alignItems: 'center',
    position: 'relative',
  },
  packageCardLight: {
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
  },
  badgeTagBox: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeTagText: { color: '#FFF', fontSize: 8, fontWeight: '900' },
  packageTitle: { color: '#FFF', fontSize: 14, fontWeight: 'bold', marginTop: 5 },
  gemAmountRow: { alignItems: 'center', marginVertical: 6 },
  gemAmountMain: { fontSize: 22, fontWeight: '900' },
  gemAmountBonus: { color: '#10B981', fontSize: 10, fontWeight: 'bold' },
  packagePrice: { color: '#10B981', fontSize: 16, fontWeight: '800', marginBottom: 10 },
  buyBtn: { width: '100%', borderRadius: 10, overflow: 'hidden' },
  buyBtnGradient: { paddingVertical: 8, alignItems: 'center' },
  buyBtnText: { color: '#FFF', fontSize: 12, fontWeight: '900' },

  // TRANSACTIONS LIST
  txItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0D1117',
    borderColor: '#21262D',
    borderWidth: 1,
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  txItemLight: { backgroundColor: '#F9FAFB', borderColor: '#E5E7EB' },
  txLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  txIcon: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  txTitle: { color: '#fff', fontSize: 13, fontWeight: '600' },
  txDate: { color: '#666', fontSize: 10, marginTop: 2 },
  txAmount: { fontSize: 14, fontWeight: 'bold' },

  // CASH CARD
  balanceCard: { borderRadius: 20, padding: 20, marginTop: 5, marginBottom: 15 },
  balanceLabel: { color: '#A0A0A0', fontSize: 12, fontWeight: 'bold', letterSpacing: 1 },
  coinRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 8 },
  balanceVal: { fontSize: 36, fontWeight: 'bold' },
  estimatedText: { color: '#888', fontSize: 12 },

  statsGrid: { flexDirection: 'row', gap: 10, marginBottom: 15 },
  statBox: {
    flex: 1,
    backgroundColor: '#111',
    borderColor: '#222',
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
  },
  statLab: { color: '#666', fontSize: 10, fontWeight: 'bold' },
  statVal: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginTop: 4 },

  emptyBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 30 },
  emptyText: { color: '#666', fontSize: 13, marginTop: 10 },

  // MODAL
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    backgroundColor: '#111',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  modalBoxLight: { backgroundColor: '#fff', borderColor: '#EEE' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  modalLabel: { color: '#aaa', fontSize: 12, fontWeight: 'bold', marginBottom: 8 },
  purposeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 15 },
  purposeChip: {
    backgroundColor: '#222',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  purposeChipActive: { backgroundColor: VOEXITheme.colors.primary },
  purposeText: { color: '#888', fontSize: 12, fontWeight: 'bold' },
  purposeTextActive: { color: '#fff' },
  input: {
    backgroundColor: '#222',
    color: '#fff',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: 'bold',
  },
  inputLight: { backgroundColor: '#F3F4F6', color: '#000' },
  quickAmounts: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 15 },
  quickAmtBtn: {
    backgroundColor: '#222',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
  },
  quickAmtText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  confirmSpendBtn: { borderRadius: 14, overflow: 'hidden', marginTop: 10 },
  confirmSpendGradient: { paddingVertical: 14, alignItems: 'center' },
  confirmSpendText: { color: '#fff', fontSize: 14, fontWeight: 'bold', letterSpacing: 1 },
});
