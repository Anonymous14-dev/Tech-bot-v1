// 🎵 TECH BOT V1 - Descargador YouTube mejorado
// Hecho por Ado :D
import axios from "axios";
import fetch from "node-fetch";

// 🎵 Cooldown system
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

function pickQuality(type, quality) {
  const t = String(type || "").toLowerCase();
  const q = Number(quality);

  if (t === "audio" || t === "mp3") {
    const allowed = new Set([64, 96, 128, 160, 192, 256, 320]);
    return allowed.has(q) ? q : 128;
  }

  const allowed = new Set([144, 240, 360, 480, 720, 1080, 1440, 2160]);
  return allowed.has(q) ? q : 720;
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

// 🎵 Función principal para descargar de YouTube
async function y2mateDirect(url, opts = {}) {
  try {
    const videoId = extractYouTubeId(url);
    if (!videoId) {
      return { status: false, error: "INVALID_YOUTUBE_URL", input: { url } };
    }

    const typeRaw = String(opts.type || "audio").toLowerCase();
    const type = typeRaw === "video" || typeRaw === "mp4" ? "video" : "audio";
    const format = type === "video" ? "mp4" : "mp3";
    const quality = pickQuality(type, opts.quality);

    const timeout = Number(opts.timeout || 45000);
    const { key, ref } = await getSanityKey(Math.min(timeout, 20000));

    const payload = {
      link: `https://youtu.be/${videoId}`,
      format,
      audioBitrate: type === "audio" ? quality : 128,
      videoQuality: type === "video" ? quality : 720,
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
        error: `CONVERTER_HTTP_${res.status}`,
        input: { url, type, quality }
      };
    }

    const obj = normalizeObj(res.data);
    const direct = obj?.url;
    const title = obj?.filename || `video_${videoId}`;

    if (!direct) {
      return {
        status: false,
        error: "NO_URL_IN_RESPONSE",
        input: { url, type, quality },
        raw: obj ?? res.data
      };
    }

    return { 
      status: true, 
      videoId, 
      type, 
      format, 
      quality, 
      url: direct,
      title: title,
      filename: `${title.replace(/[^\w\sáéíóúÁÉÍÓÚñÑ]/gi, '_').substring(0, 50)}.${format}`
    };
  } catch (error) {
    console.error("🎵 [Y2MATE] Error:", error.message);
    return {
      status: false,
      error: error.message || "UNKNOWN_ERROR"
    };
  }
}

