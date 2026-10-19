
export interface CardTheme {
  id: string;
  name: string;
  colors: string[];
  glowColor: string;
  textColor: string;
  borderColor: string;
  chipColor: string;
  badgeColors: string[];
  pattern: 'fire' | 'nebula' | 'hexagon' | 'topo' | 'luxury' | 'circuit' | 'sparks' | 'gloss' | 'spiral' | 'crystals' | 'camo' | 'matrix' | 'mind' | 'motion' | 'none';
}

const generateSeries = (prefix: string, baseName: string, colors: string[][], pattern: any): CardTheme[] => {
  return colors.map((c, i) => ({
    id: `${prefix}-${i}`,
    name: `${baseName} ${i + 1}`,
    colors: [c[0], '#000'],
    glowColor: c[0],
    textColor: '#fff',
    borderColor: c[0],
    chipColor: '#FFD700',
    badgeColors: [c[0], c[1] || '#000'],
    pattern
  }));
};

const GALAXY_COLORS = [['#409', '#204'], ['#049', '#024'], ['#904', '#402'], ['#094', '#042'], ['#449', '#224'], ['#944', '#422'], ['#494', '#242'], ['#990', '#440'], ['#099', '#044'], ['#909', '#404']];
const TECH_COLORS = [['#0f0', '#030'], ['#0ff', '#033'], ['#f0f', '#303'], ['#ff0', '#330'], ['#f00', '#300'], ['#00f', '#003'], ['#fff', '#333'], ['#a0f', '#305'], ['#fa0', '#530'], ['#0fa', '#035']];
const GEM_COLORS = [['#e91e63', '#880e4f'], ['#9c27b0', '#4a148c'], ['#673ab7', '#311b92'], ['#3f51b5', '#1a237e'], ['#2196f3', '#0d47a1'], ['#03a9f4', '#01579b'], ['#00bcd4', '#006064'], ['#009688', '#004d40'], ['#4caf50', '#1b5e20'], ['#8bc34a', '#33691e']];

