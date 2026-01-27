import axios from 'axios';

// 🎬 Función para descargar videos de YouTube
async function ytdl(url) {
  try {
    const res = await axios.post('https://api.vidssave.com/api/contentsite_api/media/parse',
      new URLSearchParams({
        auth: '20250901majwlqo',
        domain: 'api-ak.vidssave.com',
        origin: 'cache',
        link: url
      }).toString(),
      {
        headers: {
          'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36',
          'content-type': 'application/x-www-form-urlencoded',
          origin: 'https://vidssave.com',
          referer: 'https://vidssave.com/'
        },
        timeout: 30000 // 30 segundos timeout
      }
    );

    const { title, thumbnail, duration, resources } = res.data.data;

    return {
      success: true,
      data: {
        title,
        thumbnail,
        duration,
        formats: resources.map(r => ({
          type: r.type,
          quality: r.quality,
          format: r.format,
          size: r.size,
          url: r.download_url
        }))
      }
    };
    
  } catch (error) {
    console.error('🎬 [YTDL] Error:', error.message);
    return {
      success: false,
      error: error.message || 'Error desconocido'
    };
  }
}

// 🎬 Handler principal para descargar video
let handler = async (m, { conn, args }) => {
  // 🎬 Verificar URL
  if (!args[0]) {
    await m.react('❓');
    return m.reply(`🎬 *Usa:* .ytdl <URL de YouTube>\nEjemplo: .ytdl https://youtu.be/gvunApwKIiY`);
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
  
  try {
    await m.react('🔍');
    const processingMsg = await m.reply(`🔍 *ANALIZANDO VIDEO*\n\nObteniendo información...\n⚡ *TECH BOT V1* procesando...`);
    
    // 🎬 Obtener información del video
    const result = await ytdl(videoUrl);
    
    if (!result.success) {
      await m.react('❌');
      await conn.sendMessage(m.chat, {
        text: `❌ *ERROR EN ANÁLISIS*\n\n${result.error}\n\n⚡ Intenta con otro video.`,
        edit: processingMsg.key
      });
      return;
    }
    
    const { title, thumbnail, duration, formats } = result.data;
    
    // 🎬 Separar formatos de video y audio
    const videoFormats = formats.filter(f => f.type === 'video');
    const audioFormats = formats.filter(f => f.type === 'audio');
    
    // 🎬 Encontrar el mejor video (mayor calidad)
    const bestVideo = videoFormats.sort((a, b) => {
      const qualA = parseInt(a.quality) || 0;
      const qualB = parseInt(b.quality) || 0;
      return qualB - qualA;
    })[0];
    
    // 🎬 Encontrar el mejor audio (mayor calidad)
    const bestAudio = audioFormats.sort((a, b) => {
      const qualA = parseInt(a.quality) || 0;
      const qualB = parseInt(b.quality) || 0;
      return qualB - qualA;
    })[0];
    
    if (!bestVideo) {
      await m.react('❌');
      await conn.sendMessage(m.chat, {
        text: `❌ *VIDEO NO DISPONIBLE*\n\nNo se encontraron formatos de video para descargar.`,
        edit: processingMsg.key
      });
      return;
    }
    
    // 🎬 Mostrar información del video
    const videoInfo = `✅ *INFORMACIÓN DEL VIDEO*\n\n📛 *Título:* ${title}\n⏱️ *Duración:* ${duration}\n🎬 *Calidad:* ${bestVideo.quality}\n📊 *Tamaño:* ${bestVideo.size}\n\n⚡ *Selecciona formato:*`;
    
    // 🎬 Botones para seleccionar formato
    const buttons = [];
    
    // Botón para descargar video
    if (bestVideo) {
      buttons.push({
        buttonId: `.download ${bestVideo.url} video ${title}`,
        buttonText: { displayText: `🎬 Video (${bestVideo.quality})` },
        type: 1
      });
    }
    
    // Botón para descargar audio
    if (bestAudio) {
      buttons.push({
        buttonId: `.download ${bestAudio.url} audio ${title}`,
        buttonText: { displayText: `🎵 Audio (${bestAudio.quality})` },
        type: 1
      });
    }
    
    // Botón para ver más formatos
    if (videoFormats.length > 1 || audioFormats.length > 1) {
      buttons.push({
        buttonId: `.formatos ${videoUrl}`,
        buttonText: { displayText: `📊 Más formatos` },
        type: 1
      });
    }
    
    // 🎬 Enviar información con thumbnail
    try {
      await conn.sendMessage(
        m.chat,
        {
          image: { url: thumbnail },
          caption: videoInfo,
          buttons: buttons,
          footer: "⚡ TECH BOT V1 - Descargas YouTube",
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
          text: videoInfo,
          buttons: buttons,
          footer: "⚡ TECH BOT V1 - Descargas YouTube",
          headerType: 1
        },
        { quoted: m }
      );
      
      await m.react('✅');
    }
    
  } catch (error) {
    console.error('🎬 [YTDL] Error handler:', error);
    await m.react('💥');
    await m.reply(`❌ *Error:* ${error.message}`);
  }
}

// 🎬 Handler para descargar el archivo
let handler2 = async (m, { conn, args }) => {
  if (!args[0]) {
    return m.reply('❌ *URL no proporcionada*');
  }
  
  try {
    await m.react('📥');
    const downloadMsg = await m.reply(`📥 *DESCARGANDO ARCHIVO*\n\nPor favor espera...\n⚡ *TECH BOT V1* descargando...`);
    
    const downloadUrl = args[0];
    const type = args[1] || 'video';
    const title = args.slice(2).join(' ') || 'video_descargado';
    
    // 🎬 Descargar archivo
    const response = await axios({
      method: 'GET',
      url: downloadUrl,
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36'
      },
      timeout: 120000 // 2 minutos timeout
    });
    
    const fileBuffer = Buffer.from(response.data);
    
    if (fileBuffer.length === 0) {
      throw new Error('Archivo vacío');
    }
    
    // 🎬 Limpiar nombre del archivo
    const cleanTitle = title
      .replace(/[^\w\sáéíóúÁÉÍÓÚñÑ]/gi, ' ')
      .substring(0, 50)
      .trim();
    
    const extension = type === 'audio' ? 'mp3' : 'mp4';
    const fileName = `${cleanTitle}.${extension}`;
    const mimeType = type === 'audio' ? 'audio/mpeg' : 'video/mp4';
    
    // 🎬 Enviar archivo
    await m.react('✅');
    
    if (type === 'audio') {
      await conn.sendMessage(m.chat, {
        audio: fileBuffer,
        mimetype: mimeType,
        fileName: fileName,
        caption: `✅ *AUDIO DESCARGADO*\n\n📛 ${cleanTitle}\n🎵 Calidad: ${args[1] || 'alta'}\n\n⚡ *TECH BOT V1*`,
        quoted: m
      });
    } else {
      await conn.sendMessage(m.chat, {
        video: fileBuffer,
        mimetype: mimeType,
        fileName: fileName,
        caption: `✅ *VIDEO DESCARGADO*\n\n📛 ${cleanTitle}\n🎬 Calidad: ${args[1] || 'alta'}\n\n⚡ *TECH BOT V1*`,
        quoted: m
      });
    }
    
    // 🎬 Eliminar mensaje de progreso
    try {
      await conn.sendMessage(m.chat, {
        delete: {
          remoteJid: m.chat,
          fromMe: true,
          id: downloadMsg.key.id,
          participant: downloadMsg.key.participant
        }
      });
    } catch {}
    
  } catch (error) {
    console.error('🎬 [DOWNLOAD] Error:', error);
    await m.react('❌');
    await m.reply(`❌ *Error en descarga:* ${error.message}`);
  }
}