// 🎵 Handler principal para .play (descarga directa)
let handler = async (m, { conn, args }) => {
  const userId = m.sender;
  
  // 🎵 Verificar cooldown
  if (cooldowns.has(userId)) {
    const expire = cooldowns.get(userId);
    const remaining = expire - Date.now();
    if (remaining > 0) {
      await m.react('⏳');
      return m.reply(`⏳ *Espera ${Math.ceil(remaining / 1000)} segundos* antes de otra descarga.`);
    }
  }
  
  // 🎵 Verificar si hay búsqueda o URL
  if (!args[0]) {
    await m.react('❓');
    return m.reply(`🎵 *Usa:* .play <nombre o URL de YouTube>\nEjemplo: .play bad bunny tití me preguntó\nEjemplo: .play https://youtu.be/abc123`);
  }
  
  const query = args.join(' ');
  let videoUrl = query;
  
  // 🎵 Si no es una URL, asumimos que es una búsqueda (simplificado)
  // En una versión completa deberías integrar yt-search aquí
  if (!query.match(/(youtube\.com|youtu\.be)/)) {
    await m.react('❓');
    return m.reply(`🎵 *Búsqueda por texto temporalmente deshabilitada*\n\nPor ahora usa solo URLs de YouTube:\n.play https://youtu.be/...\n\n⚡ *TECH BOT V1*`);
  }
  
  // 🎵 Extraer ID de video si es necesario
  if (videoUrl.includes('youtu.be/')) {
    const videoId = videoUrl.split('youtu.be/')[1]?.split('?')[0];
    videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
  }
  
  // 🎵 Activar cooldown
  cooldowns.set(userId, Date.now() + COOLDOWN_TIME);
  
  try {
    await m.react('🔍');
    const processingMsg = await m.reply(`🔍 *PROCESANDO SOLICITUD*\n\nObteniendo información del video...\n⚡ *TECH BOT V1* trabajando...`);
    
    // 🎵 Opciones del usuario (calidad)
    let quality = 320; // Calidad por defecto para audio
    let type = 'audio'; // Tipo por defecto
    
    // Detectar si el usuario quiere video
    if (args.includes('video') || args.includes('mp4') || args.includes('720') || args.includes('1080')) {
      type = 'video';
      quality = 720; // Calidad por defecto para video
      
      // Buscar calidad específica en los argumentos
      for (const arg of args) {
        const num = parseInt(arg);
        if ([144, 240, 360, 480, 720, 1080, 1440, 2160].includes(num)) {
          quality = num;
          break;
        }
      }
    }
    
    // 🎵 Obtener enlace de descarga
    const result = await y2mateDirect(videoUrl, { 
      type: type, 
      quality: quality,
      timeout: 60000 
    });
    
    if (!result.status) {
      cooldowns.delete(userId);
      await m.react('❌');
      await conn.sendMessage(m.chat, {
        text: `❌ *ERROR EN DESCARGA*\n\n${result.error}\n\n⚡ Intenta con otro video o más tarde.`,
        edit: processingMsg.key
      });
      return;
    }
    
    const { title, url: downloadUrl, format, quality: finalQuality, filename } = result;
    
    // 🎵 Mostrar información del video
    await conn.sendMessage(m.chat, {
      text: `✅ *ENLACE OBTENIDO*\n\n📛 ${title}\n🎬 Formato: ${format.toUpperCase()}\n🔊 Calidad: ${finalQuality}${type === 'audio' ? 'kbps' : 'p'}\n📥 Descargando...`,
      edit: processingMsg.key
    });
    
    await m.react('📥');
    
    // 🎵 Descargar el archivo
    const fileResponse = await fetch(downloadUrl, {
      headers: {
        'User-Agent': UA,
        'Accept': '*/*',
        'Referer': 'https://frame.y2meta-uk.com/'
      },
      timeout: 60000
    });
    
    if (!fileResponse.ok) {
      throw new Error(`Error HTTP: ${fileResponse.status}`);
    }
    
    const fileBuffer = await fileResponse.buffer();
    
    if (fileBuffer.length === 0) {
      throw new Error('Archivo vacío');
    }
    
    // 🎵 Enviar el archivo según el tipo
    await m.react('✅');
    
    if (type === 'audio') {
      await conn.sendMessage(m.chat, {
        audio: fileBuffer,
        mimetype: 'audio/mpeg',
        fileName: filename,
        caption: `✅ *AUDIO DESCARGADO*\n\n📛 ${title}\n🔊 ${finalQuality}kbps\n\n⚡ *TECH BOT V1*`,
        quoted: m
      });
    } else {
      await conn.sendMessage(m.chat, {
        video: fileBuffer,
        mimetype: 'video/mp4',
        fileName: filename,
        caption: `✅ *VIDEO DESCARGADO*\n\n📛 ${title}\n🎬 ${finalQuality}p\n\n⚡ *TECH BOT V1*`,
        quoted: m
      });
    }
    
    // 🎵 Limpiar cooldown después de éxito
    setTimeout(() => {
      cooldowns.delete(userId);
    }, COOLDOWN_TIME);
    
    console.log(`🎵 [PLAY] Archivo enviado: ${title} (${finalQuality}${type === 'audio' ? 'kbps' : 'p'})`);
    
  } catch (error) {
    console.error(`🎵 [PLAY] Error handler:`, error);
    cooldowns.delete(userId);
    
    await m.react('💥');
    
    // 🎵 Mensajes de error específicos
    const errorMessages = {
      'timeout': '⏳ *TIEMPO AGOTADO*\nEl servidor tardó demasiado.',
      'ENOTFOUND': '❌ *SERVIDOR NO DISPONIBLE*\nIntenta más tarde.',
      'ECONNREFUSED': '❌ *CONEXIÓN RECHAZADA*\nServidor sobrecargado.',
      'default': `❌ *ERROR*\n${error.message}`
    };
    
    let errorMsg = errorMessages.default;
    if (error.message.includes('timeout')) errorMsg = errorMessages.timeout;
    if (error.message.includes('ENOTFOUND')) errorMsg = errorMessages.ENOTFOUND;
    if (error.message.includes('ECONNREFUSED')) errorMsg = errorMessages.ECONNREFUSED;
    
    await m.reply(errorMsg);
  }
}

