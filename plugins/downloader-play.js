// 🎵 TECH BOT V1 - Descarga de audio de YouTube con múltiples APIs
// Hecho por Ado :D 
import axios from 'axios';
import fetch from 'node-fetch';
import yts from "yt-search";

// 🎵 Cooldown system
const cooldowns = new Map();
const COOLDOWN_TIME = 30 * 1000; // 30 segundos cooldown

// 🎵 Lista de APIs gratuitas sin key
const APIS = [
  // API 1: Pux API (rápida y estable)
  {
    name: "pux",
    audio: async (url) => {
      const res = await axios.get(`https://api.pux.li/ytdl/audio?url=${encodeURIComponent(url)}`, {
        timeout: 30000
      });
      return res.data?.url;
    }
  },
  
  // API 2: Videfikri API
  {
    name: "videfikri",
    audio: async (url) => {
      const res = await axios.get(`https://api.videfikri.com/api/ytmp3?url=${encodeURIComponent(url)}`, {
        timeout: 30000
      });
      return res.data?.result?.url || res.data?.url;
    }
  },
  
  // API 3: AEM API
  {
    name: "aem",
    audio: async (url) => {
      const res = await axios.get(`https://aemt.me/download/ytmp3?url=${encodeURIComponent(url)}`, {
        timeout: 30000
      });
      return res.data?.result?.url || res.data?.url;
    }
  },
  
  // API 4: APIs.darkness API
  {
    name: "darkness",
    audio: async (url) => {
      const res = await axios.get(`https://apis.darkness.biz/ytmp3?url=${encodeURIComponent(url)}`, {
        timeout: 30000
      });
      return res.data?.result?.url || res.data?.url;
    }
  },
  
  // API 5: Rest API Heroku
  {
    name: "restapi",
    audio: async (url) => {
      const res = await axios.get(`https://rest-api.akuari.my.id/downloader/youtube3?url=${encodeURIComponent(url)}`, {
        timeout: 30000
      });
      return res.data?.result?.url || res.data?.url;
    }
  },
  
  // API 6: MHW API
  {
    name: "mhw",
    audio: async (url) => {
      const res = await axios.get(`https://mhw-api.herokuapp.com/api/ytmp3?url=${encodeURIComponent(url)}`, {
        timeout: 30000
      });
      return res.data?.result?.url || res.data?.url;
    }
  },
  
  // API 7: Sanzy API
  {
    name: "sanzy",
    audio: async (url) => {
      const res = await axios.get(`https://sanzy-api.herokuapp.com/api/download/youtube-mp3?url=${encodeURIComponent(url)}`, {
        timeout: 30000
      });
      return res.data?.result?.url || res.data?.url;
    }
  },
  
  // API 8: API-X Team
  {
    name: "api-x",
    audio: async (url) => {
      const res = await axios.get(`https://api-x team.herokuapp.com/api/youtube-mp3?url=${encodeURIComponent(url)}`, {
        timeout: 30000
      });
      return res.data?.result?.url || res.data?.url;
    }
  },
  
  // API 9: Fxc7 API
  {
    name: "fxc7",
    audio: async (url) => {
      const res = await axios.get(`https://api-fxc7.cloud.okteto.net/youtube/mp3?url=${encodeURIComponent(url)}`, {
        timeout: 30000
      });
      return res.data?.url;
    }
  },
  
  // API 10: API BAR Bar
  {
    name: "bar-bar",
    audio: async (url) => {
      const res = await axios.get(`https://api.bar-bar.xyz/api/youtube/mp3?url=${encodeURIComponent(url)}`, {
        timeout: 30000
      });
      return res.data?.result?.url || res.data?.url;
    }
  },
  
  // API 11: Caliph API
  {
    name: "caliph",
    audio: async (url) => {
      const res = await axios.get(`https://api.caliph.biz.id/api/youtube/audio?url=${encodeURIComponent(url)}`, {
        timeout: 30000
      });
      return res.data?.result?.url || res.data?.url;
    }
  },
  
  // API 12: Rintod API
  {
    name: "rintod",
    audio: async (url) => {
      const res = await axios.get(`https://api-rintod.herokuapp.com/api/ytmp3?url=${encodeURIComponent(url)}`, {
        timeout: 30000
      });
      return res.data?.result?.url || res.data?.url;
    }
  },
  
  // API 13: Lolhuman API (sin key para algunos endpoints)
  {
    name: "lolhuman",
    audio: async (url) => {
      const res = await axios.get(`https://api.lolhuman.xyz/api/ytplay?query=${encodeURIComponent(url.split('v=')[1] || '')}`, {
        timeout: 30000,
        headers: {
          'apikey': 'free' // Algunos endpoints permiten 'free'
        }
      });
      return res.data?.result?.audio;
    }
  },
  
  // API 14: Hardianto API
  {
    name: "hardianto",
    audio: async (url) => {
      const res = await axios.get(`https://hardianto.xyz/api/download/ytmp3?url=${encodeURIComponent(url)}&apiKey=hardianto`, {
        timeout: 30000
      });
      return res.data?.result?.url || res.data?.url;
    }
  },
  
  // API 15: Zeks API
  {
    name: "zeks",
    audio: async (url) => {
      const res = await axios.get(`https://api.zeks.me/api/ytmp3?url=${encodeURIComponent(url)}&apikey=apivinz`, {
        timeout: 30000
      });
      return res.data?.result?.url || res.data?.url;
    }
  }
];

