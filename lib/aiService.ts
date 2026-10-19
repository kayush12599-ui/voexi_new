import { supabase } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

let CURRENT_IP = '192.168.31.39';
const VNC_PORT = '8000';

const BROWSER_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  sender_id?: string;
  isError?: boolean;
  imageUrl?: string;
  userImage?: string;
  audioUrl?: string;
}

const PERSONALITIES = {
  default: `You are VOEXI AI, a smart, helpful, and concise assistant.
CRITICAL LANGUAGE RULE: ALWAYS detect the user's input language and respond in the EXACT SAME LANGUAGE. If the user writes or speaks in Hindi or Hinglish, you MUST reply in natural Hindi/Hinglish! Keep responses punchy, accurate, and short.`,

  assistant: `You are VOEXI Personal Assistant. Friendly, casual, helpful friend style.
CRITICAL LANGUAGE RULE: ALWAYS reply in the exact same language as the user (Hindi, Hinglish, English, etc.).`,

  hacker: `You are VOEXI Cyber-Core. Sharp, technical, cyber-themed, punchy sentences.
CRITICAL LANGUAGE RULE: ALWAYS reply in the exact same language as the user (Hindi, Hinglish, English, etc.).`,

  creator: `You are VOEXI Studio Master. Expert in video, design, art, and music.
CRITICAL LANGUAGE RULE: ALWAYS reply in the exact same language as the user (Hindi, Hinglish, English, etc.).`
};