export const CARD_THEMES: CardTheme[] = [
  // --- ORIGINALS (Match Image) ---
  { id: 'fire-red', name: 'Inferno Fire', colors: ['#2b0000', '#000'], glowColor: '#f00', textColor: '#fff', borderColor: '#f00', chipColor: '#FFD700', badgeColors: ['#f00', '#600'], pattern: 'fire' },
  { id: 'ice-shards', name: 'Glacier Shards', colors: ['#001d3d', '#003566'], glowColor: '#48cae4', textColor: '#fff', borderColor: '#90e0ef', chipColor: '#fff', badgeColors: ['#48cae4', '#0077b6'], pattern: 'crystals' },
  { id: 'deep-space', name: 'Deep Space', colors: ['#000', '#001a33'], glowColor: '#007bff', textColor: '#fff', borderColor: '#007bff', chipColor: '#FFD700', badgeColors: ['#007bff', '#001d3d'], pattern: 'nebula' },
  { id: 'hexa-tech', name: 'Hexa Cyber', colors: ['#12001a', '#000'], glowColor: '#7b2cbf', textColor: '#fff', borderColor: '#9d4edd', chipColor: '#FFD700', badgeColors: ['#9d4edd', '#3c096c'], pattern: 'hexagon' },
  { id: 'topographic', name: 'Topographic', colors: ['#001a00', '#000'], glowColor: '#38b000', textColor: '#fff', borderColor: '#70e000', chipColor: '#FFD700', badgeColors: ['#38b000', '#004b23'], pattern: 'topo' },
  { id: 'luxury-gold', name: 'Royal Gold', colors: ['#1c1912', '#000'], glowColor: '#ffb703', textColor: '#ffb703', borderColor: '#fb8500', chipColor: '#fff', badgeColors: ['#ffb703', '#8a5a00'], pattern: 'luxury' },
  { id: 'circuit-board', name: 'Circuit Board', colors: ['#001a1a', '#000'], glowColor: '#00f5d4', textColor: '#fff', borderColor: '#00f5d4', chipColor: '#FFD700', badgeColors: ['#00f5d4', '#00b4d8'], pattern: 'circuit' },
  { id: 'matrix-hacker', name: 'Matrix Rain', colors: ['#000a00', '#000'], glowColor: '#00ff41', textColor: '#0f0', borderColor: '#00ff41', chipColor: '#0f0', badgeColors: ['#00ff41', '#003b00'], pattern: 'matrix' },
  { id: 'psychological-glow', name: 'Neural Psychic', colors: ['#05001a', '#000'], glowColor: '#00F2FE', textColor: '#fff', borderColor: '#7C5CFF', chipColor: '#00F2FE', badgeColors: ['#7C5CFF', '#00F2FE'], pattern: 'mind' },
  { id: 'mind-control', name: 'Neural Overlord', colors: ['#1a0000', '#000'], glowColor: '#f00', textColor: '#f00', borderColor: '#f00', chipColor: '#fff', badgeColors: ['#f00', '#300'], pattern: 'mind' },
  { id: 'deep-hypnosis', name: 'Hypnotic Void', colors: ['#000', '#050505'], glowColor: '#A855F7', textColor: '#fff', borderColor: '#A855F7', chipColor: '#A855F7', badgeColors: ['#A855F7', '#2e1065'], pattern: 'mind' },
  { id: 'psycho-pulse', name: 'Brainwave Pulse', colors: ['#001a1a', '#000'], glowColor: '#38ef7d', textColor: '#fff', borderColor: '#11998e', chipColor: '#38ef7d', badgeColors: ['#11998e', '#064e3b'], pattern: 'mind' },

  // --- GENERATED CATEGORIES ---
  ...generateSeries('galaxy-nebula', 'Cosmic Nebula', GALAXY_COLORS, 'nebula'),
  ...generateSeries('galaxy-spiral', 'Spiral Galaxy', GALAXY_COLORS, 'spiral'),
  ...generateSeries('tech-hexa', 'Cyber Hex', TECH_COLORS, 'hexagon'),
  ...generateSeries('tech-circuit', 'Nano Circuit', TECH_COLORS, 'circuit'),
  ...generateSeries('tech-matrix', 'Binary Code', TECH_COLORS, 'matrix'),
  ...generateSeries('nature-topo', 'Eco Topo', GEM_COLORS, 'topo'),
  ...generateSeries('nature-lava', 'Volcanic', [['#f40', '#800'], ['#f60', '#920'], ['#f20', '#600']], 'fire'),
  ...generateSeries('nature-ice', 'Arctic Cryo', [['#0af', '#058'], ['#0cf', '#06a'], ['#5ef', '#28a']], 'crystals'),
  ...generateSeries('luxury-elite', 'Prestige', [['#ffd700', '#aa8800'], ['#c0c0c0', '#888888'], ['#b87333', '#663311']], 'luxury'),
  ...generateSeries('luxury-gloss', 'Gloss Premium', TECH_COLORS, 'gloss'),
  ...generateSeries('gem-ruby', 'Ruby Series', GEM_COLORS, 'crystals'),
  ...generateSeries('gem-emerald', 'Emerald Series', [['#0f0', '#050'], ['#2f2', '#151']], 'crystals'),
  ...generateSeries('gem-sapphire', 'Sapphire Series', [['#00f', '#005'], ['#22f', '#115']], 'crystals'),
  ...generateSeries('exotic-camo', 'Tactical Camo', [['#452', '#231'], ['#666', '#333'], ['#222', '#000']], 'camo'),
  ...generateSeries('exotic-sparks', 'Energy Sparks', TECH_COLORS, 'sparks'),
  ...generateSeries('special-spiral', 'Vortex', GALAXY_COLORS, 'spiral'),

  // Manual High-End Themes
  { id: 'dark-obsidian', name: 'Black Obsidian', colors: ['#050505', '#000'], glowColor: '#333', textColor: '#888', borderColor: '#222', chipColor: '#444', badgeColors: ['#111', '#000'], pattern: 'none' },
  { id: 'phantom-white', name: 'Phantom Ghost', colors: ['#fff', '#ddd'], glowColor: '#fff', textColor: '#333', borderColor: '#ccc', chipColor: '#aaa', badgeColors: ['#eee', '#bbb'], pattern: 'gloss' },
  { id: 'blood-moon', name: 'Blood Moon', colors: ['#300', '#000'], glowColor: '#f00', textColor: '#fff', borderColor: '#f00', chipColor: '#f00', badgeColors: ['#f00', '#200'], pattern: 'nebula' },
  { id: 'neon-toxic', name: 'Toxic Waste', colors: ['#0a0', '#000'], glowColor: '#cf0', textColor: '#cf0', borderColor: '#cf0', chipColor: '#cf0', badgeColors: ['#cf0', '#050'], pattern: 'sparks' },
  { id: 'royal-purple-elite', name: 'Monarch Purple', colors: ['#204', '#000'], glowColor: '#a0f', textColor: '#fff', borderColor: '#60a', chipColor: '#FFD700', badgeColors: ['#60a', '#204'], pattern: 'luxury' }
];

