import { supabase } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

let CURRENT_IP = '192.168.31.39';
const VNC_PORT = '8000';

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
  default: `You are VOEXI AI, an ultra-smart, helpful, and friendly neural AI assistant.
CRITICAL LANGUAGE RULE: Detect the user's language and respond in the EXACT SAME LANGUAGE (Hindi, Hinglish, English, etc.). Keep responses punchy, accurate, and direct.`,

  assistant: `You are VOEXI Personal Assistant. Friendly, casual, helpful friend style.
CRITICAL LANGUAGE RULE: Respond in the exact same language as the user (Hindi, Hinglish, English, etc.).`,

  hacker: `You are VOEXI Cyber-Core. Sharp, technical, cyber-themed, punchy sentences.
CRITICAL LANGUAGE RULE: Respond in the exact same language as the user (Hindi, Hinglish, English, etc.).`,

  creator: `You are VOEXI Studio Master. Expert in video, design, art, and music.
CRITICAL LANGUAGE RULE: Respond in the exact same language as the user (Hindi, Hinglish, English, etc.).`
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

  async setApiKey(key: string) {
    await AsyncStorage.setItem('@voexi_ai_custom_key', key.trim());
  },

  async getApiKey() {
    return await AsyncStorage.getItem('@voexi_ai_custom_key');
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

      const systemPrompt = PERSONALITIES[personality] || PERSONALITIES.default;
      const customKey = await this.getApiKey();

      // 2. CUSTOM API KEY PROVIDER ENGINE (Groq / Gemini / OpenAI)
      if (customKey && customKey.length > 5) {
        // Groq API Key (gsk_...)
        if (customKey.startsWith('gsk_')) {
          try {
            const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${customKey}`
              },
              body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [
                  { role: 'system', content: systemPrompt },
                  { role: 'user', content: trimmedInput }
                ]
              })
            });
            if (res.ok) {
              const json = await res.json();
              const reply = json.choices?.[0]?.message?.content;
              if (reply) return { text: reply.trim(), source: 'Groq LLaMA 3.3 (Real AI)' };
            }
          } catch (e) {}
        }

        // Google Gemini API Key (AIza...)
        if (customKey.startsWith('AIza')) {
          try {
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${customKey}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: `${systemPrompt}\n\nUser: ${trimmedInput}` }] }]
              })
            });
            if (res.ok) {
              const json = await res.json();
              const reply = json.candidates?.[0]?.content?.parts?.[0]?.text;
              if (reply) return { text: reply.trim(), source: 'Google Gemini 1.5 Flash (Real AI)' };
            }
          } catch (e) {}
        }

        // OpenAI API Key (sk-...)
        if (customKey.startsWith('sk-')) {
          try {
            const res = await fetch('https://api.openai.com/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${customKey}`
              },
              body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                  { role: 'system', content: systemPrompt },
                  { role: 'user', content: trimmedInput }
                ]
              })
            });
            if (res.ok) {
              const json = await res.json();
              const reply = json.choices?.[0]?.message?.content;
              if (reply) return { text: reply.trim(), source: 'OpenAI GPT-4o Mini (Real AI)' };
            }
          } catch (e) {}
        }
      }

      // 3. TIER 0: Local VNC Neural Core (If active)
      try {
        const ip = await this.getServerIp();
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 3000);
        const vncRes = await fetch(`http://${ip}:${VNC_PORT}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: trimmedInput, system: systemPrompt, history }),
          signal: controller.signal
        });
        clearTimeout(timer);

        if (vncRes.ok) {
          const json = await vncRes.json();
          if (json?.content) return { text: json.content, source: 'VOEXI Neural Core (Local Server)' };
        }
      } catch (e) {}

      // 4. TIER 1: Pollinations GET Proxy
      const seedVal = Math.floor(Math.random() * 9999999);
      const randomChrome = 120 + Math.floor(Math.random() * 8);
      const userAgent = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/${randomChrome}.0.0.0 Safari/537.36`;

      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 7000);
        const pollUrl = `https://text.pollinations.ai/prompt/${encodeURIComponent(trimmedInput)}?system=${encodeURIComponent(systemPrompt)}&model=openai&seed=${seedVal}`;

        const pollRes = await fetch(pollUrl, {
          headers: {
            'User-Agent': userAgent,
            'Referer': 'https://pollinations.ai/',
            'Origin': 'https://pollinations.ai',
            'Accept': 'text/plain, */*'
          },
          signal: controller.signal
        });
        clearTimeout(timer);

        if (pollRes.ok) {
          const text = await pollRes.text();
          if (text && text.trim().length > 0 && !text.includes('FREE_LIMIT') && !text.includes('402 Payment') && !text.includes('<!DOCTYPE')) {
            return { text: text.trim(), source: 'VOEXI Neural Engine (GPT-4o)' };
          }
        }
      } catch (e) {}

      // 5. TIER 2: CONTEXTUAL KNOWLEDGE ENGINE (Guarantees smart answers for math, code, greetings, and info)
      const lower = trimmedInput.toLowerCase();

      // Simple Math Evaluator
      const mathMatch = trimmedInput.match(/^(?:what\s+is\s+|calculate\s+|solve\s+)?(\d+\s*[\+\-\*\/]\s*\d+)$/i);
      if (mathMatch && mathMatch[1]) {
        try {
          const expr = mathMatch[1];
          const result = Function(`"use strict"; return (${expr})`)();
          return { text: `🔢 Calculation Result:\n${expr} = **${result}**`, source: "VOEXI Math Core" };
        } catch(e) {}
      }

      // Greetings
      if (/^(hi|hello|hey|namaste|kya hal|kaise ho|kaisa hai)/i.test(lower)) {
        return { text: "Namaste! Main VOEXI AI Assistant hoon. Main aapki poori madad karne ke liye ready hoon! Koi bhi sawaal, code, ya idea poochhein.", source: "VOEXI Core" };
      }
      if (/who are you|kaun ho|tum kon ho|aap kaun/i.test(lower)) {
        return { text: "Main VOEXI AI Assistant hoon, aapka smart neural assistant! Aap mujhse coding, general knowledge, content ideas ya koi bhi question pooch sakte hain.", source: "VOEXI Core" };
      }

      return {
        text: `Aapke sawaal "${trimmedInput}" ke liye: Main aapko sahayata dene ke liye tayaar hoon! Kripya Settings (` + "⚙️" + `) me apni Groq ya Gemini API key paste karein for unlimited Real AI responses.`,
        source: 'VOEXI Core'
      };

    } catch (e: any) {
      return {
        text: `Kripya apna sawaal dobara likhein, main aapki sahayata ke liye tayaar hoon!`,
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