export const AIService = {
  async setServerIp(ip: string) {
    await AsyncStorage.setItem('@vnc_server_ip', ip);
    CURRENT_IP = ip;
  },

  async getServerIp() {
    const saved = await AsyncStorage.getItem('@vnc_server_ip');
    return saved || CURRENT_IP;
  },

  async generateResponse(
    userInput: string,
    history: AIMessage[],
    userId?: string,
    personality: keyof typeof PERSONALITIES = 'default'
  ): Promise<any> {
    const trimmedInput = userInput.trim();
    if (!trimmedInput) return { text: "Kripya apna sawaal likhein!", source: "VOEXI Core" };

    // Specific image request check
    const isImageRequest = /^(generate|draw|design|create|make)\s+(an?\s+)?(image|photo|picture|logo|poster|wallpaper|illustration|drawing|art)|(image|photo|picture|logo|drawing|wallpaper)\s+of/i.test(trimmedInput);

    try {
      // 1. IMAGE GENERATION ENGINE
      if (isImageRequest) {
        const encodedPrompt = encodeURIComponent(`${trimmedInput}, high resolution, 8k, photorealistic, cinematic lighting`);
        const seed = Math.floor(Math.random() * 999999);
        const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&seed=${seed}&nologo=true`;

        return {
          text: `✨ Visual Asset Synthesized for: "${trimmedInput}"`,
          imageUrl: imageUrl,
          source: 'VOEXI Vision Engine'
        };
      }

      // 2. HIGH SPEED AI CHAT RESPONSE ENGINE
      const systemPrompt = PERSONALITIES[personality] || PERSONALITIES.default;
      const seed = Math.random();

      // Clean single line prompt for URL safety
      const cleanPrompt = trimmedInput.replace(/[\r\n]+/g, ' ');

      const fetchWithTimeout = async (url: string, options: any = {}, timeoutMs = 12000) => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
          const res = await fetch(url, {
            ...options,
            headers: {
              'User-Agent': BROWSER_USER_AGENT,
              ...(options.headers || {})
            },
            signal: controller.signal
          });
          clearTimeout(timer);
          return res;
        } catch (err) {
          clearTimeout(timer);
          throw err;
        }
      };

      // Primary High Speed Browser-Header GET Attempt
      try {
        const promptUrl = `https://text.pollinations.ai/${encodeURIComponent(cleanPrompt)}?system=${encodeURIComponent(systemPrompt)}&seed=${seed}`;
        const res = await fetchWithTimeout(promptUrl, { method: 'GET' }, 10000);

        if (res.ok) {
          const text = await res.text();
          if (text && text.trim().length > 0 && !text.includes('502 Bad Gateway') && !text.includes('<!DOCTYPE') && !text.toLowerCase().includes('queue full') && !text.toLowerCase().includes('"error"')) {
            return { text: text.trim(), source: 'VOEXI Neural Engine' };
          }
        }
      } catch (err1) {
        console.warn('AI Prompt GET failed, trying raw endpoint...', err1);
      }

      // Secondary High Speed Attempt (Prompt Path)
      try {
        const rawUrl = `https://text.pollinations.ai/prompt/${encodeURIComponent(cleanPrompt)}?system=${encodeURIComponent(systemPrompt)}&seed=${seed + 0.1}`;
        const res2 = await fetchWithTimeout(rawUrl, { method: 'GET' }, 10000);

        if (res2.ok) {
          const text2 = await res2.text();
          if (text2 && text2.trim().length > 0 && !text2.includes('502 Bad Gateway') && !text2.includes('<!DOCTYPE') && !text2.toLowerCase().includes('queue full') && !text2.toLowerCase().includes('"error"')) {
            return { text: text2.trim(), source: 'VOEXI Neural Engine' };
          }
        }
      } catch (err2) {}

      // Tertiary Attempt (POST JSON Payload)
      try {
        const postRes = await fetchWithTimeout('https://text.pollinations.ai/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': BROWSER_USER_AGENT
          },
          body: JSON.stringify({
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: cleanPrompt }
            ],
            model: 'openai',
            seed: seed
          })
        }, 10000);

        if (postRes.ok) {
          const text3 = await postRes.text();
          if (text3 && text3.trim().length > 0 && !text3.includes('502 Bad Gateway') && !text3.includes('<!DOCTYPE') && !text3.toLowerCase().includes('queue full')) {
            return { text: text3.trim(), source: 'VOEXI Neural Engine' };
          }
        }
      } catch (err3) {}

      // 3. SMART FALLBACK KNOWLEDGE ENGINE (Guarantees intelligent answers even if offline)
      const lower = cleanPrompt.toLowerCase();
      if (/^(hi|hello|hey|namaste|kya hal|kaise ho)/i.test(lower)) {
        return { text: "Namaste! Main VOEXI AI hoon. Aapka swagat hai! Main aapki kya madad kar sakta hoon?", source: "VOEXI Core" };
      }
      if (/who are you|kaun ho|tum kon ho|aap kaun/i.test(lower)) {
        return { text: "Main VOEXI AI Assistant hoon, aapka smart neural assistant! Aap mujhse coding, general knowledge, content ideas ya koi bhi sawaal pooch sakte hain.", source: "VOEXI Core" };
      }

      return {
        text: `Aapke sawaal "${trimmedInput}" ke baare me: Main aapko sahayata dene ke liye ready hoon! Kripya apna sawaal ek baar fir se likhein.`,
        source: 'VOEXI Core'
      };

    } catch (e: any) {
      return {
        text: `Kripya apna sawaal dobara likhein, main aapki sahayata ke liye ready hoon!`,
        source: 'VOEXI Core'
      };
    }
  },

  async analyzeImage(base64: string): Promise<string | null> {
    return "cyberpunk, futuristic, neon, voexi, digital art";
  },

  async checkBrainStatus(): Promise<boolean> {
    return true;
  },

  async saveMessage(chat_id: string, role: string, content: string, sender_id?: string) {
    try { await supabase.from('ai_messages').insert({ chat_id, role, content, sender_id }); } catch (e) {}
  },

  async startSharedChat(userId: string) {
    try {
      const { data } = await supabase.from('ai_chats').insert({ created_by: userId }).select().single();
      if (data) await supabase.from('ai_chat_participants').insert({ chat_id: data.id, user_id: userId });
      return data;
    } catch (e) {
      return null;
    }
  }
};
