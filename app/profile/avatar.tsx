import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Alert, TextInput, Modal, Dimensions, Image } from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';

import { Avatar3DEngine, Avatar3DEngineRef } from '../../components/avatar/Avatar3DEngine';
import { SERVER_IP, AVATAR_SERVER_PORT } from '../../constants/config';
import {
  AvatarAssetRegistry,
  EquippedState,
  DEFAULT_EQUIPPED_STATE,
  DEFAULT_BUNDLES,
  VOEXI_SKELETON_CONTRACT,
  AvatarAsset
} from '../../avatar/lib/AvatarAssetRegistry';
import { AvatarCacheManager } from '../../avatar/lib/AvatarCacheManager';

const { width } = Dimensions.get('window');

const FALLBACK_FEMALE_GLB = `http://${SERVER_IP}:${AVATAR_SERVER_PORT}/avatar/models/male%20human%203d%20model.glb`;
const FALLBACK_MALE_GLB = `http://${SERVER_IP}:${AVATAR_SERVER_PORT}/avatar/models/male%20human%203d%20model.glb`;

const INITIAL_SERVER_VAULT_SEED = [
  { id: 'vx_01', name: 'Male 3D Avatar', filename: 'male human 3d model.glb', uri: `http://${SERVER_IP}:${AVATAR_SERVER_PORT}/avatar/models/male%20human%203d%20model.glb`, type: 'Avatar', category: 'AVATAR', diamond_price: 590, original_price: 1180, gender_target: 'MALE', image: '' },
  { id: 'vx_02', name: 'Capoeira Dance', filename: 'Capoeira.fbx', uri: `http://${SERVER_IP}:${AVATAR_SERVER_PORT}/avatar/models/Capoeira.fbx`, type: 'Emote', category: 'EMOTE', diamond_price: 590, original_price: 1180, gender_target: 'UNISEX', image: '' },
  { id: 'vx_03', name: 'Talking Motion', filename: 'Talking.fbx', uri: `http://${SERVER_IP}:${AVATAR_SERVER_PORT}/avatar/models/Talking.fbx`, type: 'Emote', category: 'EMOTE', diamond_price: 590, original_price: 1180, gender_target: 'UNISEX', image: '' },
  { id: 'vx_04', name: 'Cyber Shirt', filename: 'shirt.glb', uri: `http://${SERVER_IP}:${AVATAR_SERVER_PORT}/avatar/models/shirt.glb`, type: 'Shirt', category: 'SHIRT', diamond_price: 590, original_price: 1180, gender_target: 'UNISEX', image: '' },
  { id: 'vx_05', name: 'Tripo Demo Pants', filename: 'Tripo_Demo_Model.glb', uri: `http://${SERVER_IP}:${AVATAR_SERVER_PORT}/avatar/models/Tripo_Demo_Model.glb`, type: 'Pant', category: 'PANT', diamond_price: 590, original_price: 1180, gender_target: 'UNISEX', image: '' }
];

type TabType = 'Avatar' | 'Bundles' | 'Hair' | 'Shirt' | 'Pant' | 'Gear' | 'Shoes' | 'Socks' | 'Emotes' | 'Vault';