// 🎵 Función para extraer ID de YouTube
function extractYouTubeId(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// 🎵 Función mejorada para descargar audio con múltiples APIs
async function downloadYoutubeAudio(url) {
  const videoId = extractYouTubeId(url);
  if (!videoId) {
    return { success: false, error: 'URL de YouTube inválida' };
  }

  console.log(`🎵 [YTMP3] Intentando descargar: ${videoId}`);
  
  // Intentar con cada API en orden
  for (let i = 0; i < APIS.length; i++) {
    const api = APIS[i];
    try {
      console.log(`🎵 [YTMP3] Probando API ${i + 1}: ${api.name}`);
      
      const audioUrl = await api.audio(url);
      
      if (audioUrl && typeof audioUrl === 'string' && audioUrl.includes('http')) {
        console.log(`🎵 [YTMP3] ¡Éxito con API ${api.name}!`);
        return {
          success: true,
          data: {
            title: `YouTube Audio ${videoId}`,
            downloadUrl: audioUrl,
            quality: '320kbps',
            apiUsed: api.name
          }
        };
      }
    } catch (error) {
      console.log(`🎵 [YTMP3] API ${api.name} falló: ${error.message}`);
      // Continuar con la siguiente API
    }
  }
  
  // Si todas las APIs fallan, intentar métodos alternativos
  return await tryAlternativeMethods(url);
}

// 🎵 Métodos alternativos si las APIs fallan
async function tryAlternativeMethods(url) {
  console.log('🎵 [YTMP3] Probando métodos alternativos...');
  
  // Método 1: Usar ytdl-core (si está disponible)
  try {
    const ytdl = (await import('ytdl-core')).default;
    const info = await ytdl.getInfo(url);
    const audioFormat = ytdl.chooseFormat(info.formats, { quality: 'highestaudio' });
    
    if (audioFormat) {
      return {
        success: true,
        data: {
          title: info.videoDetails.title,
          downloadUrl: audioFormat.url,
          quality: `${audioFormat.audioBitrate || 128}kbps`,
          apiUsed: 'ytdl-core'
        }
      };
    }
  } catch (error) {
    console.log('🎵 [YTMP3] ytdl-core falló:', error.message);
  }
  
  // Método 2: Usar el método original como último recurso
  try {
    console.log('🎵 [YTMP3] Intentando método original...');
    const cfApiUrl = 'https://api.nekolabs.web.id/tools/bypass/cf-turnstile';
    const cfPayload = {
      url: 'https://ezconv.cc',
      siteKey: '0x4AAAAAAAi2NuZzwS99-7op'
    };
    
    const { data: cfResponse } = await axios.post(cfApiUrl, cfPayload);
    
    if (cfResponse.success && cfResponse.result) {
      const captchaToken = cfResponse.result;
      const convertApiUrl = 'https://ds1.ezsrv.net/api/convert';
      const convertPayload = {
        url: url,
        quality: '320',
        trim: false,
        startT: 0,
        endT: 0,
        captchaToken: captchaToken
      };
      
      const { data: convertResponse } = await axios.post(convertApiUrl, convertPayload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 60000
      });
      
      if (convertResponse.status === 'done') {
        return {
          success: true,
          data: {
            title: convertResponse.title,
            downloadUrl: convertResponse.url,
            status: convertResponse.status,
            quality: '320kbps',
            apiUsed: 'original'
          }
        };
      }
    }
  } catch (error) {
    console.log('🎵 [YTMP3] Método original falló:', error.message);
  }
  
  return {
    success: false,
    error: 'Todas las APIs fallaron. Intenta más tarde.'
  };
}

