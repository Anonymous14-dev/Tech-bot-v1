// 🎬 Pinterest Video Downloader - TECH BOT V1
// Hecho por Ado :D
import axios from "axios";
import fetch from "node-fetch";

// 🎬 Configuración
const ORIGIN = "https://www.pinterest.com";
const ENDPOINT = `${ORIGIN}/resource/BaseSearchResource/get/`;

// 🎬 Cooldown system
const cooldowns = new Map();
const COOLDOWN_TIME = 30 * 1000; // 30 segundos cooldown

function buildHeaders({ appVersion, dpr, sourceUrl }) {
  return {
    Accept: "application/json, text/javascript, */*, q=0.01",
    "X-Requested-With": "XMLHttpRequest",
    "X-APP-VERSION": appVersion,
    "X-Pinterest-AppState": "active",
    "X-Pinterest-Source-Url": sourceUrl,
    "X-Pinterest-PWS-Handler": "www/search/[scope].js",
    "screen-dpr": String(dpr),
    Referer: `${ORIGIN}${sourceUrl}`,
    "Accept-Language": "es-419,es;q=0.9,en;q=0.8",
    "User-Agent": "Mozilla/5.0 (Linux; Android 13; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.5845.163 Mobile Safari/537.36",
  };
}

function buildParams({ query, scope, rs, bookmark, pageSize }) {
  const sourceUrl = `/search/${scope}/?q=${encodeURIComponent(query)}&rs=${encodeURIComponent(rs)}`;
  const dataObj = {
    options: {
      query,
      scope,
      rs,
      redux_normalize_feed: true,
      source_url: sourceUrl,
      static_feed: false,
      page_size: pageSize,
      ...(bookmark ? { bookmarks: [bookmark] } : {}),
    },
    context: {},
  };
  return {
    source_url: sourceUrl,
    data: JSON.stringify(dataObj),
    _: Date.now(),
  };
}

