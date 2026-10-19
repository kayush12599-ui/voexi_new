import { SERVER_IP, AVATAR_SERVER_PORT } from '../../constants/config';

export const VOEXI_SKELETON_CONTRACT = 'VOEXI_SKELETON_V1';

export type AssetType =
  | 'BASE_AVATAR'
  | 'HAIR'
  | 'TOP'
  | 'PANTS'
  | 'SHOES'
  | 'SOCKS'
  | 'GEAR'
  | 'ACCESSORY'
  | 'EMOTE'
  | 'BUNDLE';

export interface AvatarAsset {
  id: string;
  name: string;
  type: AssetType;
  category: string;
  genderCompatibility: 'MALE' | 'FEMALE' | 'UNISEX';
  assetUrl: string;
  thumbnailUrl?: string;
  skeletonVersion: typeof VOEXI_SKELETON_CONTRACT;
  version: string;
  sizeBytes?: number;
  metadata?: Record<string, any>;
  enabled: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface EquippedState {
  avatarId: string;
  gender: 'Male' | 'Female';
  hairId?: string;
  topId?: string;
  pantsId?: string;
  shoesId?: string;
  socksId?: string;
  gearId?: string;
  accessoryIds: string[];
  activeEmoteId?: string;
  topColor?: string;
  bottomColor?: string;
  hairColor?: string;
  gearColor?: string;
  shoesColor?: string;
  socksColor?: string;
  updatedAt?: string;
}

export interface BundlePreset {
  id: string;
  name: string;
  rarity: 'LEGENDARY' | 'EPIC' | 'RARE' | 'COMMON';
  topColor: string;
  bottomColor: string;
  hairId?: string;
  topId?: string;
  pantsId?: string;
  shoesId?: string;
  socksId?: string;
  gearId?: string;
}

const SERVER_BASE = `http://${SERVER_IP}:${AVATAR_SERVER_PORT}`;

export const DEFAULT_EQUIPPED_STATE: EquippedState = {
  avatarId: 'avatar_male_v1',
  gender: 'Male',
  hairId: 'hair_cyber_spikes',
  topId: 'shirt_cyber_jacket',
  pantsId: 'pant_cyber_joggers',
  shoesId: 'shoe_cyber_kicks',
  socksId: 'sock_high_neon',
  gearId: 'gear_cyber_visor',
  accessoryIds: [],
  activeEmoteId: 'emote_idle',
  topColor: '#A855F7',
  bottomColor: '#00F2FE',
  hairColor: '#A855F7',
  gearColor: '#00F2FE',
  shoesColor: '#FFFFFF',
  socksColor: '#00F2FE',
};

export const DEFAULT_BUNDLES: BundlePreset[] = [
  {
    id: 'bundle_cyberpunk_legend',
    name: 'Cyberpunk Legend',
    rarity: 'LEGENDARY',
    topColor: '#A855F7',
    bottomColor: '#00F2FE',
    hairId: 'hair_cyber_spikes',
    topId: 'shirt_cyber_jacket',
    pantsId: 'pant_cyber_joggers',
    gearId: 'gear_cyber_visor',
    shoesId: 'shoe_cyber_kicks',
    socksId: 'sock_high_neon',
  },
  {
    id: 'bundle_neon_phantom',
    name: 'Neon Phantom',
    rarity: 'EPIC',
    topColor: '#EC4899',
    bottomColor: '#3B82F6',
    hairId: 'hair_anime_long',
    topId: 'shirt_crimson_hoodie',
    pantsId: 'pant_denim',
    gearId: 'gear_cyber_wings',
    shoesId: 'shoe_booster_runners',
  },
];

export const DEFAULT_ASSET_REGISTRY: AvatarAsset[] = [
  {
    id: 'avatar_male_v1',
    name: 'Male 3D Avatar',
    type: 'BASE_AVATAR',
    category: 'Avatar',
    genderCompatibility: 'MALE',
    assetUrl: `${SERVER_BASE}/avatar/models/male_human_3d_model.glb`,
    skeletonVersion: VOEXI_SKELETON_CONTRACT,
    version: '1.0.0',
    sizeBytes: 62180000,
    enabled: true,
  },
];

export class AvatarAssetRegistry {
  private static assetsMap = new Map<string, AvatarAsset>(
    DEFAULT_ASSET_REGISTRY.map((a) => [a.id, a])
  );
  private static customVaultItems = new Map<string, any>();

  public static getAssetById(id: string): AvatarAsset | undefined {
    return this.assetsMap.get(id);
  }

  public static getAssetsByType(type: AssetType): AvatarAsset[] {
    return Array.from(this.assetsMap.values()).filter(
      (a) => a.type === type && a.enabled
    );
  }

  public static registerAsset(asset: AvatarAsset): void {
    this.assetsMap.set(asset.id, asset);
  }

  public static registerCustomVaultItem(item: any): void {
    if (!item) return;
    const id = item.id || item.filename || item.name;
    if (id) {
      this.customVaultItems.set(id, item);
      const assetUrl = item.uri || item.assetUrl || '';
      if (assetUrl) {
        let normType: AssetType = 'BASE_AVATAR';
        const typeStr = String(item.type || item.category || '').toUpperCase();
        if (typeStr === 'SHIRT' || typeStr === 'TOP') normType = 'TOP';
        else if (typeStr === 'PANT' || typeStr === 'PANTS') normType = 'PANTS';
        else if (typeStr === 'SHOES') normType = 'SHOES';
        else if (typeStr === 'SOCKS') normType = 'SOCKS';
        else if (typeStr === 'HAIR') normType = 'HAIR';
        else if (typeStr === 'GEAR') normType = 'GEAR';
        else if (typeStr === 'EMOTE') normType = 'EMOTE';
        else if (typeStr === 'BUNDLE') normType = 'BUNDLE';

        this.registerAsset({
          id,
          name: item.name || id,
          type: normType,
          category: item.category || item.type || 'Custom',
          genderCompatibility:
            item.gender_target === 'FEMALE'
              ? 'FEMALE'
              : item.gender_target === 'MALE'
              ? 'MALE'
              : 'UNISEX',
          assetUrl,
          thumbnailUrl: item.image,
          skeletonVersion: VOEXI_SKELETON_CONTRACT,
          version: '1.0.0',
          enabled: true,
          metadata: item,
        });
      }
    }
  }

  public static getCustomVaultItems(): any[] {
    return Array.from(this.customVaultItems.values());
  }
}