// 🎵 Función para buscar música por nombre
async function searchMusicByName(query) {
  try {
    console.log(`🎵 [SEARCH] Buscando: "${query}"`);
    
    const search = await yts(query);
    
    if (!search.videos || !search.videos.length) {
      return {
        success: false,
        error: 'No se encontraron resultados'
      };
    }
    
    // Tomar el primer resultado
    const video = search.videos[0];
    
    return {
      success: true,
      data: {
        title: video.title,
        url: video.url,
        thumbnail: `https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`,
        duration: video.timestamp,
        channel: video.author.name,
        views: video.views.toLocaleString()
      }
    };
    
  } catch (error) {
    console.error(`🎵 [SEARCH] Error:`, error);
    return {
      success: false,
      error: 'Error en la búsqueda'
    };
  }
}

// 🎵 Handler principal para .play (búsqueda por nombre)
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
  
  // 🎵 Verificar si hay búsqueda
  if (!args[0]) {
    await m.react('❓');
    return m.reply(`🎵 *Usa:* .play <nombre de canción>\nEjemplo: .play bad bunny tití me preguntó`);
  }
  
  const searchQuery = args.join(' ');
  
  // 🎵 Activar cooldown
  cooldowns.set(userId, Date.now() + COOLDOWN_TIME);
  
  try {
    await m.react('🔍');
    const searchMsg = await m.reply(`🔍 *Buscando:* "${searchQuery}"\n⚡ *TECH BOT V1* procesando...\n🎵 15 APIs disponibles`);
    
    // 🎵 Buscar música por nombre
    const searchResult = await searchMusicByName(searchQuery);
    
    if (!searchResult.success) {
      cooldowns.delete(userId);
      await m.react('❌');
      await conn.sendMessage(m.chat, {
        text: `❌ *No se encontró:* "${searchQuery}"\n\n⚡ Intenta con otro nombre.`,
        edit: searchMsg.key
      });
      return;
    }
    
    const { title, url, thumbnail, duration, channel, views } = searchResult.data;
    
    // 🎵 Mostrar información del video encontrado
    await conn.sendMessage(m.chat, {
      text: `✅ *VIDEO ENCONTRADO*\n\n🎵 *Título:* ${title}\n👤 *Canal:* ${channel}\n⏱️ *Duración:* ${duration}\n👁️ *Vistas:* ${views}\n\n⚡ *TECH BOT V1* descargando audio...\n🔧 Probando 15 APIs...`,
      edit: searchMsg.key
    });
    
    await m.react('📥');
    
    // 🎵 Descargar audio usando la URL encontrada
    const audioResult = await downloadYoutubeAudio(url);
    
    if (!audioResult.success) {
      cooldowns.delete(userId);
      await m.react('❌');
      await conn.sendMessage(m.chat, {
        text: `❌ *ERROR EN DESCARGA*\n\n${audioResult.error}\n\n⚡ Todas las APIs fallaron. Intenta más tarde.`,
        edit: searchMsg.key
      });
      return;
    }
    
    const { downloadUrl, quality, apiUsed } = audioResult.data;
    
    // 🎵 Limpiar nombre del archivo
    const cleanTitle = title
      .replace(/[^\w\sáéíóúÁÉÍÓÚñÑ]/gi, '')
      .substring(0, 50)
      .trim();
    
    const fileName = `${cleanTitle}.mp3`;
    
    // 🎵 Informar que se está descargando
    await conn.sendMessage(m.chat, {
      text: `📥 *DESCARGANDO AUDIO*\n\n🎵 ${title}\n🔊 Calidad: ${quality}\n🔧 API: ${apiUsed}\n⏳ Descargando...`,
      edit: searchMsg.key
    });
    
    // 🎵 Descargar buffer del audio
    const audioResponse = await fetch(downloadUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 60000
    });
    
    if (!audioResponse.ok) {
      throw new Error(`Error HTTP: ${audioResponse.status}`);
    }
    
    const audioBuffer = await audioResponse.buffer();
    
    if (audioBuffer.length === 0) {
      throw new Error('Audio vacío');
    }
    
    // 🎵 Enviar audio
    await m.react('✅');
    await conn.sendMessage(m.chat, {
      audio: audioBuffer,
      mimetype: 'audio/mpeg',
      fileName: fileName,
      caption: `✅ *AUDIO DESCARGADO*\n\n🎵 ${title}\n🔊 ${quality}\n👤 ${channel}\n⏱️ ${duration}\n🔧 API: ${apiUsed}\n\n⚡ *TECH BOT V1*`,
      quoted: m
    });
    
    // 🎵 Limpiar cooldown después de éxito
    setTimeout(() => {
      cooldowns.delete(userId);
    }, COOLDOWN_TIME);
    
    console.log(`🎵 [PLAY] Audio enviado: ${title} (API: ${apiUsed})`);
    
  } catch (error) {
    console.error(`🎵 [PLAY] Error handler:`, error);
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

// 🎵 Handler para .ytmp3 (URL directa)
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
    return m.reply(`🎵 *Usa:* .ytmp3 <URL de YouTube>\nEjemplo: .ytmp3 https://youtu.be/JiEW1agPqNY`);
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
  
  // 🎵 Activar cooldown
  cooldowns.set(userId, Date.now() + COOLDOWN_TIME);
  
  try {
    await m.react('🔍');
    const processingMsg = await m.reply(`🔍 *PROCESANDO AUDIO*\n\nObteniendo información...\n⚡ *TECH BOT V1* preparando...\n🎵 15 APIs disponibles`);
    
    // 🎵 Descargar audio
    const result = await downloadYoutubeAudio(videoUrl);
    
    if (!result.success) {
      cooldowns.delete(userId);
      await m.react('❌');
      await conn.sendMessage(m.chat, {
        text: `❌ *ERROR EN DESCARGA*\n\n${result.error}\n\n⚡ Intenta con otro video.`,
        edit: processingMsg.key
      });
      return;
    }
    
    const { title, downloadUrl, quality, apiUsed } = result.data;
    
    // 🎵 Limpiar nombre del archivo
    const cleanTitle = title
      .replace(/[^\w\sáéíóúÁÉÍÓÚñÑ]/gi, '')
      .substring(0, 50)
      .trim();
    
    const fileName = `${cleanTitle}.mp3`;
    
    // 🎵 Informar que se está descargando
    await conn.sendMessage(m.chat, {
      text: `📥 *DESCARGANDO AUDIO*\n\n🎵 ${title}\n🔊 Calidad: ${quality}\n🔧 API: ${apiUsed}\n⏳ Descargando archivo...`,
      edit: processingMsg.key
    });
    
    // 🎵 Descargar buffer
    await m.react('📥');
    const audioResponse = await fetch(downloadUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 60000
    });
    
    if (!audioResponse.ok) {
      throw new Error(`Error HTTP: ${audioResponse.status}`);
    }
    
    const audioBuffer = await audioResponse.buffer();
    
    if (audioBuffer.length === 0) {
      throw new Error('Audio vacío');
    }
    
    // 🎵 Enviar audio
    await m.react('✅');
    await conn.sendMessage(m.chat, {
      audio: audioBuffer,
      mimetype: 'audio/mpeg',
      fileName: fileName,
      caption: `✅ *AUDIO DESCARGADO*\n\n🎵 ${title}\n🔊 ${quality}\n🔧 API: ${apiUsed}\n\n⚡ *TECH BOT V1*`,
      quoted: m
    });
    
    // 🎵 Limpiar cooldown después de éxito
    setTimeout(() => {
      cooldowns.delete(userId);
    }, COOLDOWN_TIME);
    
    console.log(`🎵 [YTMP3] Audio enviado: ${title} (API: ${apiUsed})`);
    
  } catch (error) {
    console.error(`🎵 [YTMP3] Error handler:`, error);
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

// 🎵 Comandos para .play (búsqueda por nombre)
handler.help = ['play <nombre de canción>'];
handler.tags = ['dl', 'audio'];
handler.command = ['play', 'p', 'musica'];

// 🎵 Comandos para .ytmp3 (URL directa)
handler2.help = ['ytmp3 <URL de YouTube>'];
handler2.tags = ['dl', 'audio'];
handler2.command = ['ytmp3', 'yta', 'ytaudio'];

export default handler;
export { handler2 };