// 🎬 Handler para ver todos los formatos
let handler3 = async (m, { conn, args }) => {
  if (!args[0]) {
    return m.reply('❌ *URL no proporcionada*');
  }
  
  try {
    const result = await ytdl(args[0]);
    
    if (!result.success) {
      return m.reply(`❌ *Error:* ${result.error}`);
    }
    
    const { title, formats } = result.data;
    
    // 🎬 Separar formatos
    const videoFormats = formats.filter(f => f.type === 'video');
    const audioFormats = formats.filter(f => f.type === 'audio');
    
    let message = `📊 *FORMATOS DISPONIBLES*\n\n📛 *Título:* ${title}\n\n`;
    
    if (videoFormats.length > 0) {
      message += `🎬 *VIDEOS:*\n`;
      videoFormats.forEach((f, i) => {
        message += `${i + 1}. ${f.quality} - ${f.format} - ${f.size}\n`;
      });
      message += '\n';
    }
    
    if (audioFormats.length > 0) {
      message += `🎵 *AUDIOS:*\n`;
      audioFormats.forEach((f, i) => {
        message += `${i + 1}. ${f.quality} - ${f.format} - ${f.size}\n`;
      });
    }
    
    message += `\n⚡ *Usa:* .download <url> <tipo> <titulo>`;
    
    await m.reply(message);
    
  } catch (error) {
    await m.reply(`❌ *Error:* ${error.message}`);
  }
}

// 🎬 Comandos
handler.help = ['ytdl <URL de YouTube>'];
handler.tags = ['dl', 'video', 'audio'];
handler.command = ['ytdl', 'youtubedl', 'ytdownload'];

handler2.help = ['ytmp4 <url> <tipo> <titulo>'];
handler2.tags = ['dl'];
handler2.command = ['ytmp4', 'descargar'];

handler3.help = ['formatos <URL>'];
handler3.tags = ['dl'];
handler3.command = ['formatos', 'formatlist'];

export default handler;
export { handler2, handler3 };