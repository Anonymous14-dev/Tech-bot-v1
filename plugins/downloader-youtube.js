// 🎬 TECH BOT V1 - Descargador de Video YouTube
// Hecho por Ado :D
import axios from "axios";
import fetch from "node-fetch";

// 🎬 Cooldown system
const cooldowns = new Map();
const COOLDOWN_TIME = 30 * 1000; // 30 segundos cooldown

const UA = "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Mobile Safari/537.36";

function extractYouTubeId(input) {
  const s = String(input || "").trim();
  if (!s) return null;

  const m1 = s.match(/(?:v=|\/shorts\/|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  if (m1?.[1]) return m1[1];

  const m2 = s.match(/^[A-Za-z0-9_-]{11}$/);
  if (m2?.[0]) return m2[0];

  return null;
}

function baseHeaders(ref) {
  return {
    "User-Agent": UA,
    Accept: "application/json, text/plain, */*",
    "Accept-Language": "es-US,es-419;q=0.9,es;q=0.8",
    Origin: ref,
    Referer: `${ref}/`,
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "cross-site",
    "sec-ch-ua": '"Chromium";v="123", "Not(A:Brand";v="24", "Google Chrome";v="123"',
    "sec-ch-ua-mobile": "?1",
    "sec-ch-ua-platform": '"Android"'
  };
}

async function getSanityKey(timeout = 20000) {
  const ref = "https://frame.y2meta-uk.com";

  const res = await axios.get("https://cnv.cx/v2/sanity/key", {
    timeout,
    headers: { ...baseHeaders(ref), "Content-Type": "application/json" },
    validateStatus: () => true
  });

  if (res.status !== 200) throw new Error(`SANITY_KEY_HTTP_${res.status}`);

  const key = res?.data?.key;
  if (!key) throw new Error("SANITY_KEY_MISSING");

  return { key, ref };
}

function toForm(data) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(data)) p.set(k, String(v));
  return p;
}

function normalizeObj(data) {
  if (data && typeof data === "object") return data;
  if (typeof data === "string") {
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }
  return null;
}

// 🎬 Función principal para descargar video de YouTube
async function downloadYouTubeVideo(url, quality = 720) {
  try {
    const videoId = extractYouTubeId(url);
    if (!videoId) {
      return { status: false, error: "URL de YouTube inválida" };
    }

    // Validar calidad
    const allowedQualities = [144, 240, 360, 480, 720, 1080, 1440, 2160];
    const finalQuality = allowedQualities.includes(quality) ? quality : 720;

    const timeout = 60000;
    const { key, ref } = await getSanityKey(20000);

    const payload = {
      link: `https://youtu.be/${videoId}`,
      format: "mp4",
      audioBitrate: 128,
      videoQuality: finalQuality,
      filenameStyle: "pretty",
      vCodec: "h264"
    };

    const res = await axios.post("https://cnv.cx/v2/converter", toForm(payload), {
      timeout,
      headers: {
        ...baseHeaders(ref),
        Accept: "*/*",
        "Content-Type": "application/x-www-form-urlencoded",
        key
      },
      validateStatus: () => true
    });

    if (res.status !== 200) {
      return {
        status: false,
        error: `Error del servidor: ${res.status}`
      };
    }

    const obj = normalizeObj(res.data);
    const direct = obj?.url;
    const title = obj?.filename || `video_${videoId}`;

    if (!direct) {
      return {
        status: false,
        error: "No se pudo obtener el enlace de descarga"
      };
    }

    return { 
      status: true, 
      videoId, 
      quality: finalQuality, 
      url: direct,
      title: title,
      filename: `${title.replace(/[^\w\sáéíóúÁÉÍÓÚñÑ]/gi, '_').substring(0, 50)}.mp4`
    };
  } catch (error) {
    console.error("🎬 [YOUTUBE] Error:", error.message);
    return {
      status: false,
      error: error.message || "Error desconocido"
    };
  }
}