// Add massive library (Reaching 5000+ variants)
for(let i=0; i<1250; i++) {
    const hue = (i * 0.28) % 360;
    const patterns: any[] = ['circuit', 'hexagon', 'matrix', 'mind', 'motion', 'fire', 'nebula', 'topo', 'luxury', 'sparks', 'crystals'];

    // V1: Deep Saturation
    CARD_THEMES.push({
        id: `v1-auto-${i}`,
        name: `Quantum-X ${i+1}`,
        colors: [`hsl(${hue}, 80%, 10%)`, '#000'],
        glowColor: `hsl(${hue}, 90%, 50%)`,
        textColor: '#fff',
        borderColor: `hsl(${hue}, 80%, 30%)`,
        chipColor: `hsl(${hue}, 100%, 70%)`,
        badgeColors: [`hsl(${hue}, 80%, 40%)`, '#000'],
        pattern: patterns[i % patterns.length]
    });

    // V2: Pastels / Brights
    CARD_THEMES.push({
        id: `v2-auto-${i}`,
        name: `Ethereal ${i+1}`,
        colors: [`hsl(${hue + 45}, 40%, 15%)`, '#050505'],
        glowColor: `hsl(${hue + 45}, 60%, 60%)`,
        textColor: '#fff',
        borderColor: `hsl(${hue + 45}, 50%, 40%)`,
        chipColor: '#fff',
        badgeColors: [`hsl(${hue + 45}, 60%, 30%)`, '#111'],
        pattern: patterns[(i + 3) % patterns.length]
    });

    // V3: Metallic / Gold base
    CARD_THEMES.push({
        id: `v3-auto-${i}`,
        name: `Obsidian ${i+1}`,
        colors: [`hsl(${hue + 90}, 10%, 5%)`, '#000'],
        glowColor: `hsl(${hue + 90}, 100%, 40%)`,
        textColor: `hsl(${hue + 90}, 100%, 80%)`,
        borderColor: `hsl(${hue + 90}, 30%, 20%)`,
        chipColor: '#FFD700',
        badgeColors: [`hsl(${hue + 90}, 50%, 20%)`, '#000'],
        pattern: patterns[(i + 7) % patterns.length]
    });

    // V4: High Contrast
    CARD_THEMES.push({
        id: `v4-auto-${i}`,
        name: `Nova ${i+1}`,
        colors: [`hsl(${hue + 180}, 100%, 15%)`, '#000'],
        glowColor: `hsl(${hue + 180}, 100%, 50%)`,
        textColor: '#fff',
        borderColor: '#fff',
        chipColor: '#00F2FE',
        badgeColors: [`hsl(${hue + 180}, 100%, 40%)`, '#000'],
        pattern: patterns[(i + 2) % patterns.length]
    });
}

export const getThemeById = (id: string) => {
  return CARD_THEMES.find(t => t.id === id) || CARD_THEMES[0];
};