function msToHMS(ms) {
  const n = Number(ms);
  if (!Number.isFinite(n) || n <= 0) return null;
  const total = Math.floor(n / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function pickMp4FromVideoList(vl) {
  if (!vl || typeof vl !== "object") return null;
  const order = ["V_1080P", "V_720P", "V_480P", "V_360P", "V_240P", "V_144P"];
  for (const k of order) {
    const u = vl?.[k]?.url;
    if (u && String(u).includes(".mp4")) return { url: u, meta: vl[k] };
  }
  for (const k of Object.keys(vl)) {
    const u = vl?.[k]?.url;
    if (u && String(u).includes(".mp4")) return { url: u, meta: vl[k] };
  }
  return null;
}

function extractVideo(pin) {
  const pickedA = pickMp4FromVideoList(pin?.videos?.video_list);
  if (pickedA) return pickedA;

  const pages = pin?.story_pin_data?.pages;
  if (Array.isArray(pages)) {
    for (const page of pages) {
      const blocks = page?.blocks;
      if (!Array.isArray(blocks)) continue;
      for (const b of blocks) {
        const pickedB = pickMp4FromVideoList(b?.video?.video_list);
        if (pickedB) return pickedB;
      }
    }
  }
  return null;
}

function extractLikes(pin) {
  const likes = Number(pin?.reaction_counts?.["1"]);
  return Number.isFinite(likes) ? likes : 0;
}

async function fetchPinterestVideosPage({ query, bookmark = null, pageSize = 25 }) {
  const scope = "videos";
  const rs = "typed";
  const sourceUrl = `/search/${scope}/?q=${encodeURIComponent(query)}&rs=${encodeURIComponent(rs)}`;

  const params = buildParams({ query, scope, rs, bookmark, pageSize });
  const headers = buildHeaders({ appVersion: "0ddf807", dpr: 1.84, sourceUrl });

  const res = await axios.get(ENDPOINT, {
    params,
    headers,
    timeout: 20000,
    validateStatus: (s) => s >= 200 && s < 500,
  });

  const rr = res.data?.resource_response;
  if (res.status !== 200 || !rr) {
    const msg = res.data?.message || rr?.message || "Request failed";
    throw new Error(`HTTP ${res.status} - ${msg}`);
  }
  if (rr?.code !== 0) {
    throw new Error(`Pinterest code ${rr?.code}: ${rr?.message || "unknown"}`);
  }

  const nextBookmark = rr?.bookmark || null;
  const results = Array.isArray(rr?.data?.results) ? rr.data.results : [];

  const videos = [];
  for (const pin of results) {
    const v = extractVideo(pin);
    if (!v?.url) continue;

    videos.push({
      title: pin?.grid_title || "Video de Pinterest",
      link: pin?.link || pin?.tracked_link || null,
      duration: msToHMS(v.meta?.duration) || "00:00",
      likes: extractLikes(pin),
      downloadUrl: v.url,
      thumbnail: v.meta?.thumbnail || null,
      quality: v.meta?.quality || "HD"
    });
  }

  return { query, bookmark: nextBookmark, videos };
}

async function searchPinterestVideos(query, maxVideos = 10) {
  try {
    const collected = [];
    let bookmark = null;

    for (let i = 0; i < 3 && collected.length < maxVideos; i++) {
      const page = await fetchPinterestVideosPage({ 
        query, 
        bookmark, 
        pageSize: 25 
      });
      bookmark = page.bookmark || null;

      for (const v of page.videos) {
        if (collected.length >= maxVideos) break;
        collected.push(v);
      }

      if (!bookmark) break;
    }

    return {
      success: true,
      query,
      count: collected.length,
      videos: collected
    };
    
  } catch (error) {
    console.error("🎬 [PINTEREST] Error:", error.message);
    return {
      success: false,
      error: error.message || "Error al buscar videos"
    };
  }
}

// 🎬 Handler principal para Pinterest
let handler = async (m, { conn, args }) => {
  const userId = m.sender;
  
  // 🎬 Verificar cooldown
  if (cooldowns.has(userId)) {
    const expire = cooldowns.get(userId);
    const remaining = expire - Date.now();
    if (remaining > 0) {
      await m.react('⏳');
      return m.reply(`⏳ *Espera ${Math.ceil(remaining / 1000)} segundos* antes de otra búsqueda.`);
    }
  }
  
  // 🎬 Verificar búsqueda
  if (!args[0]) {
    await m.react('❓');
    return m.reply(`🎬 *Usa:* .pinterest <tipo de videos>\n\nEjemplos:\n.pinterest funny cats\n.pinterest cooking recipes\n.pinterest workout videos`);
  }
  
  const query = args.join(' ');
  
  // 🎬 Activar cooldown
  cooldowns.set(userId, Date.now() + COOLDOWN_TIME);
  
  try {
    await m.react('🔍');
    const searchMsg = await m.reply(`🔍 *BUSCANDO EN PINTEREST*\n\n🎬 Buscando: "${query}"\n⚡ *TECH BOT V1* procesando...`);
    
    // 🎬 Buscar videos en Pinterest
    const result = await searchPinterestVideos(query, 5); // Máximo 5 videos
    
    if (!result.success) {
      cooldowns.delete(userId);
      await m.react('❌');
      await conn.sendMessage(m.chat, {
        text: `❌ *ERROR EN BÚSQUEDA*\n\n${result.error}\n\n⚡ Intenta con otra búsqueda.`,
        edit: searchMsg.key
      });
      return;
    }
    
    if (result.count === 0) {
      cooldowns.delete(userId);
      await m.react('❌');
      await conn.sendMessage(m.chat, {
        text: `❌ *NO SE ENCONTRARON VIDEOS*\n\nNo hay resultados para: "${query}"\n⚡ Prueba con palabras diferentes.`,
        edit: searchMsg.key
      });
      return;
    }
    
    const { videos } = result;
    
    // 🎬 Mostrar resultados con botones
    let videoList = `✅ *${result.count} VIDEOS ENCONTRADOS*\n\n🎬 *Búsqueda:* ${query}\n\n`;
    
    videos.forEach((video, index) => {
      videoList += `${index + 1}. ${video.title}\n   ⏱️ ${video.duration} | 👍 ${video.likes} | 🎬 ${video.quality}\n\n`;
    });
    
    videoList += `⚡ *Selecciona un video con los botones:*`;
    
    // 🎬 Crear botones para cada video
    const buttons = [];
    
    videos.forEach((video, index) => {
      buttons.push({
        buttonId: `.pindl ${video.downloadUrl} ${video.title}`,
        buttonText: { displayText: `🎬 Video ${index + 1}` },
        type: 1
      });
    });
    
    // Botón para ver más opciones
    buttons.push({
      buttonId: `.pinall ${query}`,
      buttonText: { displayText: `📊 Ver todos` },
      type: 1
    });
    
    // 🎬 Enviar resultados con thumbnail del primer video
    try {
      const firstThumbnail = videos[0]?.thumbnail;
      
      await conn.sendMessage(
        m.chat,
        {
          image: firstThumbnail ? { url: firstThumbnail } : undefined,
          caption: videoList,
          buttons: buttons,
          footer: "⚡ TECH BOT V1 - Pinterest Downloader",
          headerType: 4
        },
        { quoted: m }
      );
      
      await m.react('✅');
      
    } catch (error) {
      // Si falla la imagen, enviar solo texto
      await conn.sendMessage(
        m.chat,
        {
          text: videoList,
          buttons: buttons,
          footer: "⚡ TECH BOT V1 - Pinterest Downloader",
          headerType: 1
        },
        { quoted: m }
      );
      
      await m.react('✅');
    }
    
  } catch (error) {
    console.error("🎬 [PINTEREST] Error handler:", error);
    cooldowns.delete(userId);
    await m.react('💥');
    await m.reply(`❌ *Error:* ${error.message}`);
  }
}

// 🎬 Handler para descargar video de Pinterest
let handler2 = async (m, { conn, args }) => {
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
  
  if (!args[0]) {
    return m.reply('❌ *URL no proporcionada*');
  }
  
  const downloadUrl = args[0];
  const title = args.slice(1).join(' ') || 'video_pinterest';
  
  // 🎬 Activar cooldown
  cooldowns.set(userId, Date.now() + COOLDOWN_TIME);
  
  try {
    await m.react('📥');
    const downloadMsg = await m.reply(`📥 *DESCARGANDO VIDEO*\n\nPor favor espera...\n⚡ *TECH BOT V1* descargando...`);
    
    // 🎬 Descargar video
    const response = await fetch(downloadUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 13; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.5845.163 Mobile Safari/537.36',
        'Referer': 'https://www.pinterest.com/'
      },
      timeout: 60000
    });
    
    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }
    
    const videoBuffer = await response.buffer();
    
    if (videoBuffer.length === 0) {
      throw new Error('Video vacío');
    }
    
    // 🎬 Limpiar nombre del archivo
    const cleanTitle = title
      .replace(/[^\w\sáéíóúÁÉÍÓÚñÑ]/gi, ' ')
      .substring(0, 40)
      .trim();
    
    const fileName = `${cleanTitle}.mp4`;
    
    // 🎬 Enviar video
    await m.react('✅');
    await conn.sendMessage(m.chat, {
      video: videoBuffer,
      mimetype: 'video/mp4',
      fileName: fileName,
      caption: `✅ *VIDEO DE PINTEREST DESCARGADO*\n\n📛 ${cleanTitle}\n🎬 Calidad: HD\n\n⚡ *TECH BOT V1*`,
      quoted: m
    });
    
    // 🎬 Limpiar cooldown
    setTimeout(() => {
      cooldowns.delete(userId);
    }, COOLDOWN_TIME);
    
  } catch (error) {
    console.error("🎬 [PINDL] Error:", error);
    cooldowns.delete(userId);
    await m.react('❌');
    await m.reply(`❌ *Error en descarga:* ${error.message}`);
  }
}