// 🎬 Handler principal para descargar video
let handler = async (m, { conn, args }) => {
  const userId = m.sender;
  
  // 🎬 Verificar cooldown
  if (cooldowns.has(userId)) {
    const expire = cooldowns.get(userId);
    const remaining = expire - Date.now();
    if (remaining > 0) {
      await m.react('⏳');
      return m.reply(`⏳ *Espera ${Math.ceil(remaining / 1000)} segundos* antes de otra descarga.`);
    }
  }
  
  // 🎬 Verificar URL
  if (!args[0]) {
    await m.react('❓');
    return m.reply(`🎬 *Usa:* .video <URL de YouTube> [calidad]\n\nEjemplos:\n.video https://youtu.be/abc123\n.video https://youtu.be/abc123 1080\n\nCalidades disponibles: 144, 240, 360, 480, 720, 1080`);
  }
  
  let videoUrl = args[0];
  
  // 🎬 Validar URL de YouTube
  if (!videoUrl.match(/(youtube\.com|youtu\.be)/)) {
    await m.react('❌');
    return m.reply('❌ *URL inválida* - Solo links de YouTube.');
  }
  
  // 🎬 Extraer ID de video si es necesario
  if (videoUrl.includes('youtu.be/')) {
    const videoId = videoUrl.split('youtu.be/')[1]?.split('?')[0];
    videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
  }
  
  // 🎬 Obtener calidad
  let quality = 720; // Calidad por defecto
  if (args[1]) {
    const num = parseInt(args[1]);
    if ([144, 240, 360, 480, 720, 1080, 1440, 2160].includes(num)) {
      quality = num;
    }
  }
  
  // 🎬 Activar cooldown
  cooldowns.set(userId, Date.now() + COOLDOWN_TIME);
  
  try {
    await m.react('🔍');
    const processingMsg = await m.reply(`🔍 *PROCESANDO VIDEO*\n\n🎬 Calidad: ${quality}p\n⚡ Obteniendo información...\n*TECH BOT V1* trabajando...`);
    
    // 🎬 Obtener enlace de descarga
    const result = await downloadYouTubeVideo(videoUrl, quality);
    
    if (!result.status) {
      cooldowns.delete(userId);
      await m.react('❌');
      await conn.sendMessage(m.chat, {
        text: `❌ *ERROR EN VIDEO*\n\n${result.error}\n\n⚡ Intenta con otra calidad o más tarde.`,
        edit: processingMsg.key
      });
      return;
    }
    
    const { title, url: downloadUrl, filename, quality: finalQuality } = result;
    
    // 🎬 Mostrar información
    await conn.sendMessage(m.chat, {
      text: `✅ *VIDEO LISTO*\n\n📛 ${title}\n🎬 Calidad: ${finalQuality}p\n📥 Descargando...`,
      edit: processingMsg.key
    });
    
    await m.react('📥');
    
    // 🎬 Descargar video
    const videoResponse = await fetch(downloadUrl, {
      headers: {
        'User-Agent': UA,
        'Accept': '*/*',
        'Referer': 'https://frame.y2meta-uk.com/'
      },
      timeout: 60000
    });
    
    if (!videoResponse.ok) {
      throw new Error(`Error HTTP: ${videoResponse.status}`);
    }
    
    const videoBuffer = await videoResponse.buffer();
    
    if (videoBuffer.length === 0) {
      throw new Error('Video vacío');
    }
    
    // 🎬 Enviar video
    await m.react('✅');
    await conn.sendMessage(m.chat, {
      video: videoBuffer,
      mimetype: 'video/mp4',
      fileName: filename,
      caption: `✅ *VIDEO DESCARGADO*\n\n📛 ${title}\n🎬 ${finalQuality}p\n\n⚡ *TECH BOT V1*`,
      quoted: m
    });
    
    // 🎬 Limpiar cooldown
    setTimeout(() => {
      cooldowns.delete(userId);
    }, COOLDOWN_TIME);
    
    console.log(`🎬 [VIDEO] Video enviado: ${title} (${finalQuality}p)`);
    
  } catch (error) {
    console.error(`🎬 [VIDEO] Error:`, error);
    cooldowns.delete(userId);
    await m.react('💥');
    
    const errorMsg = error.message.includes('timeout') 
      ? '⏳ *TIEMPO AGOTADO*\nEl servidor tardó demasiado.'
      : error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')
      ? '❌ *SERVIDOR NO DISPONIBLE*\nIntenta más tarde.'
      : `❌ *ERROR*\n${error.message}`;
    
    await m.reply(errorMsg);
  }
}

// 🎬 Comandos
handler.help = ['ytmp4 <URL> [calidad]'];
handler.tags = ['dl', 'video'];
handler.command = ['ytmp4', 'playvid', 'ytv', 'videodl'];

export default handler;