// 🎵 Handler para .video (descarga solo video)
let handler2 = async (m, { conn, args }) => {
  const userId = m.sender;
  
  // 🎵 Verificar cooldown
  if (cooldowns.has(userId)) {
    const expire = cooldowns.get(userId);
    const remaining = expire - Date.now();
    if (remaining > 0) {
      await m.react('⏳');
      return m.reply(`⏳ *Espera ${Math.ceil(remaining / 1000)} segundos* antes de otra descarga.`);
    }
  }
  
  // 🎵 Verificar URL
  if (!args[0]) {
    await m.react('❓');
    return m.reply(`🎬 *Usa:* .video <URL de YouTube> [calidad]\nEjemplo: .video https://youtu.be/abc123 720\nCalidades: 144, 240, 360, 480, 720, 1080`);
  }
  
  let videoUrl = args[0];
  
  // 🎵 Validar URL de YouTube
  if (!videoUrl.match(/(youtube\.com|youtu\.be)/)) {
    await m.react('❌');
    return m.reply('❌ *URL inválida* - Solo links de YouTube.');
  }
  
  // 🎵 Extraer ID de video si es necesario
  if (videoUrl.includes('youtu.be/')) {
    const videoId = videoUrl.split('youtu.be/')[1]?.split('?')[0];
    videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
  }
  
  // 🎵 Obtener calidad
  let quality = 720; // Calidad por defecto
  if (args[1]) {
    const num = parseInt(args[1]);
    if ([144, 240, 360, 480, 720, 1080, 1440, 2160].includes(num)) {
      quality = num;
    }
  }
  
  // 🎵 Activar cooldown
  cooldowns.set(userId, Date.now() + COOLDOWN_TIME);
  
  try {
    await m.react('🔍');
    const processingMsg = await m.reply(`🔍 *PROCESANDO VIDEO*\n\nCalidad: ${quality}p\nObteniendo enlace...\n⚡ *TECH BOT V1*`);
    
    // 🎵 Obtener enlace de descarga
    const result = await y2mateDirect(videoUrl, { 
      type: 'video', 
      quality: quality,
      timeout: 60000 
    });
    
    if (!result.status) {
      cooldowns.delete(userId);
      await m.react('❌');
      await conn.sendMessage(m.chat, {
        text: `❌ *ERROR EN VIDEO*\n\n${result.error}\n\n⚡ Intenta con otra calidad o más tarde.`,
        edit: processingMsg.key
      });
      return;
    }
    
    const { title, url: downloadUrl, filename } = result;
    
    // 🎵 Descargar video
    await conn.sendMessage(m.chat, {
      text: `📥 *DESCARGANDO VIDEO*\n\n📛 ${title}\n🎬 ${quality}p\n⏳ Descargando...`,
      edit: processingMsg.key
    });
    
    await m.react('📥');
    
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
    
    // 🎵 Enviar video
    await m.react('✅');
    await conn.sendMessage(m.chat, {
      video: videoBuffer,
      mimetype: 'video/mp4',
      fileName: filename,
      caption: `✅ *VIDEO DESCARGADO*\n\n📛 ${title}\n🎬 ${quality}p\n\n⚡ *TECH BOT V1*`,
      quoted: m
    });
    
    // 🎵 Limpiar cooldown
    setTimeout(() => {
      cooldowns.delete(userId);
    }, COOLDOWN_TIME);
    
  } catch (error) {
    console.error(`🎵 [VIDEO] Error:`, error);
    cooldowns.delete(userId);
    await m.react('💥');
    await m.reply(`❌ *Error en video:* ${error.message}`);
  }
}

// 🎵 Comandos para .play (audio por defecto, puede ser video si se especifica)
handler.help = ['play <URL o nombre> [opciones]'];
handler.tags = ['dl', 'audio', 'video'];
handler.command = ['play', 'p', 'descargar'];

// 🎵 Comandos para .video (solo video)
handler2.help = ['video <URL> [calidad]'];
handler2.tags = ['dl', 'video'];
handler2.command = ['video', 'vid', 'ytv'];

export default handler;
export { handler2 };