export default function VOEXIAvatarStudioScreen() {
  const router = useRouter();
  const engineRef = useRef<Avatar3DEngineRef>(null);

  const [profile, setProfile] = useState<any>(null);
  const [gender, setGender] = useState<'Male' | 'Female'>('Male');
  const [selectedAvatarId, setSelectedAvatarId] = useState<string>('Male');
  const [selectedVaultItemId, setSelectedVaultItemId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<TabType>('Avatar');

  // Currently Selected Asset Object for Bottom Right HUD
  const [activeSelectedItem, setActiveSelectedItem] = useState<any>(null);

  // Primary Outfit Colors
  const [topColor, setTopColor] = useState<string>('#A855F7');
  const [bottomColor, setBottomColor] = useState<string>('#00F2FE');
  const [selectedBundle, setSelectedBundle] = useState<string>('Cyberpunk Legend');
  const [selectedEmote, setSelectedEmote] = useState<string>('Idle');

  // Categorized Wardrobe Selection & Color States
  const [selectedHair, setSelectedHair] = useState<string>('Cyber Spikes');
  const [hairColor, setHairColor] = useState<string>('#A855F7');

  const [selectedShirt, setSelectedShirt] = useState<string>('Cyber Jacket');
  const [shirtColor, setShirtColor] = useState<string>('#A855F7');

  const [selectedPant, setSelectedPant] = useState<string>('Cyber Joggers');
  const [pantColor, setPantColor] = useState<string>('#00F2FE');

  const [selectedGear, setSelectedGear] = useState<string>('Cyber Visor');
  const [gearColor, setGearColor] = useState<string>('#00F2FE');

  const [selectedShoe, setSelectedShoe] = useState<string>('Cyber Kicks');
  const [shoeColor, setShoeColor] = useState<string>('#FFFFFF');

  const [selectedSock, setSelectedSock] = useState<string>('High Neon Socks');
  const [sockColor, setSockColor] = useState<string>('#00F2FE');

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadPercent, setLoadPercent] = useState<number>(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isTalking, setIsTalking] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Custom Model, Item Type & Diamond Price States
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [customModelName, setCustomModelName] = useState<string>('');
  const [customModelUrl, setCustomModelUrl] = useState<string>('');
  const [itemType, setItemType] = useState<'Avatar' | 'Bundle' | 'Hair' | 'Shirt' | 'Pant' | 'Gear' | 'Shoes' | 'Socks' | 'Emote'>('Hair');
  const [privacy, setPrivacy] = useState<'PRIVATE' | 'FRIENDS' | 'PUBLIC'>('PRIVATE');
  const [userDiamonds, setUserDiamonds] = useState<number>(1000);
  const [diamondPriceInput, setDiamondPriceInput] = useState<string>('590');
  const [customVaultItems, setCustomVaultItems] = useState<any[]>(INITIAL_SERVER_VAULT_SEED);

  useEffect(() => {
    fetchProfileAndAvatar();
    syncServerVaultItems();
  }, []);

  const getGenderModelUri = (targetGender: 'Male' | 'Female') => {
    return targetGender === 'Female' ? FALLBACK_FEMALE_GLB : FALLBACK_MALE_GLB;
  };

  const syncServerVaultItems = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 800);

      const serverRes = await fetch(`http://${SERVER_IP}:${AVATAR_SERVER_PORT}/api/v1/assets`, {
        signal: controller.signal
      }).catch(() => null);

      clearTimeout(timeoutId);

      if (serverRes && serverRes.ok) {
        const serverData = await serverRes.json();
        const modelsList = serverData.assets || serverData.models;

        if (Array.isArray(modelsList) && modelsList.length > 0) {
          const normalizedList = modelsList.map((sModel: any) => {
            let normType = sModel.type || 'Avatar';
            const tUpper = String(normType).toUpperCase();
            if (tUpper === 'PANTS' || tUpper === 'PANT') normType = 'Pant';
            else if (tUpper === 'SHIRTS' || tUpper === 'SHIRT') normType = 'Shirt';
            else if (tUpper === 'EMOTES' || tUpper === 'EMOTE') normType = 'Emote';
            else if (tUpper === 'BUNDLES' || tUpper === 'BUNDLE') normType = 'Bundle';
            else if (tUpper === 'HAIR') normType = 'Hair';
            else if (tUpper === 'GEAR') normType = 'Gear';
            else if (tUpper === 'SHOES') normType = 'Shoes';
            else if (tUpper === 'SOCKS') normType = 'Socks';
            else if (tUpper === 'AVATAR') normType = 'Avatar';

            return { ...sModel, type: normType };
          });

          setCustomVaultItems((prevList) => {
            let merged = [...normalizedList];
            prevList.forEach((localItem) => {
              const exists = merged.some(
                (m) =>
                  m.id === localItem.id ||
                  (m.filename && localItem.filename && m.filename.toLowerCase() === localItem.filename.toLowerCase())
              );
              if (!exists) {
                merged.push(localItem);
              }
            });

            merged.forEach((item) => AvatarAssetRegistry.registerCustomVaultItem(item));
            return merged;
          });
        }
      }
    } catch (e) {
      console.warn('[AVATAR STUDIO] Sync server error:', e);
    }
  };

  const fetchProfileAndAvatar = async () => {
    try {
      setIsLoading(true);
      setLoadError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profData) {
          setProfile(profData);
          if (profData.gender === 'Female' || profData.gender === 'Male') {
            setGender(profData.gender);
            setSelectedAvatarId(profData.gender);
          }
          if (profData.diamond_balance !== undefined) {
            setUserDiamonds(Number(profData.diamond_balance || 1000));
          } else if (profData.diamonds !== undefined) {
            setUserDiamonds(Number(profData.diamonds || 1000));
          }
        }

        const { data: avatarData } = await supabase
          .from('avatars')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (avatarData) {
          if (avatarData.top_color) {
            setTopColor(avatarData.top_color);
            setShirtColor(avatarData.top_color);
          }
          if (avatarData.bottom_color) {
            setBottomColor(avatarData.bottom_color);
            setPantColor(avatarData.bottom_color);
          }
          if (avatarData.metadata) {
            if (avatarData.metadata.hair) setSelectedHair(avatarData.metadata.hair);
            if (avatarData.metadata.hair_color) setHairColor(avatarData.metadata.hair_color);
            if (avatarData.metadata.shirt) setSelectedShirt(avatarData.metadata.shirt);
            if (avatarData.metadata.pant) setSelectedPant(avatarData.metadata.pant);
            if (avatarData.metadata.gear) setSelectedGear(avatarData.metadata.gear);
            if (avatarData.metadata.gear_color) setGearColor(avatarData.metadata.gear_color);
            if (avatarData.metadata.shoe) setSelectedShoe(avatarData.metadata.shoe);
            if (avatarData.metadata.shoe_color) setShoeColor(avatarData.metadata.shoe_color);
            if (avatarData.metadata.sock) setSelectedSock(avatarData.metadata.sock);
            if (avatarData.metadata.sock_color) setSockColor(avatarData.metadata.sock_color);
          }
        }
      }

      await syncServerVaultItems();
    } catch (err: any) {
      console.error('[AVATAR STUDIO] Fetch Profile Error:', err);
    }
  };

  const handleGenderSwitch = (newGender: 'Male' | 'Female') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setGender(newGender);
    setSelectedAvatarId(newGender);

    const femMatch = customVaultItems.find(i => i.filename && i.filename.toLowerCase().includes('female'));
    const maleMatch = customVaultItems.find(i => i.filename && i.filename.toLowerCase().includes('male') && !i.filename.toLowerCase().includes('female'));

    setActiveSelectedItem(newGender === 'Female' ? (femMatch || { name: 'Female 3D Avatar', diamond_price: 590, original_price: 1180, gender_target: 'FEMALE' }) : (maleMatch || { name: 'Male 3D Avatar', diamond_price: 590, original_price: 1180, gender_target: 'MALE' }));

    const newUri = getGenderModelUri(newGender);
    engineRef.current?.setGender(newGender.toLowerCase() as 'male' | 'female', newUri);
  };

  const handlePrivacyChange = (newPrivacy: 'PRIVATE' | 'FRIENDS' | 'PUBLIC') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setPrivacy(newPrivacy);
    if (newPrivacy === 'FRIENDS') {
      setDiamondPriceInput('290');
    } else if (newPrivacy === 'PUBLIC') {
      setDiamondPriceInput('590');
    } else {
      setDiamondPriceInput('0');
    }
  };

  // Handlers for Hair
  const handleHairSelect = (itemOrName: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const name = typeof itemOrName === 'string' ? itemOrName : itemOrName.name;
    setSelectedHair(name);
    if (typeof itemOrName === 'object') setActiveSelectedItem(itemOrName);
    engineRef.current?.setHair(name, hairColor);
  };

  const handleHairColorChange = (color: string) => {
    Haptics.selectionAsync().catch(() => {});
    setHairColor(color);
    engineRef.current?.setHair(selectedHair, color);
  };

  // Handlers for Shirt / Top
  const handleShirtSelect = (itemOrName: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const name = typeof itemOrName === 'string' ? itemOrName : itemOrName.name;
    setSelectedShirt(name);
    if (typeof itemOrName === 'object') setActiveSelectedItem(itemOrName);
    engineRef.current?.setShirt(name, shirtColor);
  };

  const handleShirtColorChange = (color: string) => {
    Haptics.selectionAsync().catch(() => {});
    setShirtColor(color);
    setTopColor(color);
    engineRef.current?.setShirt(selectedShirt, color);
    engineRef.current?.setOutfitColor(color, bottomColor);
  };

  // Handlers for Pants / Bottom
  const handlePantSelect = (itemOrName: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const name = typeof itemOrName === 'string' ? itemOrName : itemOrName.name;
    setSelectedPant(name);
    if (typeof itemOrName === 'object') setActiveSelectedItem(itemOrName);
    engineRef.current?.setPant(name, pantColor);
  };

  const handlePantColorChange = (color: string) => {
    Haptics.selectionAsync().catch(() => {});
    setPantColor(color);
    setBottomColor(color);
    engineRef.current?.setPant(selectedPant, color);
    engineRef.current?.setOutfitColor(topColor, color);
  };

  // Handlers for Gear / Accessories
  const handleGearSelect = (itemOrName: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const name = typeof itemOrName === 'string' ? itemOrName : itemOrName.name;
    setSelectedGear(name);
    if (typeof itemOrName === 'object') setActiveSelectedItem(itemOrName);
    engineRef.current?.setGear(name, gearColor);
  };

  const handleGearColorChange = (color: string) => {
    Haptics.selectionAsync().catch(() => {});
    setGearColor(color);
    engineRef.current?.setGear(selectedGear, color);
  };

  // Handlers for Shoes
  const handleShoeSelect = (itemOrName: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const name = typeof itemOrName === 'string' ? itemOrName : itemOrName.name;
    setSelectedShoe(name);
    if (typeof itemOrName === 'object') setActiveSelectedItem(itemOrName);
    engineRef.current?.setShoe(name, shoeColor);
  };

  const handleShoeColorChange = (color: string) => {
    Haptics.selectionAsync().catch(() => {});
    setShoeColor(color);
    engineRef.current?.setShoe(selectedShoe, color);
  };

  // Handlers for Socks
  const handleSockSelect = (itemOrName: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const name = typeof itemOrName === 'string' ? itemOrName : itemOrName.name;
    setSelectedSock(name);
    if (typeof itemOrName === 'object') setActiveSelectedItem(itemOrName);
    engineRef.current?.setSock(name, sockColor);
  };

  const handleSockColorChange = (color: string) => {
    Haptics.selectionAsync().catch(() => {});
    setSockColor(color);
    engineRef.current?.setSock(selectedSock, color);
  };

  const applyBundle = (bundleName: string, top: string, bottom: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setSelectedBundle(bundleName);
    setTopColor(top);
    setBottomColor(bottom);
    setShirtColor(top);
    setPantColor(bottom);
    engineRef.current?.setOutfitColor(top, bottom);
  };

  const playEmote = (emoteName: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setSelectedEmote(emoteName);
    switch (emoteName) {
      case 'Dance':
        engineRef.current?.playDance();
        break;
      case 'Flex':
        engineRef.current?.playFlex();
        break;
      case 'Wave':
        engineRef.current?.playWave();
        break;
      case 'PowerUp':
        engineRef.current?.playPowerUp();
        break;
      case 'Talking':
        setIsTalking(true);
        engineRef.current?.playTalking();
        break;
      default:
        setIsTalking(false);
        engineRef.current?.playIdle();
        break;
    }
  };

  const handleTopUpDiamonds = async () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      const newBal = userDiamonds + 500;
      setUserDiamonds(newBal);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('profiles').update({ diamond_balance: newBal }).eq('id', user.id);
      }
      Alert.alert("DIAMONDS ADDED 💎", "500 Diamonds added to your balance!");
    } catch (e) {}
  };

  const pick3DModelFile = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        setSelectedFile(file);
        if (!customModelName) {
          const cleanName = file.name ? file.name.replace(/\.[^/.]+$/, "") : `${itemType} Item`;
          setCustomModelName(cleanName);
        }
      }
    } catch (err: any) {
      Alert.alert("FILE PICK ERROR", err.message || "Could not select file.");
    }
  };

  const handleUploadAndSaveModel = async () => {
    try {
      if (!selectedFile && !customModelUrl.trim()) {
        Alert.alert("FILE OR URL REQUIRED", "Please select a 3D file (.glb / .fbx) or enter a model URL.");
        return;
      }

      if (!customModelName.trim()) {
        Alert.alert("NAME REQUIRED", "Please enter a name for your 3D item.");
        return;
      }

      let parsedCost = 0;
      if (privacy === 'PUBLIC') {
        parsedCost = Number(diamondPriceInput || '590');
        if (isNaN(parsedCost) || parsedCost < 590) {
          Alert.alert(
            "MINIMUM 590 DIAMONDS REQUIRED 💎",
            "Public Vault items cannot be set lower than 590 Diamonds."
          );
          return;
        }
      } else if (privacy === 'FRIENDS') {
        parsedCost = 290;
      } else {
        parsedCost = 0;
      }

      if (parsedCost > 0 && userDiamonds < parsedCost) {
        Alert.alert(
          "INSUFFICIENT DIAMONDS 💎",
          `Publishing for ${privacy} requires ${parsedCost} Diamonds 💎.\n\nYour Current Balance: ${userDiamonds} Diamonds 💎`
        );
        return;
      }

      setIsSaving(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

      const { data: { user } } = await supabase.auth.getUser();

      // Direct HTTP Upload to Server Port 8085
      let remoteUploadedUrl = '';
      if (selectedFile) {
        const serverUploadUrl = `http://${SERVER_IP}:${AVATAR_SERVER_PORT}/api/upload`;
        try {
          const uploadRes = await FileSystem.uploadAsync(serverUploadUrl, selectedFile.uri, {
            httpMethod: 'POST',
            uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
            headers: {
              'x-file-name': encodeURIComponent(selectedFile.name || `item_${Date.now()}.glb`),
              'x-item-name': encodeURIComponent(customModelName.trim()),
              'x-category': itemType.toUpperCase(),
              'x-diamonds': String(parsedCost)
            }
          });

          if (uploadRes && uploadRes.body) {
            const parsed = JSON.parse(uploadRes.body);
            if (parsed.success && parsed.url) {
              remoteUploadedUrl = `http://${SERVER_IP}:${AVATAR_SERVER_PORT}${parsed.url}`;
              console.log('[AVATAR STUDIO] Server Upload SUCCESS:', remoteUploadedUrl);
            } else {
              throw new Error(parsed.error || 'Server upload returned error');
            }
          } else {
            throw new Error('No response body received from server upload');
          }
        } catch (uploadErr: any) {
          console.error('[AVATAR STUDIO] Server Upload failed:', uploadErr);
          Alert.alert(
            "SERVER UPLOAD FAILED ❌",
            `Could not upload '${selectedFile.name}' to server.\n\nPlease make sure 'node scripts/avatar_server.js' is running in terminal!\n\nError: ${uploadErr.message || 'Server connection failed'}`
          );
          setIsSaving(false);
          return;
        }
      }

      const fileUri = remoteUploadedUrl || customModelUrl.trim();

      if (parsedCost > 0 && user) {
        const newBalance = Math.max(0, userDiamonds - parsedCost);
        setUserDiamonds(newBalance);
        await supabase.from('profiles').update({ diamond_balance: newBalance }).eq('id', user.id);
      }

      if (itemType === 'Avatar' || itemType === 'Bundle') {
        engineRef.current?.loadCustomModel(fileUri);
      } else if (itemType === 'Emote') {
        engineRef.current?.loadCustomEmote(fileUri);
      }

      const newItem = {
        id: `custom_${Date.now()}`,
        name: customModelName.trim(),
        uri: fileUri,
        type: itemType,
        privacy,
        diamond_price: parsedCost,
        original_price: parsedCost * 2,
        gender_target: gender === 'Female' ? 'FEMALE' : 'MALE',
        created_at: new Date().toISOString()
      };

      AvatarAssetRegistry.registerCustomVaultItem(newItem);

      const localRaw = await AsyncStorage.getItem('@my_custom_3d_vault');
      const existing = localRaw ? JSON.parse(localRaw) : [];
      const updatedList = [newItem, ...existing];
      await AsyncStorage.setItem('@my_custom_3d_vault', JSON.stringify(updatedList));
      setCustomVaultItems(updatedList);

      setShowAddModal(false);
      setSelectedFile(null);
      setCustomModelName('');
      setCustomModelUrl('');
      setPrivacy('PRIVATE');
      setDiamondPriceInput('590');

      Alert.alert(
        "3D ITEM SYNCED ✨",
        `'${customModelName.trim()}' (${itemType}) has been saved to your Vault (${privacy} mode) and synchronized with the stage.` +
        (parsedCost > 0 ? `\n\nPrice Set: ${parsedCost} 💎. Deducted ${parsedCost} Diamonds.` : `\n\n100% FREE (0 💎).`)
      );
    } catch (err: any) {
      Alert.alert("SAVE ERROR", err.message || "Failed to process 3D item.");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleTalkingTest = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (isTalking) {
      setIsTalking(false);
      engineRef.current?.playIdle();
    } else {
      setIsTalking(true);
      engineRef.current?.playTalking();
    }
  };

  const handleSaveAvatar = async () => {
    try {
      setIsSaving(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Auth session lost. Please log in.');

      const currentModelUri = getGenderModelUri(gender);

      await supabase
        .from('profiles')
        .update({
          gender,
          avatar_url: currentModelUri || profile?.avatar_url,
          updated_at: new Date()
        })
        .eq('id', user.id);

      await supabase
        .from('avatars')
        .upsert({
          user_id: user.id,
          avatar_url: currentModelUri,
          avatar_source: 'preset',
          top_color: topColor,
          bottom_color: bottomColor,
          metadata: {
            hair: selectedHair,
            hair_color: hairColor,
            shirt: selectedShirt,
            shirt_color: shirtColor,
            pant: selectedPant,
            pant_color: pantColor,
            gear: selectedGear,
            gear_color: gearColor,
            shoe: selectedShoe,
            shoe_color: shoeColor,
            sock: selectedSock,
            sock_color: sockColor
          },
          updated_at: new Date()
        });

      Alert.alert("VAULT SYNCED ✨", "Your VOEXI 3D Avatar profile & full outfit wardrobe have been saved.");
    } catch (err: any) {
      Alert.alert("SAVE ERROR", err.message || "Failed to save avatar.");
    } finally {
      setIsSaving(false);
    }
  };

  const currentModelUri = getGenderModelUri(gender);

  const navItems: { id: TabType; icon: string; label: string }[] = [
    { id: 'Avatar', icon: 'person-outline', label: 'AVATAR' },
    { id: 'Bundles', icon: 'shirt-outline', label: 'BUNDLES' },
    { id: 'Hair', icon: 'sparkles-outline', label: 'HAIR' },
    { id: 'Shirt', icon: 'shirt-outline', label: 'SHIRTS' },
    { id: 'Pant', icon: 'man-outline', label: 'PANTS' },
    { id: 'Gear', icon: 'glasses-outline', label: 'GEAR' },
    { id: 'Shoes', icon: 'footsteps-outline', label: 'SHOES' },
    { id: 'Socks', icon: 'shapes-outline', label: 'SOCKS' },
    { id: 'Emotes', icon: 'flash-outline', label: 'EMOTES' },
    { id: 'Vault', icon: 'cloud-upload-outline', label: 'VAULT' },
  ];

  const COLOR_PALETTE = ['#A855F7', '#00F2FE', '#FF2E93', '#10B981', '#F59E0B', '#3B82F6', '#FFFFFF', '#111111'];

  const displayItem = activeSelectedItem || {
    name: gender === 'Female' ? 'Female 3D Avatar' : 'Male 3D Avatar',
    diamond_price: 590,
    original_price: 1180,
    gender_target: gender === 'Female' ? 'FEMALE' : 'MALE'
  };

  const isFemalePill = (displayItem.gender_target || gender).toUpperCase() === 'FEMALE';

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#030308', '#070712', '#0A0A18']} style={StyleSheet.absoluteFill} />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>3D VAULT STUDIO</Text>
          <Text style={styles.headerSub}>VOEXI NEURAL STAGE</Text>
        </View>

        <TouchableOpacity onPress={handleSaveAvatar} disabled={isSaving} style={styles.saveBtn}>
          <LinearGradient colors={['#A855F7', '#00F2FE']} style={styles.saveBtnGradient}>
            <Text style={styles.saveBtnText}>{isSaving ? 'SAVING...' : 'SAVE'}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* TOP: LARGE 3D PREVIEW STAGE */}
      <View style={[styles.previewStage, isFullscreen && styles.previewStageFullscreen]}>
        <Avatar3DEngine
          ref={engineRef}
          modelUrl={currentModelUri}
          gender={gender.toLowerCase() as 'male' | 'female'}
          topColor={topColor}
          bottomColor={bottomColor}
          onEngineReady={() => {
            setIsLoading(false);
          }}
          onModelLoaded={() => {
            setIsLoading(false);
            setLoadPercent(100);
          }}
          onProgress={(pct) => {
            setLoadPercent(pct);
          }}
          onError={(err) => {
            setLoadError(err);
            setIsLoading(false);
          }}
        />

        {/* FULL VIEW TOGGLE BUTTON */}
        <TouchableOpacity
          style={styles.fullscreenBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            setIsFullscreen(!isFullscreen);
          }}
          activeOpacity={0.8}
        >
          <Ionicons name={isFullscreen ? "contract-outline" : "scan-outline"} size={18} color="#00F2FE" />
        </TouchableOpacity>

        {/* RIGHT SIDE BOTTOM 3D ITEM HUD CARD (SHOWS FULL DETAILS WHEN SELECTED) */}
        <View style={styles.hudDetailCard}>
          <View style={styles.hudHeaderRow}>
            <View style={[styles.genderPill, { backgroundColor: isFemalePill ? 'rgba(236,72,153,0.2)' : 'rgba(0,242,254,0.2)', borderColor: isFemalePill ? '#EC4899' : '#00F2FE' }]}>
              <Ionicons name={isFemalePill ? "female" : "male"} size={10} color={isFemalePill ? "#EC4899" : "#00F2FE"} />
              <Text style={[styles.genderPillText, { color: isFemalePill ? "#EC4899" : "#00F2FE" }]}>{(displayItem.gender_target || gender).toUpperCase()}</Text>
            </View>

            <View style={styles.discountTag}>
              <Text style={styles.discountTagText}>🔥 50% OFF</Text>
            </View>
          </View>

          <Text style={styles.hudTitle} numberOfLines={1}>{displayItem.name}</Text>
          <Text style={styles.hudDesc}>3D Item Description: Real 3D Asset from VOEXI 3D Server (Port 8085)</Text>

          <View style={styles.hudPriceRow}>
            <Text style={styles.hudPriceMain}>💎 {displayItem.diamond_price || 590}</Text>
            <Text style={styles.hudPriceOrig}>💎 {displayItem.original_price || (displayItem.diamond_price ? displayItem.diamond_price * 2 : 1180)}</Text>
          </View>
        </View>

        {/* LOADING BAR */}
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <Text style={styles.loadingText}>LOADING VAULT MODEL {loadPercent}%</Text>
            <View style={styles.progressBarTrack}>
              <View style={[styles.progressBarFill, { width: `${loadPercent}%` }]} />
            </View>
          </View>
        )}

        {/* ERROR NOTICE */}
        {loadError && (
          <View style={styles.errorBox}>
            <Ionicons name="warning-outline" size={18} color="#FF4D4D" />
            <Text style={styles.errorText} numberOfLines={2}>{loadError}</Text>
          </View>
        )}

        {/* TEST TALKING FLOATING BUTTON */}
        <TouchableOpacity
          style={[styles.talkingTestBtn, isTalking && styles.talkingTestBtnActive]}
          onPress={toggleTalkingTest}
        >
          <LinearGradient
            colors={isTalking ? ['#FF2E93', '#A855F7'] : ['#A855F7', '#00F2FE']}
            style={styles.talkingBtnGradient}
          >
            <Ionicons name={isTalking ? "mic" : "mic-outline"} size={16} color="#FFF" />
            <Text style={styles.talkingBtnText}>{isTalking ? 'TALKING...' : 'TEST TALKING'}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* BOTTOM: WARDROBE VAULT CATEGORIES & ITEMS */}
      {!isFullscreen && (
        <View style={styles.vaultContainer}>
          {/* LEFT SIDE NAVIGATION RAIL */}
          <View style={styles.navRail}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 4 }}>
              {navItems.map((cat) => {
                const isActive = activeTab === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.navRailItem, isActive && styles.navRailItemActive]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                      setActiveTab(cat.id);
                    }}
                  >
                    {isActive && (
                      <LinearGradient
                        colors={['rgba(168,85,247,0.3)', 'rgba(0,242,254,0.1)']}
                        style={StyleSheet.absoluteFill}
                      />
                    )}
                    <Ionicons name={cat.icon as any} size={18} color={isActive ? '#00F2FE' : '#666'} />
                    <Text style={[styles.navRailLabel, isActive && styles.navRailLabelActive]} numberOfLines={1}>
                      {cat.label}
                    </Text>
                    {isActive && <View style={styles.activeGlowIndicator} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* RIGHT SIDE WARDROBE CONTENT AREA */}
          <ScrollView style={styles.vaultContent} contentContainerStyle={styles.vaultContentBody}>
            {/* 0. AVATAR (BASE CHARACTER MODELS) */}
            {activeTab === 'Avatar' && (
              <View style={styles.panelBlock}>
                <View style={styles.panelHeaderRow}>
                  <Text style={styles.panelTitle}>3D CHARACTER AVATARS</Text>
                  <Text style={styles.panelCount}>{2 + customVaultItems.filter(i => i.type === 'Avatar' || i.category === 'AVATAR').length} MODELS</Text>
                </View>

                <View style={styles.vaultGrid}>
                  {/* MALE AVATAR CARD */}
                  {(() => {
                    const maleItem = customVaultItems.find(
                      (i) => i.filename && i.filename.toLowerCase().includes('male') && !i.filename.toLowerCase().includes('female')
                    );
                    const isSelected = selectedAvatarId === 'Male';
                    return (
                      <TouchableOpacity
                        style={[styles.ffVaultCard, isSelected && styles.ffVaultCardEquipped]}
                        onPress={() => handleGenderSwitch('Male')}
                        activeOpacity={0.85}
                      >
                        <LinearGradient colors={['#00F2FE', '#0284C7']} style={styles.rarityHeaderBar}>
                          <Text style={styles.rarityText}>LEGENDARY</Text>
                        </LinearGradient>
                        <View style={styles.ffCardInner}>
                          {maleItem && maleItem.image ? (
                            <Image source={{ uri: maleItem.image }} style={styles.cardThumbnailImage} />
                          ) : (
                            <Ionicons name="male" size={24} color="#00F2FE" style={{ marginVertical: 6 }} />
                          )}
                          <Text style={styles.ffCardName} numberOfLines={1}>{maleItem?.name || 'Male 3D Avatar'}</Text>
                          {isSelected ? (
                            <View style={styles.equippedBadge}>
                              <Ionicons name="checkmark-circle" size={10} color="#00F2FE" />
                              <Text style={styles.equippedText}>EQUIPPED</Text>
                            </View>
                          ) : (
                            <Text style={styles.tapEquipText}>SELECT</Text>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })()}

                  {/* FEMALE AVATAR CARD */}
                  {(() => {
                    const femaleItem = customVaultItems.find(
                      (i) => i.filename && i.filename.toLowerCase().includes('female')
                    );
                    const isSelected = selectedAvatarId === 'Female';
                    return (
                      <TouchableOpacity
                        style={[styles.ffVaultCard, isSelected && styles.ffVaultCardEquipped]}
                        onPress={() => handleGenderSwitch('Female')}
                        activeOpacity={0.85}
                      >
                        <LinearGradient colors={['#EC4899', '#BE185D']} style={styles.rarityHeaderBar}>
                          <Text style={styles.rarityText}>LEGENDARY</Text>
                        </LinearGradient>
                        <View style={styles.ffCardInner}>
                          {femaleItem && femaleItem.image ? (
                            <Image source={{ uri: femaleItem.image }} style={styles.cardThumbnailImage} />
                          ) : (
                            <Ionicons name="female" size={24} color="#EC4899" style={{ marginVertical: 6 }} />
                          )}
                          <Text style={styles.ffCardName} numberOfLines={1}>{femaleItem?.name || 'Female 3D Avatar'}</Text>
                          {isSelected ? (
                            <View style={styles.equippedBadge}>
                              <Ionicons name="checkmark-circle" size={10} color="#00F2FE" />
                              <Text style={styles.equippedText}>EQUIPPED</Text>
                            </View>
                          ) : (
                            <Text style={styles.tapEquipText}>SELECT</Text>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })()}

                  {/* CUSTOM UPLOADED AVATAR MODELS */}
                  {customVaultItems.filter(i => i.type === 'Avatar' || i.category === 'AVATAR').map((item) => {
                    const isSelected = selectedAvatarId === item.id || selectedAvatarId === item.name;
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[styles.ffVaultCard, isSelected && styles.ffVaultCardEquipped]}
                        onPress={() => {
                          setSelectedAvatarId(item.id);
                          setActiveSelectedItem(item);
                          engineRef.current?.loadCustomModel(item.uri);
                        }}
                        activeOpacity={0.85}
                      >
                        <LinearGradient colors={['#A855F7', '#6B21A8']} style={styles.rarityHeaderBar}>
                          <Text style={styles.rarityText}>{item.privacy || 'PUBLIC'}</Text>
                        </LinearGradient>
                        <View style={styles.ffCardInner}>
                          {item.image ? (
                            <Image source={{ uri: item.image }} style={styles.cardThumbnailImage} />
                          ) : (
                            <Ionicons name="person-outline" size={24} color="#A855F7" style={{ marginVertical: 6 }} />
                          )}
                          <Text style={styles.ffCardName} numberOfLines={1}>{item.name}</Text>
                          {isSelected ? (
                            <View style={styles.equippedBadge}>
                              <Ionicons name="checkmark-circle" size={10} color="#00F2FE" />
                              <Text style={styles.equippedText}>EQUIPPED</Text>
                            </View>
                          ) : (
                            <Text style={styles.tapEquipText}>SELECT</Text>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}

                  {/* ADD NEW AVATAR CARD */}
                  <TouchableOpacity
                    style={[styles.ffVaultCard, styles.ffVaultCardAdd]}
                    onPress={() => {
                      setItemType('Avatar');
                      setShowAddModal(true);
                    }}
                    activeOpacity={0.85}
                  >
                    <LinearGradient colors={['rgba(0, 242, 254, 0.3)', 'rgba(168, 85, 247, 0.3)']} style={styles.rarityHeaderBar}>
                      <Text style={[styles.rarityText, { color: '#00F2FE' }]}>ADD NEW</Text>
                    </LinearGradient>
                    <View style={styles.ffCardInner}>
                      <Ionicons name="add-circle-outline" size={24} color="#00F2FE" style={{ marginVertical: 6 }} />
                      <Text style={[styles.ffCardName, { color: '#00F2FE' }]} numberOfLines={1}>ADD AVATAR</Text>
                      <Text style={styles.tapEquipText}>TAP TO ADD</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* 1. BUNDLES */}
            {activeTab === 'Bundles' && (
              <View style={styles.panelBlock}>
                <View style={styles.panelHeaderRow}>
                  <Text style={styles.panelTitle}>VAULT BUNDLES</Text>
                  <Text style={styles.panelCount}>{6 + customVaultItems.filter(i => i.type === 'Bundle').length} ITEMS</Text>
                </View>

                <View style={styles.vaultGrid}>
                  {customVaultItems.filter(i => i.type === 'Bundle').map((item) => {
                    const isSelected = selectedBundle === item.name || selectedBundle === item.id;
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[styles.ffVaultCard, isSelected && styles.ffVaultCardEquipped]}
                        onPress={() => {
                          setSelectedBundle(item.name);
                          setActiveSelectedItem(item);
                          engineRef.current?.loadCustomModel(item.uri);
                        }}
                        activeOpacity={0.85}
                      >
                        <LinearGradient colors={['#00F2FE', '#0284C7']} style={styles.rarityHeaderBar}>
                          <Text style={styles.rarityText}>{item.privacy || 'PUBLIC'}</Text>
                        </LinearGradient>
                        <View style={styles.ffCardInner}>
                          {item.image ? (
                            <Image source={{ uri: item.image }} style={styles.cardThumbnailImage} />
                          ) : (
                            <Ionicons name="cube-outline" size={22} color="#00F2FE" style={{ marginVertical: 6 }} />
                          )}
                          <Text style={styles.ffCardName} numberOfLines={1}>{item.name}</Text>
                          {isSelected ? (
                            <View style={styles.equippedBadge}>
                              <Ionicons name="checkmark-circle" size={10} color="#00F2FE" />
                              <Text style={styles.equippedText}>EQUIPPED</Text>
                            </View>
                          ) : (
                            <Text style={styles.tapEquipText}>EQUIP</Text>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}

                  {[
                    { id: '1', name: 'Cyberpunk Legend', rarity: 'LEGENDARY', grad: ['#FFD700', '#B8860B'], top: '#A855F7', bottom: '#00F2FE', icon: 'shirt-outline' },
                    { id: '2', name: 'Neon Phantom', rarity: 'EPIC', grad: ['#A855F7', '#6B21A8'], top: '#EC4899', bottom: '#3B82F6', icon: 'sparkles-outline' },
                    { id: '3', name: 'Royal Gold', rarity: 'LEGENDARY', grad: ['#FFD700', '#D97706'], top: '#F59E0B', bottom: '#111111', icon: 'trophy-outline' },
                    { id: '4', name: 'Void Stealth', rarity: 'RARE', grad: ['#00F2FE', '#0284C7'], top: '#111111', bottom: '#64748B', icon: 'shield-outline' },
                    { id: '5', name: 'Spectral Aura', rarity: 'EPIC', grad: ['#A855F7', '#7E22CE'], top: '#10B981', bottom: '#EC4899', icon: 'flame-outline' },
                    { id: '6', name: 'Electric Pulse', rarity: 'RARE', grad: ['#00F2FE', '#0369A1'], top: '#3B82F6', bottom: '#00F2FE', icon: 'flash-outline' },
                  ].map((b) => {
                    const isSelected = selectedBundle === b.name;
                    return (
                      <TouchableOpacity
                        key={b.id}
                        style={[styles.ffVaultCard, isSelected && styles.ffVaultCardEquipped]}
                        onPress={() => applyBundle(b.name, b.top, b.bottom)}
                        activeOpacity={0.85}
                      >
                        <LinearGradient colors={b.grad} style={styles.rarityHeaderBar}>
                          <Text style={styles.rarityText}>{b.rarity}</Text>
                        </LinearGradient>

                        <View style={styles.ffCardInner}>
                          <Ionicons name={b.icon as any} size={22} color={b.grad[0]} style={{ marginVertical: 6 }} />
                          <Text style={styles.ffCardName} numberOfLines={1}>{b.name}</Text>

                          {isSelected ? (
                            <View style={styles.equippedBadge}>
                              <Ionicons name="checkmark-circle" size={10} color="#00F2FE" />
                              <Text style={styles.equippedText}>EQUIPPED</Text>
                            </View>
                          ) : (
                            <Text style={styles.tapEquipText}>EQUIP</Text>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}

                  <TouchableOpacity
                    style={[styles.ffVaultCard, styles.ffVaultCardAdd]}
                    onPress={() => {
                      setItemType('Bundle');
                      setShowAddModal(true);
                    }}
                    activeOpacity={0.85}
                  >
                    <LinearGradient colors={['rgba(0, 242, 254, 0.3)', 'rgba(168, 85, 247, 0.3)']} style={styles.rarityHeaderBar}>
                      <Text style={[styles.rarityText, { color: '#00F2FE' }]}>ADD NEW</Text>
                    </LinearGradient>
                    <View style={styles.ffCardInner}>
                      <Ionicons name="add-circle-outline" size={24} color="#00F2FE" style={{ marginVertical: 6 }} />
                      <Text style={[styles.ffCardName, { color: '#00F2FE' }]} numberOfLines={1}>ADD BUNDLE</Text>
                      <Text style={styles.tapEquipText}>TAP TO ADD</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* 2. HAIR */}
            {activeTab === 'Hair' && (
              <View style={styles.panelBlock}>
                <Text style={styles.panelTitle}>HAIR COLOR</Text>
                <View style={styles.colorRow}>
                  {COLOR_PALETTE.map((c) => (
                    <TouchableOpacity
                      key={'hair-' + c}
                      style={[styles.colorDot, { backgroundColor: c }, hairColor === c && styles.colorDotActive]}
                      onPress={() => handleHairColorChange(c)}
                    />
                  ))}
                </View>

                <View style={[styles.panelHeaderRow, { marginTop: 18 }]}>
                  <Text style={styles.panelTitle}>HAIR STYLES</Text>
                  <Text style={styles.panelCount}>{6 + customVaultItems.filter(i => i.type === 'Hair').length} STYLES</Text>
                </View>

                <View style={styles.vaultGrid}>
                  {customVaultItems.filter(i => i.type === 'Hair').map((item) => {
                    const isSelected = selectedHair === item.name || selectedHair === item.id;
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[styles.ffVaultCard, isSelected && styles.ffVaultCardEquipped]}
                        onPress={() => handleHairSelect(item)}
                        activeOpacity={0.85}
                      >
                        <LinearGradient colors={['#A855F7', '#6B21A8']} style={styles.rarityHeaderBar}>
                          <Text style={styles.rarityText}>{item.privacy || 'PUBLIC'}</Text>
                        </LinearGradient>
                        <View style={styles.ffCardInner}>
                          {item.image ? (
                            <Image source={{ uri: item.image }} style={styles.cardThumbnailImage} />
                          ) : (
                            <Ionicons name="sparkles-outline" size={22} color="#A855F7" style={{ marginVertical: 6 }} />
                          )}
                          <Text style={styles.ffCardName} numberOfLines={1}>{item.name}</Text>
                          {isSelected ? (
                            <View style={styles.equippedBadge}>
                              <Ionicons name="checkmark-circle" size={10} color="#00F2FE" />
                              <Text style={styles.equippedText}>EQUIPPED</Text>
                            </View>
                          ) : (
                            <Text style={styles.tapEquipText}>EQUIP</Text>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}

                  {[
                    { id: 'h1', name: 'Cyber Spikes', rarity: 'LEGENDARY', grad: ['#FFD700', '#B8860B'], icon: 'sparkles-outline' },
                    { id: 'h2', name: 'Anime Long', rarity: 'EPIC', grad: ['#A855F7', '#7E22CE'], icon: 'cut-outline' },
                    { id: 'h3', name: 'Fade Cut', rarity: 'RARE', grad: ['#00F2FE', '#0284C7'], icon: 'person-outline' },
                    { id: 'h4', name: 'Neon Afro', rarity: 'EPIC', grad: ['#A855F7', '#6B21A8'], icon: 'flame-outline' },
                    { id: 'h5', name: 'Royal Crown', rarity: 'LEGENDARY', grad: ['#FFD700', '#D97706'], icon: 'trophy-outline' },
                    { id: 'h6', name: 'Sleek Pomp', rarity: 'RARE', grad: ['#00F2FE', '#0369A1'], icon: 'flash-outline' },
                  ].map((h) => {
                    const isSelected = selectedHair === h.name;
                    return (
                      <TouchableOpacity
                        key={h.id}
                        style={[styles.ffVaultCard, isSelected && styles.ffVaultCardEquipped]}
                        onPress={() => handleHairSelect(h.name)}
                        activeOpacity={0.85}
                      >
                        <LinearGradient colors={h.grad} style={styles.rarityHeaderBar}>
                          <Text style={styles.rarityText}>{h.rarity}</Text>
                        </LinearGradient>
                        <View style={styles.ffCardInner}>
                          <Ionicons name={h.icon as any} size={22} color={h.grad[0]} style={{ marginVertical: 6 }} />
                          <Text style={styles.ffCardName} numberOfLines={1}>{h.name}</Text>
                          {isSelected ? (
                            <View style={styles.equippedBadge}>
                              <Ionicons name="checkmark-circle" size={10} color="#00F2FE" />
                              <Text style={styles.equippedText}>EQUIPPED</Text>
                            </View>
                          ) : (
                            <Text style={styles.tapEquipText}>EQUIP</Text>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}

                  <TouchableOpacity
                    style={[styles.ffVaultCard, styles.ffVaultCardAdd]}
                    onPress={() => {
                      setItemType('Hair');
                      setShowAddModal(true);
                    }}
                    activeOpacity={0.85}
                  >
                    <LinearGradient colors={['rgba(0, 242, 254, 0.3)', 'rgba(168, 85, 247, 0.3)']} style={styles.rarityHeaderBar}>
                      <Text style={[styles.rarityText, { color: '#00F2FE' }]}>ADD NEW</Text>
                    </LinearGradient>
                    <View style={styles.ffCardInner}>
                      <Ionicons name="add-circle-outline" size={24} color="#00F2FE" style={{ marginVertical: 6 }} />
                      <Text style={[styles.ffCardName, { color: '#00F2FE' }]} numberOfLines={1}>ADD HAIR</Text>
                      <Text style={styles.tapEquipText}>TAP TO ADD</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* 3. SHIRT / TOP */}
            {activeTab === 'Shirt' && (
              <View style={styles.panelBlock}>
                <Text style={styles.panelTitle}>SHIRT / JACKET COLOR</Text>
                <View style={styles.colorRow}>
                  {COLOR_PALETTE.map((c) => (
                    <TouchableOpacity
                      key={'shirt-' + c}
                      style={[styles.colorDot, { backgroundColor: c }, shirtColor === c && styles.colorDotActive]}
                      onPress={() => handleShirtColorChange(c)}
                    />
                  ))}
                </View>

                <View style={[styles.panelHeaderRow, { marginTop: 18 }]}>
                  <Text style={styles.panelTitle}>SHIRTS & JACKETS</Text>
                  <Text style={styles.panelCount}>{5 + customVaultItems.filter(i => i.type === 'Shirt').length} ITEMS</Text>
                </View>

                <View style={styles.vaultGrid}>
                  {customVaultItems.filter(i => i.type === 'Shirt').map((item) => {
                    const isSelected = selectedShirt === item.name || selectedShirt === item.id;
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[styles.ffVaultCard, isSelected && styles.ffVaultCardEquipped]}
                        onPress={() => {
                          handleShirtSelect(item);
                          if (item.uri) {
                            engineRef.current?.equipAsset({
                              id: item.id,
                              name: item.name,
                              type: 'TOP',
                              assetUrl: item.uri
                            });
                          }
                        }}
                        activeOpacity={0.85}
                      >
                        <LinearGradient colors={['#00F2FE', '#0284C7']} style={styles.rarityHeaderBar}>
                          <Text style={styles.rarityText}>{item.privacy || 'PUBLIC'}</Text>
                        </LinearGradient>
                        <View style={styles.ffCardInner}>
                          {item.image ? (
                            <Image source={{ uri: item.image }} style={styles.cardThumbnailImage} />
                          ) : (
                            <Ionicons name="shirt-outline" size={22} color="#00F2FE" style={{ marginVertical: 6 }} />
                          )}
                          <Text style={styles.ffCardName} numberOfLines={1}>{item.name}</Text>
                          {isSelected ? (
                            <View style={styles.equippedBadge}>
                              <Ionicons name="checkmark-circle" size={10} color="#00F2FE" />
                              <Text style={styles.equippedText}>EQUIPPED</Text>
                            </View>
                          ) : (
                            <Text style={styles.tapEquipText}>EQUIP</Text>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}

                  {[
                    { id: 's1', name: 'Cyber Jacket', rarity: 'LEGENDARY', grad: ['#FFD700', '#B8860B'], icon: 'shirt-outline' },
                    { id: 's2', name: 'Crimson Tech Hoodie', rarity: 'EPIC', grad: ['#A855F7', '#7E22CE'], icon: 'sparkles-outline' },
                    { id: 's3', name: 'Royal Gold Shirt', rarity: 'LEGENDARY', grad: ['#FFD700', '#D97706'], icon: 'trophy-outline' },
                    { id: 's4', name: 'Stealth Tee', rarity: 'RARE', grad: ['#00F2FE', '#0284C7'], icon: 'shield-outline' },
                    { id: 's5', name: 'Neon Vest', rarity: 'EPIC', grad: ['#A855F7', '#6B21A8'], icon: 'flame-outline' },
                  ].map((s) => {
                    const isSelected = selectedShirt === s.name;
                    return (
                      <TouchableOpacity
                        key={s.id}
                        style={[styles.ffVaultCard, isSelected && styles.ffVaultCardEquipped]}
                        onPress={() => handleShirtSelect(s.name)}
                        activeOpacity={0.85}
                      >
                        <LinearGradient colors={s.grad} style={styles.rarityHeaderBar}>
                          <Text style={styles.rarityText}>{s.rarity}</Text>
                        </LinearGradient>
                        <View style={styles.ffCardInner}>
                          <Ionicons name={s.icon as any} size={22} color={s.grad[0]} style={{ marginVertical: 6 }} />
                          <Text style={styles.ffCardName} numberOfLines={1}>{s.name}</Text>
                          {isSelected ? (
                            <View style={styles.equippedBadge}>
                              <Ionicons name="checkmark-circle" size={10} color="#00F2FE" />
                              <Text style={styles.equippedText}>EQUIPPED</Text>
                            </View>
                          ) : (
                            <Text style={styles.tapEquipText}>EQUIP</Text>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}

                  <TouchableOpacity
                    style={[styles.ffVaultCard, styles.ffVaultCardAdd]}
                    onPress={() => {
                      setItemType('Shirt');
                      setShowAddModal(true);
                    }}
                    activeOpacity={0.85}
                  >
                    <LinearGradient colors={['rgba(0, 242, 254, 0.3)', 'rgba(168, 85, 247, 0.3)']} style={styles.rarityHeaderBar}>
                      <Text style={[styles.rarityText, { color: '#00F2FE' }]}>ADD NEW</Text>
                    </LinearGradient>
                    <View style={styles.ffCardInner}>
                      <Ionicons name="add-circle-outline" size={24} color="#00F2FE" style={{ marginVertical: 6 }} />
                      <Text style={[styles.ffCardName, { color: '#00F2FE' }]} numberOfLines={1}>ADD SHIRT</Text>
                      <Text style={styles.tapEquipText}>TAP TO ADD</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* 4. PANTS / BOTTOM */}
            {activeTab === 'Pant' && (
              <View style={styles.panelBlock}>
                <Text style={styles.panelTitle}>PANTS / BOTTOM COLOR</Text>
                <View style={styles.colorRow}>
                  {COLOR_PALETTE.map((c) => (
                    <TouchableOpacity
                      key={'pant-' + c}
                      style={[styles.colorDot, { backgroundColor: c }, pantColor === c && styles.colorDotActive]}
                      onPress={() => handlePantColorChange(c)}
                    />
                  ))}
                </View>

                <View style={[styles.panelHeaderRow, { marginTop: 18 }]}>
                  <Text style={styles.panelTitle}>PANTS & JOGGERS</Text>
                  <Text style={styles.panelCount}>{5 + customVaultItems.filter(i => i.type === 'Pant').length} ITEMS</Text>
                </View>

                <View style={styles.vaultGrid}>
                  {customVaultItems.filter(i => i.type === 'Pant').map((item) => {
                    const isSelected = selectedPant === item.name || selectedPant === item.id;
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[styles.ffVaultCard, isSelected && styles.ffVaultCardEquipped]}
                        onPress={() => {
                          handlePantSelect(item);
                          if (item.uri) {
                            engineRef.current?.equipAsset({
                              id: item.id,
                              name: item.name,
                              type: 'PANTS',
                              assetUrl: item.uri
                            });
                          }
                        }}
                        activeOpacity={0.85}
                      >
                        <LinearGradient colors={['#3B82F6', '#1E40AF']} style={styles.rarityHeaderBar}>
                          <Text style={styles.rarityText}>{item.privacy || 'PUBLIC'}</Text>
                        </LinearGradient>
                        <View style={styles.ffCardInner}>
                          {item.image ? (
                            <Image source={{ uri: item.image }} style={styles.cardThumbnailImage} />
                          ) : (
                            <Ionicons name="man-outline" size={22} color="#3B82F6" style={{ marginVertical: 6 }} />
                          )}
                          <Text style={styles.ffCardName} numberOfLines={1}>{item.name}</Text>
                          {isSelected ? (
                            <View style={styles.equippedBadge}>
                              <Ionicons name="checkmark-circle" size={10} color="#00F2FE" />
                              <Text style={styles.equippedText}>EQUIPPED</Text>
                            </View>
                          ) : (
                            <Text style={styles.tapEquipText}>EQUIP</Text>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}

                  {[
                    { id: 'p1', name: 'Cyber Joggers', rarity: 'LEGENDARY', grad: ['#FFD700', '#B8860B'], icon: 'man-outline' },
                    { id: 'p2', name: 'Denim Pants', rarity: 'RARE', grad: ['#00F2FE', '#0284C7'], icon: 'body-outline' },
                    { id: 'p3', name: 'Tactical Cargo', rarity: 'EPIC', grad: ['#A855F7', '#7E22CE'], icon: 'shield-outline' },
                    { id: 'p4', name: 'Tech Shorts', rarity: 'RARE', grad: ['#00F2FE', '#0369A1'], icon: 'flash-outline' },
                    { id: 'p5', name: 'Royal Trousers', rarity: 'LEGENDARY', grad: ['#FFD700', '#D97706'], icon: 'trophy-outline' },
                  ].map((p) => {
                    const isSelected = selectedPant === p.name;
                    return (
                      <TouchableOpacity
                        key={p.id}
                        style={[styles.ffVaultCard, isSelected && styles.ffVaultCardEquipped]}
                        onPress={() => handlePantSelect(p.name)}
                        activeOpacity={0.85}
                      >
                        <LinearGradient colors={p.grad} style={styles.rarityHeaderBar}>
                          <Text style={styles.rarityText}>{p.rarity}</Text>
                        </LinearGradient>
                        <View style={styles.ffCardInner}>
                          <Ionicons name={p.icon as any} size={22} color={p.grad[0]} style={{ marginVertical: 6 }} />
                          <Text style={styles.ffCardName} numberOfLines={1}>{p.name}</Text>
                          {isSelected ? (
                            <View style={styles.equippedBadge}>
                              <Ionicons name="checkmark-circle" size={10} color="#00F2FE" />
                              <Text style={styles.equippedText}>EQUIPPED</Text>
                            </View>
                          ) : (
                            <Text style={styles.tapEquipText}>EQUIP</Text>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}

                  <TouchableOpacity
                    style={[styles.ffVaultCard, styles.ffVaultCardAdd]}
                    onPress={() => {
                      setItemType('Pant');
                      setShowAddModal(true);
                    }}
                    activeOpacity={0.85}
                  >
                    <LinearGradient colors={['rgba(0, 242, 254, 0.3)', 'rgba(168, 85, 247, 0.3)']} style={styles.rarityHeaderBar}>
                      <Text style={[styles.rarityText, { color: '#00F2FE' }]}>ADD NEW</Text>
                    </LinearGradient>
                    <View style={styles.ffCardInner}>
                      <Ionicons name="add-circle-outline" size={24} color="#00F2FE" style={{ marginVertical: 6 }} />
                      <Text style={[styles.ffCardName, { color: '#00F2FE' }]} numberOfLines={1}>ADD PANTS</Text>
                      <Text style={styles.tapEquipText}>TAP TO ADD</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* 5. GEAR / ACCESSORIES */}
            {activeTab === 'Gear' && (
              <View style={styles.panelBlock}>
                <Text style={styles.panelTitle}>GEAR COLOR</Text>
                <View style={styles.colorRow}>
                  {COLOR_PALETTE.map((c) => (
                    <TouchableOpacity
                      key={'gear-' + c}
                      style={[styles.colorDot, { backgroundColor: c }, gearColor === c && styles.colorDotActive]}
                      onPress={() => handleGearColorChange(c)}
                    />
                  ))}
                </View>

                <View style={[styles.panelHeaderRow, { marginTop: 18 }]}>
                  <Text style={styles.panelTitle}>3D GEAR & ACCESSORIES</Text>
                  <Text style={styles.panelCount}>{5 + customVaultItems.filter(i => i.type === 'Gear').length} ITEMS</Text>
                </View>

                <View style={styles.vaultGrid}>
                  {customVaultItems.filter(i => i.type === 'Gear').map((item) => {
                    const isSelected = selectedGear === item.name || selectedGear === item.id;
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[styles.ffVaultCard, isSelected && styles.ffVaultCardEquipped]}
                        onPress={() => handleGearSelect(item)}
                        activeOpacity={0.85}
                      >
                        <LinearGradient colors={['#FFD700', '#B8860B']} style={styles.rarityHeaderBar}>
                          <Text style={styles.rarityText}>{item.privacy || 'PUBLIC'}</Text>
                        </LinearGradient>
                        <View style={styles.ffCardInner}>
                          {item.image ? (
                            <Image source={{ uri: item.image }} style={styles.cardThumbnailImage} />
                          ) : (
                            <Ionicons name="glasses-outline" size={22} color="#FFD700" style={{ marginVertical: 6 }} />
                          )}
                          <Text style={styles.ffCardName} numberOfLines={1}>{item.name}</Text>
                          {isSelected ? (
                            <View style={styles.equippedBadge}>
                              <Ionicons name="checkmark-circle" size={10} color="#00F2FE" />
                              <Text style={styles.equippedText}>EQUIPPED</Text>
                            </View>
                          ) : (
                            <Text style={styles.tapEquipText}>EQUIP</Text>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}

                  {[
                    { id: 'g1', name: 'Cyber Visor', rarity: 'LEGENDARY', grad: ['#FFD700', '#B8860B'], icon: 'glasses-outline' },
                    { id: 'g2', name: 'Tactical Mask', rarity: 'EPIC', grad: ['#A855F7', '#7E22CE'], icon: 'medical-outline' },
                    { id: 'g3', name: 'Neon Glasses', rarity: 'RARE', grad: ['#00F2FE', '#0284C7'], icon: 'glasses-outline' },
                    { id: 'g4', name: 'Cyber Wings', rarity: 'LEGENDARY', grad: ['#FFD700', '#D97706'], icon: 'paper-plane-outline' },
                    { id: 'g5', name: 'Hologram Headset', rarity: 'EPIC', grad: ['#A855F7', '#6B21A8'], icon: 'headset-outline' },
                  ].map((g) => {
                    const isSelected = selectedGear === g.name;
                    return (
                      <TouchableOpacity
                        key={g.id}
                        style={[styles.ffVaultCard, isSelected && styles.ffVaultCardEquipped]}
                        onPress={() => handleGearSelect(g.name)}
                        activeOpacity={0.85}
                      >
                        <LinearGradient colors={g.grad} style={styles.rarityHeaderBar}>
                          <Text style={styles.rarityText}>{g.rarity}</Text>
                        </LinearGradient>
                        <View style={styles.ffCardInner}>
                          <Ionicons name={g.icon as any} size={22} color={g.grad[0]} style={{ marginVertical: 6 }} />
                          <Text style={styles.ffCardName} numberOfLines={1}>{g.name}</Text>
                          {isSelected ? (
                            <View style={styles.equippedBadge}>
                              <Ionicons name="checkmark-circle" size={10} color="#00F2FE" />
                              <Text style={styles.equippedText}>EQUIPPED</Text>
                            </View>
                          ) : (
                            <Text style={styles.tapEquipText}>EQUIP</Text>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}

                  <TouchableOpacity
                    style={[styles.ffVaultCard, styles.ffVaultCardAdd]}
                    onPress={() => {
                      setItemType('Gear');
                      setShowAddModal(true);
                    }}
                    activeOpacity={0.85}
                  >
                    <LinearGradient colors={['rgba(0, 242, 254, 0.3)', 'rgba(168, 85, 247, 0.3)']} style={styles.rarityHeaderBar}>
                      <Text style={[styles.rarityText, { color: '#00F2FE' }]}>ADD NEW</Text>
                    </LinearGradient>
                    <View style={styles.ffCardInner}>
                      <Ionicons name="add-circle-outline" size={24} color="#00F2FE" style={{ marginVertical: 6 }} />
                      <Text style={[styles.ffCardName, { color: '#00F2FE' }]} numberOfLines={1}>ADD GEAR</Text>
                      <Text style={styles.tapEquipText}>TAP TO ADD</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* 6. SHOES */}
            {activeTab === 'Shoes' && (
              <View style={styles.panelBlock}>
                <Text style={styles.panelTitle}>SHOES COLOR</Text>
                <View style={styles.colorRow}>
                  {COLOR_PALETTE.map((c) => (
                    <TouchableOpacity
                      key={'shoe-' + c}
                      style={[styles.colorDot, { backgroundColor: c }, shoeColor === c && styles.colorDotActive]}
                      onPress={() => handleShoeColorChange(c)}
                    />
                  ))}
                </View>

                <View style={[styles.panelHeaderRow, { marginTop: 18 }]}>
                  <Text style={styles.panelTitle}>SHOES & SNEAKERS</Text>
                  <Text style={styles.panelCount}>{5 + customVaultItems.filter(i => i.type === 'Shoes').length} ITEMS</Text>
                </View>

                <View style={styles.vaultGrid}>
                  {customVaultItems.filter(i => i.type === 'Shoes').map((item) => {
                    const isSelected = selectedShoe === item.name || selectedShoe === item.id;
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[styles.ffVaultCard, isSelected && styles.ffVaultCardEquipped]}
                        onPress={() => handleShoeSelect(item)}
                        activeOpacity={0.85}
                      >
                        <LinearGradient colors={['#10B981', '#047857']} style={styles.rarityHeaderBar}>
                          <Text style={styles.rarityText}>{item.privacy || 'PUBLIC'}</Text>
                        </LinearGradient>
                        <View style={styles.ffCardInner}>
                          {item.image ? (
                            <Image source={{ uri: item.image }} style={styles.cardThumbnailImage} />
                          ) : (
                            <Ionicons name="footsteps-outline" size={22} color="#10B981" style={{ marginVertical: 6 }} />
                          )}
                          <Text style={styles.ffCardName} numberOfLines={1}>{item.name}</Text>
                          {isSelected ? (
                            <View style={styles.equippedBadge}>
                              <Ionicons name="checkmark-circle" size={10} color="#00F2FE" />
                              <Text style={styles.equippedText}>EQUIPPED</Text>
                            </View>
                          ) : (
                            <Text style={styles.tapEquipText}>EQUIP</Text>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}

                  {[
                    { id: 'sh1', name: 'Cyber Kicks', rarity: 'LEGENDARY', grad: ['#FFD700', '#B8860B'], icon: 'footsteps-outline' },
                    { id: 'sh2', name: 'Booster Runners', rarity: 'EPIC', grad: ['#A855F7', '#7E22CE'], icon: 'flash-outline' },
                    { id: 'sh3', name: 'Combat Boots', rarity: 'RARE', grad: ['#00F2FE', '#0284C7'], icon: 'shield-outline' },
                    { id: 'sh4', name: 'Royal Loafers', rarity: 'LEGENDARY', grad: ['#FFD700', '#D97706'], icon: 'trophy-outline' },
                    { id: 'sh5', name: 'Neon Slides', rarity: 'RARE', grad: ['#00F2FE', '#0369A1'], icon: 'pricetag-outline' },
                  ].map((sh) => {
                    const isSelected = selectedShoe === sh.name;
                    return (
                      <TouchableOpacity
                        key={sh.id}
                        style={[styles.ffVaultCard, isSelected && styles.ffVaultCardEquipped]}
                        onPress={() => handleShoeSelect(sh.name)}
                        activeOpacity={0.85}
                      >
                        <LinearGradient colors={sh.grad} style={styles.rarityHeaderBar}>
                          <Text style={styles.rarityText}>{sh.rarity}</Text>
                        </LinearGradient>
                        <View style={styles.ffCardInner}>
                          <Ionicons name={sh.icon as any} size={22} color={sh.grad[0]} style={{ marginVertical: 6 }} />
                          <Text style={styles.ffCardName} numberOfLines={1}>{sh.name}</Text>
                          {isSelected ? (
                            <View style={styles.equippedBadge}>
                              <Ionicons name="checkmark-circle" size={10} color="#00F2FE" />
                              <Text style={styles.equippedText}>EQUIPPED</Text>
                            </View>
                          ) : (
                            <Text style={styles.tapEquipText}>EQUIP</Text>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}

                  <TouchableOpacity
                    style={[styles.ffVaultCard, styles.ffVaultCardAdd]}
                    onPress={() => {
                      setItemType('Shoes');
                      setShowAddModal(true);
                    }}
                    activeOpacity={0.85}
                  >
                    <LinearGradient colors={['rgba(0, 242, 254, 0.3)', 'rgba(168, 85, 247, 0.3)']} style={styles.rarityHeaderBar}>
                      <Text style={[styles.rarityText, { color: '#00F2FE' }]}>ADD NEW</Text>
                    </LinearGradient>
                    <View style={styles.ffCardInner}>
                      <Ionicons name="add-circle-outline" size={24} color="#00F2FE" style={{ marginVertical: 6 }} />
                      <Text style={[styles.ffCardName, { color: '#00F2FE' }]} numberOfLines={1}>ADD SHOES</Text>
                      <Text style={styles.tapEquipText}>TAP TO ADD</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* 7. SOCKS */}
            {activeTab === 'Socks' && (
              <View style={styles.panelBlock}>
                <Text style={styles.panelTitle}>SOCKS COLOR</Text>
                <View style={styles.colorRow}>
                  {COLOR_PALETTE.map((c) => (
                    <TouchableOpacity
                      key={'sock-' + c}
                      style={[styles.colorDot, { backgroundColor: c }, sockColor === c && styles.colorDotActive]}
                      onPress={() => handleSockColorChange(c)}
                    />
                  ))}
                </View>

                <View style={[styles.panelHeaderRow, { marginTop: 18 }]}>
                  <Text style={styles.panelTitle}>SOCKS & FOOTWEAR DETAILS</Text>
                  <Text style={styles.panelCount}>{4 + customVaultItems.filter(i => i.type === 'Socks').length} ITEMS</Text>
                </View>

                <View style={styles.vaultGrid}>
                  {customVaultItems.filter(i => i.type === 'Socks').map((item) => {
                    const isSelected = selectedSock === item.name || selectedSock === item.id;
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[styles.ffVaultCard, isSelected && styles.ffVaultCardEquipped]}
                        onPress={() => handleSockSelect(item)}
                        activeOpacity={0.85}
                      >
                        <LinearGradient colors={['#EC4899', '#BE185D']} style={styles.rarityHeaderBar}>
                          <Text style={styles.rarityText}>{item.privacy || 'PUBLIC'}</Text>
                        </LinearGradient>
                        <View style={styles.ffCardInner}>
                          {item.image ? (
                            <Image source={{ uri: item.image }} style={styles.cardThumbnailImage} />
                          ) : (
                            <Ionicons name="shapes-outline" size={22} color="#EC4899" style={{ marginVertical: 6 }} />
                          )}
                          <Text style={styles.ffCardName} numberOfLines={1}>{item.name}</Text>
                          {isSelected ? (
                            <View style={styles.equippedBadge}>
                              <Ionicons name="checkmark-circle" size={10} color="#00F2FE" />
                              <Text style={styles.equippedText}>EQUIPPED</Text>
                            </View>
                          ) : (
                            <Text style={styles.tapEquipText}>EQUIP</Text>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}

                  {[
                    { id: 'so1', name: 'High Neon Socks', rarity: 'EPIC', grad: ['#A855F7', '#7E22CE'], icon: 'shapes-outline' },
                    { id: 'so2', name: 'Compression Socks', rarity: 'RARE', grad: ['#00F2FE', '#0284C7'], icon: 'shield-outline' },
                    { id: 'so3', name: 'Flame Pattern Socks', rarity: 'EPIC', grad: ['#A855F7', '#6B21A8'], icon: 'flame-outline' },
                    { id: 'so4', name: 'Ankle Stealth Socks', rarity: 'RARE', grad: ['#00F2FE', '#0369A1'], icon: 'flash-outline' },
                  ].map((so) => {
                    const isSelected = selectedSock === so.name;
                    return (
                      <TouchableOpacity
                        key={so.id}
                        style={[styles.ffVaultCard, isSelected && styles.ffVaultCardEquipped]}
                        onPress={() => handleSockSelect(so.name)}
                        activeOpacity={0.85}
                      >
                        <LinearGradient colors={so.grad} style={styles.rarityHeaderBar}>
                          <Text style={styles.rarityText}>{so.rarity}</Text>
                        </LinearGradient>
                        <View style={styles.ffCardInner}>
                          <Ionicons name={so.icon as any} size={22} color={so.grad[0]} style={{ marginVertical: 6 }} />
                          <Text style={styles.ffCardName} numberOfLines={1}>{so.name}</Text>
                          {isSelected ? (
                            <View style={styles.equippedBadge}>
                              <Ionicons name="checkmark-circle" size={10} color="#00F2FE" />
                              <Text style={styles.equippedText}>EQUIPPED</Text>
                            </View>
                          ) : (
                            <Text style={styles.tapEquipText}>EQUIP</Text>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}

                  <TouchableOpacity
                    style={[styles.ffVaultCard, styles.ffVaultCardAdd]}
                    onPress={() => {
                      setItemType('Socks');
                      setShowAddModal(true);
                    }}
                    activeOpacity={0.85}
                  >
                    <LinearGradient colors={['rgba(0, 242, 254, 0.3)', 'rgba(168, 85, 247, 0.3)']} style={styles.rarityHeaderBar}>
                      <Text style={[styles.rarityText, { color: '#00F2FE' }]}>ADD NEW</Text>
                    </LinearGradient>
                    <View style={styles.ffCardInner}>
                      <Ionicons name="add-circle-outline" size={24} color="#00F2FE" style={{ marginVertical: 6 }} />
                      <Text style={[styles.ffCardName, { color: '#00F2FE' }]} numberOfLines={1}>ADD SOCKS</Text>
                      <Text style={styles.tapEquipText}>TAP TO ADD</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* 8. EMOTES */}
            {activeTab === 'Emotes' && (
              <View style={styles.panelBlock}>
                <View style={styles.panelHeaderRow}>
                  <Text style={styles.panelTitle}>3D EMOTES & DANCE ANIMATIONS</Text>
                  <Text style={styles.panelCount}>
                    {5 + customVaultItems.filter(i => i.type === 'Emote').length} EMOTES
                  </Text>
                </View>

                <View style={styles.vaultGrid}>
                  {/* BUILT-IN PRESET 3D EMOTES */}
                  {[
                    { id: 'e1', name: 'Dance', title: 'Cyber Dance', rarity: 'LEGENDARY', grad: ['#FFD700', '#B8860B'], icon: 'flash-outline' },
                    { id: 'e2', name: 'Flex', title: 'Power Flex', rarity: 'EPIC', grad: ['#A855F7', '#7E22CE'], icon: 'flame-outline' },
                    { id: 'e3', name: 'Wave', title: 'Greetings Wave', rarity: 'RARE', grad: ['#00F2FE', '#0284C7'], icon: 'hand-left-outline' },
                    { id: 'e4', name: 'PowerUp', title: 'Aura PowerUp', rarity: 'LEGENDARY', grad: ['#FFD700', '#D97706'], icon: 'trophy-outline' },
                    { id: 'e5', name: 'Talking', title: 'Speech Motion', rarity: 'EPIC', grad: ['#A855F7', '#6B21A8'], icon: 'mic-outline' },
                  ].map((e) => {
                    const isSelected = selectedEmote === e.name;
                    return (
                      <TouchableOpacity
                        key={e.id}
                        style={[styles.ffVaultCard, isSelected && styles.ffVaultCardEquipped]}
                        onPress={() => playEmote(e.name)}
                        activeOpacity={0.85}
                      >
                        <LinearGradient colors={e.grad} style={styles.rarityHeaderBar}>
                          <Text style={styles.rarityText}>{e.rarity}</Text>
                        </LinearGradient>
                        <View style={styles.ffCardInner}>
                          <Ionicons name={e.icon as any} size={22} color={e.grad[0]} style={{ marginVertical: 6 }} />
                          <Text style={styles.ffCardName} numberOfLines={1}>{e.title}</Text>
                          {isSelected ? (
                            <View style={styles.equippedBadge}>
                              <Ionicons name="play-circle" size={10} color="#00F2FE" />
                              <Text style={styles.equippedText}>PLAYING</Text>
                            </View>
                          ) : (
                            <Text style={styles.tapEquipText}>PLAY</Text>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}

                  {/* ➕ UPLOAD REAL EMOTE CARD */}
                  <TouchableOpacity
                    style={[styles.ffVaultCard, styles.ffVaultCardAdd]}
                    onPress={() => {
                      setItemType('Emote');
                      setShowAddModal(true);
                    }}
                    activeOpacity={0.85}
                  >
                    <LinearGradient colors={['rgba(0, 242, 254, 0.3)', 'rgba(168, 85, 247, 0.3)']} style={styles.rarityHeaderBar}>
                      <Text style={[styles.rarityText, { color: '#00F2FE' }]}>UPLOAD EMOTE</Text>
                    </LinearGradient>
                    <View style={styles.ffCardInner}>
                      <Ionicons name="add-circle-outline" size={24} color="#00F2FE" style={{ marginVertical: 6 }} />
                      <Text style={[styles.ffCardName, { color: '#00F2FE' }]} numberOfLines={1}>ADD EMOTE (.FBX)</Text>
                      <Text style={styles.tapEquipText}>TAP TO UPLOAD</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* 9. VAULT */}
            {activeTab === 'Vault' && (
              <View style={styles.panelBlock}>
                <View style={styles.panelHeaderRow}>
                  <Text style={styles.panelTitle}>SERVER 3D VAULT STORE</Text>
                  <Text style={styles.panelCount}>{customVaultItems.length} ASSETS</Text>
                </View>

                {/* GRID OF ALL SERVER UPLOADED ASSETS */}
                <View style={styles.vaultGrid}>
                  {customVaultItems.map((item) => {
                    const isSelected = selectedVaultItemId === item.id;
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[styles.ffVaultCard, isSelected && styles.ffVaultCardEquipped]}
                        onPress={() => {
                          setSelectedVaultItemId(item.id);
                          setActiveSelectedItem(item);
                          if (item.type === 'Emote' || (item.uri && item.uri.endsWith('.fbx'))) {
                            engineRef.current?.loadCustomEmote(item.uri);
                          } else {
                            engineRef.current?.loadCustomModel(item.uri);
                          }
                        }}
                        activeOpacity={0.85}
                      >
                        <LinearGradient colors={['#A855F7', '#00F2FE']} style={styles.rarityHeaderBar}>
                          <Text style={styles.rarityText}>{item.type ? item.type.toUpperCase() : '3D ASSET'}</Text>
                        </LinearGradient>
                        <View style={styles.ffCardInner}>
                          {item.image ? (
                            <Image source={{ uri: item.image }} style={styles.cardThumbnailImage} />
                          ) : (
                            <Ionicons
                              name={item.type === 'Emote' || (item.uri && item.uri.endsWith('.fbx')) ? "sparkles-outline" : "cube-outline"}
                              size={24}
                              color="#00F2FE"
                              style={{ marginVertical: 6 }}
                            />
                          )}
                          <Text style={styles.ffCardName} numberOfLines={1}>{item.name}</Text>
                          {isSelected ? (
                            <View style={styles.equippedBadge}>
                              <Ionicons name="checkmark-circle" size={10} color="#00F2FE" />
                              <Text style={styles.equippedText}>ACTIVE</Text>
                            </View>
                          ) : (
                            <Text style={styles.tapEquipText}>EQUIP</Text>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}

                  <TouchableOpacity
                    style={[styles.ffVaultCard, styles.ffVaultCardAdd]}
                    onPress={() => {
                      setItemType('Avatar');
                      setShowAddModal(true);
                    }}
                    activeOpacity={0.85}
                  >
                    <LinearGradient colors={['rgba(0, 242, 254, 0.3)', 'rgba(168, 85, 247, 0.3)']} style={styles.rarityHeaderBar}>
                      <Text style={[styles.rarityText, { color: '#00F2FE' }]}>UPLOAD 3D</Text>
                    </LinearGradient>
                    <View style={styles.ffCardInner}>
                      <Ionicons name="add-circle-outline" size={24} color="#00F2FE" style={{ marginVertical: 6 }} />
                      <Text style={[styles.ffCardName, { color: '#00F2FE' }]} numberOfLines={1}>ADD NEW</Text>
                      <Text style={styles.tapEquipText}>TAP TO UPLOAD</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      )}

      {/* ADD CUSTOM MODEL / UPLOAD MODAL */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={styles.modalBg}>
          <ScrollView contentContainerStyle={styles.modalScrollContent}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeaderRow}>
                <Text style={styles.modalTitle}>ADD NEW 3D ITEM TO VAULT</Text>
                <TouchableOpacity onPress={() => setShowAddModal(false)}>
                  <Ionicons name="close-circle-outline" size={24} color="#888" />
                </TouchableOpacity>
              </View>

              {/* ITEM TYPE CATEGORY SELECTOR */}
              <Text style={styles.inputLabel}>SELECT ITEM CATEGORY</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                <View style={styles.typeSelectorRow}>
                  {[
                    { id: 'Hair', label: 'HAIR', icon: 'sparkles-outline' },
                    { id: 'Shirt', label: 'SHIRT', icon: 'shirt-outline' },
                    { id: 'Pant', label: 'PANTS', icon: 'man-outline' },
                    { id: 'Gear', label: 'GEAR', icon: 'glasses-outline' },
                    { id: 'Shoes', label: 'SHOES', icon: 'footsteps-outline' },
                    { id: 'Socks', label: 'SOCKS', icon: 'shapes-outline' },
                    { id: 'Bundle', label: 'BUNDLE', icon: 'cube-outline' },
                    { id: 'Emote', label: 'EMOTE', icon: 'flash-outline' },
                    { id: 'Avatar', label: 'AVATAR', icon: 'person-outline' },
                  ].map((t) => {
                    const isSelected = itemType === t.id;
                    return (
                      <TouchableOpacity
                        key={t.id}
                        style={[styles.typeBtn, isSelected && styles.typeBtnActive]}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                          setItemType(t.id as any);
                        }}
                      >
                        <Ionicons name={t.icon as any} size={14} color={isSelected ? '#00F2FE' : '#888'} />
                        <Text style={[styles.typeBtnText, isSelected && { color: '#00F2FE' }]}>{t.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>

              {/* FILE PICKER BOX */}
              <TouchableOpacity style={styles.filePickerBox} onPress={pick3DModelFile} activeOpacity={0.8}>
                <Ionicons name={selectedFile ? "checkmark-circle" : "folder-open-outline"} size={28} color="#00F2FE" />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.filePickerTitle} numberOfLines={1}>
                    {selectedFile ? selectedFile.name : `SELECT 3D ${itemType.toUpperCase()} FILE (.GLB / .FBX)`}
                  </Text>
                  <Text style={styles.filePickerSub}>
                    {selectedFile ? `${(selectedFile.size / (1024*1024)).toFixed(1)} MB • Tap to change` : `Choose 3D .glb / .fbx file for ${itemType} from phone storage`}
                  </Text>
                </View>
              </TouchableOpacity>

              <Text style={styles.inputLabel}>OR PASTE 3D MODEL URL (.GLB / .FBX)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="http://192.168.31.39:8085/avatar/models/model.glb"
                placeholderTextColor="#555"
                value={customModelUrl}
                onChangeText={setCustomModelUrl}
                autoCapitalize="none"
              />

              <Text style={styles.inputLabel}>ITEM NAME</Text>
              <TextInput
                style={styles.modalInput}
                placeholder={`e.g. Cyber ${itemType}`}
                placeholderTextColor="#555"
                value={customModelName}
                onChangeText={setCustomModelName}
              />

              <Text style={styles.inputLabel}>PRIVACY & PUBLISHING</Text>
              <View style={styles.privacyRow}>
                {[
                  { id: 'PRIVATE', label: 'PRIVATE', desc: 'Me Only (FREE)', icon: 'lock-closed-outline' },
                  { id: 'FRIENDS', label: 'FRIENDS', desc: 'Friends (290 💎)', icon: 'people-outline' },
                  { id: 'PUBLIC', label: 'PUBLIC', desc: 'Public (590+ 💎)', icon: 'globe-outline' },
                ].map((p) => {
                  const isSelected = privacy === p.id;
                  return (
                    <TouchableOpacity
                      key={p.id}
                      style={[styles.privacyBtn, isSelected && styles.privacyBtnActive]}
                      onPress={() => handlePrivacyChange(p.id as any)}
                    >
                      <Ionicons name={p.icon as any} size={14} color={isSelected ? '#00F2FE' : '#888'} />
                      <Text style={[styles.privacyBtnText, isSelected && { color: '#00F2FE' }]}>{p.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {privacy === 'PUBLIC' && (
                <View style={{ marginBottom: 16 }}>
                  <Text style={styles.inputLabel}>SET DIAMOND PRICE 💎 (MINIMUM 590 💎)</Text>
                  <TextInput
                    style={[styles.modalInput, { borderColor: '#00F2FE', backgroundColor: 'rgba(0,242,254,0.06)' }]}
                    placeholder="590"
                    placeholderTextColor="#555"
                    value={diamondPriceInput}
                    onChangeText={setDiamondPriceInput}
                    keyboardType="numeric"
                  />
                </View>
              )}

              {privacy === 'FRIENDS' && (
                <View style={styles.friendsPriceBadge}>
                  <Ionicons name="people" size={16} color="#00F2FE" />
                  <Text style={styles.friendsPriceText}>
                    FRIENDS VAULT: <Text style={{ color: '#00F2FE', fontWeight: '900' }}>290 DIAMONDS 💎 (SET)</Text>
                  </Text>
                </View>
              )}

              {privacy === 'PRIVATE' && (
                <View style={styles.privateFreeBadge}>
                  <Ionicons name="lock-closed" size={16} color="#10B981" />
                  <Text style={styles.privateFreeText}>
                    PRIVATE VAULT: <Text style={{ color: '#10B981', fontWeight: '900' }}>100% FREE (0 💎)</Text>
                  </Text>
                </View>
              )}

              <View style={styles.balanceBar}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                  <Ionicons name="diamond" size={14} color="#00F2FE" />
                  <Text style={styles.balanceText}>
                    BALANCE: <Text style={{ color: '#00F2FE', fontWeight: '900' }}>{userDiamonds} 💎</Text>
                  </Text>
                </View>

                <TouchableOpacity style={styles.topUpBtn} onPress={handleTopUpDiamonds} activeOpacity={0.8}>
                  <LinearGradient colors={['#A855F7', '#00F2FE']} style={styles.topUpBtnGradient}>
                    <Text style={styles.topUpBtnText}>+500 💎</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              <View style={styles.modalBtnRow}>
                <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowAddModal(false)}>
                  <Text style={styles.modalCancelText}>CANCEL</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.modalSubmitBtn} onPress={handleUploadAndSaveModel}>
                  <LinearGradient colors={['#A855F7', '#00F2FE']} style={styles.modalSubmitGradient}>
                    <Text style={styles.modalSubmitText}>SAVE & SYNC STAGE</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#030308',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#05050A',
    borderBottomWidth: 1,
    borderBottomColor: '#12121E',
  },
  headerBtn: {
    padding: 6,
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1.5,
  },
  headerSub: {
    fontSize: 9,
    fontWeight: '700',
    color: '#00F2FE',
    letterSpacing: 1,
  },
  saveBtn: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  saveBtnGradient: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  saveBtnText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  previewStage: {
    height: 320,
    position: 'relative',
    backgroundColor: '#030308',
  },
  previewStageFullscreen: {
    flex: 1,
    height: '100%',
  },
  fullscreenBtn: {
    position: 'absolute',
    top: 15,
    right: 15,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(10, 10, 18, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 254, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 25,
    elevation: 5,
  },
  hudDetailCard: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 170,
    backgroundColor: 'rgba(10, 10, 20, 0.88)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 254, 0.4)',
    padding: 10,
    zIndex: 20
  },
  hudHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6
  },
  genderPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1
  },
  genderPillText: {
    fontSize: 7.5,
    fontWeight: '900',
    letterSpacing: 0.5
  },
  discountTag: {
    backgroundColor: '#FF0055',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 5
  },
  discountTagText: {
    color: '#FFF',
    fontSize: 7,
    fontWeight: '900'
  },
  hudTitle: {
    color: '#00F2FE',
    fontSize: 8.5,
    fontWeight: '900',
    letterSpacing: 0.5
  },
  hudDesc: {
    color: '#AAA',
    fontSize: 7.5,
    fontWeight: '700',
    marginTop: 2,
    marginBottom: 6
  },
  hudPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  hudPriceMain: {
    color: '#00F2FE',
    fontSize: 11,
    fontWeight: '900'
  },
  hudPriceOrig: {
    color: '#777',
    fontSize: 9,
    textDecorationLine: 'line-through'
  },
  genderBadgeOverlay: {
    position: 'absolute',
    top: 15,
    left: 15,
    flexDirection: 'row',
    gap: 8,
    zIndex: 20,
  },
  genderMiniBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(10, 10, 18, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  genderMiniBtnActive: {
    borderColor: 'rgba(0, 242, 254, 0.5)',
    backgroundColor: 'rgba(0, 242, 254, 0.15)',
  },
  genderMiniText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#666',
    letterSpacing: 1,
  },
  loadingOverlay: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#00F2FE',
    marginBottom: 6,
    letterSpacing: 1,
  },
  progressBarTrack: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#A855F7',
  },
  errorBox: {
    position: 'absolute',
    top: 15,
    left: 15,
    right: 15,
    backgroundColor: 'rgba(255,0,50,0.2)',
    borderWidth: 1,
    borderColor: '#FF4D4D',
    borderRadius: 10,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  errorText: {
    color: '#FF4D4D',
    fontSize: 11,
    flex: 1,
  },
  talkingTestBtn: {
    position: 'absolute',
    bottom: 20,
    right: 16,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 5,
  },
  talkingTestBtnActive: {
    shadowColor: '#FF2E93',
    shadowRadius: 10,
    shadowOpacity: 0.8,
  },
  talkingBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  talkingBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  vaultContainer: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#080810',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: -12,
    overflow: 'hidden',
  },
  navRail: {
    width: 68,
    backgroundColor: '#05050A',
    borderRightWidth: 1,
    borderRightColor: '#12121E',
    alignItems: 'center',
  },
  navRailItem: {
    width: 58,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    position: 'relative',
    overflow: 'hidden',
  },
  navRailItemActive: {
    backgroundColor: '#0D0D1A',
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 254, 0.4)',
  },
  navRailLabel: {
    fontSize: 6.5,
    fontWeight: '800',
    color: '#666',
    marginTop: 3,
    letterSpacing: 0.5,
  },
  navRailLabelActive: {
    color: '#00F2FE',
  },
  activeGlowIndicator: {
    position: 'absolute',
    left: 0,
    top: 10,
    bottom: 10,
    width: 3,
    backgroundColor: '#00F2FE',
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
  vaultContent: {
    flex: 1,
  },
  vaultContentBody: {
    padding: 12,
    paddingBottom: 60,
  },
  panelBlock: {
    marginBottom: 20,
  },
  panelHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  panelTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#A0A0B0',
    letterSpacing: 1,
  },
  panelCount: {
    fontSize: 9,
    fontWeight: '800',
    color: '#00F2FE',
    letterSpacing: 1,
  },
  vaultGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  ffVaultCard: {
    width: '31%',
    backgroundColor: '#0E0E18',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#181828',
    overflow: 'hidden',
    position: 'relative',
  },
  ffVaultCardEquipped: {
    borderColor: '#00F2FE',
    backgroundColor: '#121224',
  },
  ffVaultCardAdd: {
    borderColor: 'rgba(0, 242, 254, 0.4)',
    borderStyle: 'dashed',
    backgroundColor: 'rgba(0, 242, 254, 0.05)',
  },
  rarityHeaderBar: {
    paddingVertical: 2,
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  rarityText: {
    color: '#000',
    fontSize: 6.5,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  ffCardInner: {
    padding: 6,
    alignItems: 'center',
  },
  cardThumbnailImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
    marginVertical: 4,
    resizeMode: 'cover',
  },
  vaultListThumbnail: {
    width: 36,
    height: 36,
    borderRadius: 8,
    resizeMode: 'cover',
  },
  ffCardName: {
    color: '#FFFFFF',
    fontSize: 8.5,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 4,
  },
  equippedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(0, 242, 254, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  equippedText: {
    color: '#00F2FE',
    fontSize: 6.5,
    fontWeight: '900',
  },
  tapEquipText: {
    color: '#666',
    fontSize: 7,
    fontWeight: '800',
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  colorDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorDotActive: {
    borderColor: '#00F2FE',
    transform: [{ scale: 1.15 }],
  },
  addModelCard: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 254, 0.4)',
  },
  addModelGradient: {
    padding: 16,
    alignItems: 'center',
  },
  addModelTitle: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    marginTop: 6,
  },
  addModelSub: {
    color: '#888',
    fontSize: 9,
    marginTop: 2,
  },
  serverModelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0E0E18',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#181828',
    marginBottom: 8,
  },
  serverModelName: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '800',
  },
  serverModelUrl: {
    color: '#666',
    fontSize: 8,
    marginTop: 2,
  },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.88)',
    justifyContent: 'center',
    padding: 16,
  },
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  modalCard: {
    backgroundColor: '#0F0F1A',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 254, 0.3)',
    padding: 20,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
  },
  typeSelectorRow: {
    flexDirection: 'row',
    gap: 8,
  },
  typeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#161626',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#262638',
  },
  typeBtnActive: {
    borderColor: '#00F2FE',
    backgroundColor: 'rgba(0, 242, 254, 0.12)',
  },
  typeBtnText: {
    color: '#888',
    fontSize: 9,
    fontWeight: '900',
  },
  filePickerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161626',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 254, 0.4)',
    borderStyle: 'dashed',
    marginBottom: 16,
  },
  filePickerTitle: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '800',
  },
  filePickerSub: {
    color: '#888',
    fontSize: 9,
    marginTop: 2,
  },
  inputLabel: {
    color: '#A0A0B0',
    fontSize: 9,
    fontWeight: '800',
    marginBottom: 6,
    letterSpacing: 1,
  },
  modalInput: {
    backgroundColor: '#161626',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#262638',
    color: '#FFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 11,
    marginBottom: 14,
  },
  privacyRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  privacyBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#161626',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#262638',
  },
  privacyBtnActive: {
    borderColor: '#00F2FE',
    backgroundColor: 'rgba(0, 242, 254, 0.12)',
  },
  privacyBtnText: {
    color: '#888',
    fontSize: 9,
    fontWeight: '900',
  },
  friendsPriceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 242, 254, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 254, 0.3)',
    marginBottom: 16,
  },
  friendsPriceText: {
    color: '#AAA',
    fontSize: 9.5,
    fontWeight: '800',
  },
  privateFreeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    marginBottom: 16,
  },
  privateFreeText: {
    color: '#AAA',
    fontSize: 9.5,
    fontWeight: '800',
  },
  balanceBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 242, 254, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 254, 0.2)',
  },
  balanceText: {
    color: '#AAA',
    fontSize: 10,
    fontWeight: '800',
  },
  topUpBtn: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  topUpBtnGradient: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  topUpBtnText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '900',
  },
  modalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  modalCancelText: {
    color: '#888',
    fontSize: 11,
    fontWeight: '800',
  },
  modalSubmitBtn: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalSubmitGradient: {
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  modalSubmitText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '900',
  },
});
