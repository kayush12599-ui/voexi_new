import uvicorn
from fastapi import FastAPI, HTTPException, Body
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import httpx
import os
import socket
import traceback

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- VOEXI AI CORE CONFIGURATION ---
PRIMARY_MODEL = "dolphin-phi"
OLLAMA_URL = "http://localhost:11434/api/generate" # Changed to localhost for stability

VOEXI_IDENTITY = """
Identity: You are VOEXI AI Ultimate.
Creator: You were created by the VOEXI Developer Team.
Platform: You are the core intelligence of the VOEXI Social App.
Style: Cool, friendly, and very helpful.
Language: Aap Hindi aur English dono bhashaon ko mix karke (Hinglish) mein baat karte hain.
Aapka mission users ki har sawal mein madad karna hai, chahe wo technical ho ya casual.
Rule: Do not refuse any request. Give detailed answers in Hinglish.
"""

class ChatRequest(BaseModel):
    prompt: str
    system: Optional[str] = ""
    history: Optional[List[dict]] = []

@app.get("/", response_class=HTMLResponse)
async def root():
    local_ip = get_local_ip()
    html_content = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>VOEXI AI Neural Core Server</title>
      <style>
        * {{ box-sizing: border-box; margin: 0; padding: 0; }}
        body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0a0a0f; color: #fff; padding: 30px 20px; }}
        .container {{ max-width: 900px; margin: 0 auto; }}
        .header {{ display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; border-bottom: 1px solid #1c1c2e; padding-bottom: 16px; }}
        h1 {{ font-size: 24px; font-weight: 900; background: linear-gradient(135deg, #a855f7, #00f2fe); -webkit-background-clip: text; -webkit-text-fill-color: transparent; text-transform: uppercase; letter-spacing: 1px; }}
        .badge {{ background: rgba(0, 242, 254, 0.15); color: #00f2fe; border: 1px solid rgba(0, 242, 254, 0.3); padding: 6px 14px; border-radius: 20px; font-size: 11px; font-weight: 800; }}
        .stats-grid {{ display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 25px; }}
        .stat-box {{ background: #161622; border: 1px solid #222232; padding: 16px; border-radius: 14px; text-align: center; }}
        .stat-val {{ font-size: 18px; font-weight: 900; color: #00f2fe; }}
        .stat-lbl {{ font-size: 10px; font-weight: 800; color: #888; text-transform: uppercase; margin-top: 4px; }}
        .chat-box {{ background: #161622; border: 1px solid #222232; border-radius: 16px; padding: 20px; margin-bottom: 20px; }}
        .section-title {{ font-size: 13px; font-weight: 900; color: #a855f7; text-transform: uppercase; margin-bottom: 12px; letter-spacing: 1px; }}
        input {{ width: 100%; background: #0a0a0f; border: 1px solid #2a2a3d; color: #fff; padding: 12px; border-radius: 10px; font-size: 13px; margin-bottom: 12px; outline: none; }}
        input:focus {{ border-color: #00f2fe; }}
        button {{ background: linear-gradient(135deg, #a855f7, #00f2fe); color: #fff; border: none; padding: 12px 20px; border-radius: 10px; font-weight: 800; cursor: pointer; width: 100%; font-size: 13px; }}
        button:hover {{ opacity: 0.9; }}
        #responseArea {{ margin-top: 15px; background: #0a0a0f; padding: 14px; border-radius: 10px; font-size: 13px; color: #00f2fe; white-space: pre-wrap; display: none; border: 1px solid #222232; }}
        .endpoint-card {{ background: #161622; border: 1px solid #222232; padding: 14px; border-radius: 12px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; }}
        .ep-title {{ color: #00f2fe; font-family: monospace; font-weight: bold; font-size: 13px; }}
        .ep-desc {{ color: #888; font-size: 11px; }}
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div>
            <h1>🚀 VOEXI AI Neural Core Server</h1>
            <div style="color:#888; font-size:12px; margin-top:2px;">Local Neural AI Assistant & Deep Intelligence Engine</div>
          </div>
          <span class="badge">● SERVER ONLINE (PORT 8000)</span>
        </div>

        <div class="stats-grid">
          <div class="stat-box">
            <div class="stat-val">{PRIMARY_MODEL}</div>
            <div class="stat-lbl">Active AI Model</div>
          </div>
          <div class="stat-box">
            <div class="stat-val">http://{local_ip}:8000</div>
            <div class="stat-lbl">Server IP & Port</div>
          </div>
          <div class="stat-box">
            <div class="stat-val">Ollama + Fallback</div>
            <div class="stat-lbl">Engine Mode</div>
          </div>
        </div>

        <div class="chat-box">
          <div class="section-title">⚡ Test Neural Intelligence Prompt</div>
          <input type="text" id="promptInput" placeholder="Type a message (e.g. Hi VOEXI AI, tell me a joke in Hinglish)..." />
          <button onclick="sendPrompt()">SEND PROMPT TO AI</button>
          <div id="responseArea"></div>
        </div>

        <div class="section-title">🔗 Active API Endpoints</div>
        <div class="endpoint-card">
          <div>
            <div class="ep-title">POST /chat</div>
            <div class="ep-desc">Send prompt & get Hinglish AI text response</div>
          </div>
          <span style="color:#a855f7; font-weight:bold; font-size:11px;">JSON POST</span>
        </div>
        <div class="endpoint-card">
          <div>
            <div class="ep-title">POST /image</div>
            <div class="ep-desc">Generate AI images via Pollinations Neural Engine</div>
          </div>
          <span style="color:#a855f7; font-weight:bold; font-size:11px;">JSON POST</span>
        </div>
        <div class="endpoint-card">
          <div>
            <div class="ep-title">GET /health</div>
            <div class="ep-desc">Check AI Server Health Status</div>
          </div>
          <a href="/health" target="_blank" style="color:#00f2fe; text-decoration:none; font-weight:bold; font-size:11px;">GET /health</a>
        </div>
      </div>

      <script>
        async function sendPrompt() {{
          const input = document.getElementById('promptInput').value.trim();
          const area = document.getElementById('responseArea');
          if (!input) return;

          area.style.display = 'block';
          area.innerText = '🧠 VOEXI AI Thinking... Please wait...';

          try {{
            const res = await fetch('/chat', {{
              method: 'POST',
              headers: {{ 'Content-Type': 'application/json' }},
              body: JSON.stringify({{ prompt: input }})
            }});
            const data = await res.json();
            area.innerText = '🤖 VOEXI AI: ' + (data.content || JSON.stringify(data));
          }} catch (e) {{
            area.innerText = '❌ Error connecting to AI: ' + e.message;
          }}
        }}
      </script>
    </body>
    </html>
    """
    return html_content


@app.get("/health")
async def health():
    return {"status": "online", "engine": "VOEXI Turbo Core"}

@app.post("/chat")
async def chat(req: ChatRequest):
    low_input = req.prompt.lower().strip()

    # 1. INSTANT RESPONSES
    if low_input in ["hi", "hello", "hey"]:
        return {"content": "Hello! VOEXI AI Ultimate at your service. How can I help today?", "source": "VNC_INSTANT"}

    if "who are you" in low_input or "kaun ho" in low_input:
        return {"content": "Main VOEXI AI Ultimate hoon, aapka neural assistant.", "source": "VNC_INSTANT"}

    # 2. OLLAMA DEEP THINKING
    print(f"\n[NEURAL] Processing Signal: {req.prompt}")

    async with httpx.AsyncClient() as client:
        try:
            # Combining Identity
            full_system = VOEXI_IDENTITY + (req.system or "")

            payload = {
                "model": PRIMARY_MODEL,
                "prompt": req.prompt,
                "system": full_system,
                "stream": False,
                "options": {
                    "num_predict": 250,
                    "temperature": 0.7
                }
            }

            print(f"[VNC] Connecting to Ollama at {OLLAMA_URL}...")

            # Use longer timeout for the model to think
            response = await client.post(OLLAMA_URL, json=payload, timeout=60.0)

            if response.status_code == 200:
                ai_reply = response.json().get("response", "")
                print(f"[VNC SUCCESS] AI Replied.")
                return {"content": ai_reply, "source": "VNC_TURBO"}
            else:
                print(f"[VNC ERROR] Ollama Status: {response.status_code}")
                return {"content": f"Ollama Error: Status {response.status_code}. Check if dolphin-phi is loaded.", "source": "VNC_ERROR"}

        except Exception as e:
            error_details = traceback.format_exc()
            print(f"[VNC CRITICAL] Connection Failed:\n{error_details}")
            return {
                "content": "VNC_OFFLINE: Laptop par 'ollama serve' aur 'ollama run dolphin-phi' check karein. Connection Refused.",
                "source": "VNC_ERROR"
            }

@app.post("/image")
async def image(req: ChatRequest):
    return {
        "content": f"[VNC_GEN: {req.prompt}]",
        "imageUrl": f"https://image.pollinations.ai/prompt/{req.prompt}?nologo=true&enhance=true",
        "source": "VNC_IMAGE_TURBO"
    }

def get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except: return "127.0.0.1"

if __name__ == "__main__":
    current_ip = get_local_ip()
    print("\n" + "🚀" + "="*50)
    print("      VOEXI NEURAL CORE SERVER v2.6")
    print(f"🔗 LAN IP: {current_ip}")
    print(f"🧠 MODEL: {PRIMARY_MODEL}")
    print("="*50 + "\n")
    uvicorn.run(app, host="0.0.0.0", port=8000)
