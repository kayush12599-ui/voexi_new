// VOEXI System Configuration
const getHostIp = () => {
  if (typeof window !== 'undefined' && window.location && window.location.hostname) {
    return window.location.hostname;
  }
  return '192.168.31.39';
};

export const SERVER_IP = getHostIp();
export const AVATAR_SERVER_PORT = 8085;
export const MEDIA_SERVER_PORT = 8080;

// Set to active Cloudflare Tunnel URL when sharing remotely, or leave empty for local testing
export const PUBLIC_TUNNEL_URL = '';

export const AVATAR_SERVER_URL = `http://${SERVER_IP}:${AVATAR_SERVER_PORT}`;
export const MEDIA_SERVER_URL = PUBLIC_TUNNEL_URL ? PUBLIC_TUNNEL_URL : `http://${SERVER_IP}:${MEDIA_SERVER_PORT}`;