// 🎬 Handler para ver todos los videos
let handler3 = async (m, { conn, args }) => {
  if (!args[0]) {
    return m.reply('❌ *Término de búsqueda no proporcionado*');
  }
  
  try {
    const query = args.join(' ');
    await m.react('🔍');
    
    const result = await searchPinterestVideos(query, 15); // Más videos
    
    if (!result.success || result.count === 0) {
      return m.reply(`❌ *No se encontraron videos para:* "${query}"`);
    }
    
    let videoList = `📊 *${result.count} VIDEOS ENCONTRADOS*\n\n🎬 *Búsqueda:* ${query}\n\n`;
    
    result.videos.forEach((video, index) => {
      videoList += `*${index + 1}.* ${video.title}\n`;
      videoList += `   ⏱️ ${video.duration} | 👍 ${video.likes} | 🎬 ${video.quality}\n`;
      videoList += `   🔗 ${video.downloadUrl.substring(0, 50)}...\n\n`;
    });
    
    videoList += `⚡ *Usa:* .pindl <url> <titulo> para descargar`;
    
    await m.reply(videoList);
    
  } catch (error) {
    await m.reply(`❌ *Error:* ${error.message}`);
  }
}

// 🎬 Comandos
handler.help = ['pinvid <término de búsqueda>'];
handler.tags = ['dl', 'video', 'pinterest'];
handler.command = ['pinvid', 'pinsearch', 'pins'];

handler2.help = ['pindl <url> <titulo>'];
handler2.tags = ['dl', 'video'];
handler2.command = ['pindl', 'pindownload', 'pinvideo'];

handler3.help = ['pinvid <término>'];
handler3.tags = ['dl', 'search'];
handler3.command = ['pinall', 'pinlist'];

export default handler;
export { handler2, handler3 };