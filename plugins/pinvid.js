// 🎬 Pinterest Video Downloader - TECH BOT V1
// Hecho por Ado :D
// Versión sin botones - Envío automático
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

async function downloadVideo(url, title) {
  try {
    const response = await fetch(url, {
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
    
    return videoBuffer;
  } catch (error) {
    throw error;
  }
}

// 🎬 Handler principal - SIN BOTONES, ENVÍO AUTOMÁTICO
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
    return m.reply(`🎬 *Usa:* .pinvid <tipo de videos>\n\nEjemplos:\n.pinvid funny cats\n.pinvid cooking recipes\n.pinvid workout videos`);
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
    
    // 🎬 Mostrar resultados encontrados
    await conn.sendMessage(m.chat, {
      text: `✅ *${result.count} VIDEOS ENCONTRADOS*\n\n🎬 *Búsqueda:* ${query}\n⚡ *TECH BOT V1*\n\n📥 *Descargando videos...*`,
      edit: searchMsg.key
    });
    
    // 🎬 DESCARGAR Y ENVIAR CADA VIDEO AUTOMÁTICAMENTE (SIN BOTONES)
    for (let i = 0; i < Math.min(videos.length, 3); i++) { // Máximo 3 videos
      const video = videos[i];
      
      try {
        // Notificar que se está descargando
        await m.reply(`📥 *Descargando video ${i + 1} de ${Math.min(videos.length, 3)}*\n🎬 ${video.title.substring(0, 50)}...`);
        
        // Descargar video
        const videoBuffer = await downloadVideo(video.downloadUrl, video.title);
        
        // Limpiar nombre del archivo
        const cleanTitle = video.title
          .replace(/[^\w\sáéíóúÁÉÍÓÚñÑ]/gi, ' ')
          .substring(0, 40)
          .trim();
        
        const fileName = `${cleanTitle}.mp4`;
        
        // Enviar video automáticamente
        await conn.sendMessage(m.chat, {
          video: videoBuffer,
          mimetype: 'video/mp4',
          fileName: fileName,
          caption: `🎬 *VIDEO ${i + 1}*\n\n📛 ${cleanTitle}\n⏱️ ${video.duration} | 👍 ${video.likes}\n🎬 Calidad: ${video.quality}\n\n⚡ *TECH BOT V1*`
        });
        
        await m.react('✅');
        
        // Pequeña pausa entre descargas
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        console.error(`🎬 [PINVID] Error video ${i + 1}:`, error.message);
        await m.reply(`❌ *Error con video ${i + 1}:* ${error.message}`);
        await m.react('⚠️');
      }
    }
    
    // 🎬 Mensaje final
    await m.reply(`✅ *DESCARGA COMPLETADA*\n\n🎬 Se descargaron ${Math.min(videos.length, 3)} videos de Pinterest\n🔍 Búsqueda: "${query}"\n\n⚡ *TECH BOT V1* - Descarga automática`);
    
    // 🎬 Limpiar cooldown después de un tiempo
    setTimeout(() => {
      cooldowns.delete(userId);
    }, COOLDOWN_TIME);
    
  } catch (error) {
    console.error("🎬 [PINVID] Error handler:", error);
    cooldowns.delete(userId);
    await m.react('💥');
    await m.reply(`❌ *Error general:* ${error.message}`);
  }
}

// 🎬 Comandos
handler.help = ['pinvid <término de búsqueda>'];
handler.tags = ['dl', 'video', 'pinterest'];
handler.command = ['pinvid', 'pinvideo', 'pindl'];

export default handler;