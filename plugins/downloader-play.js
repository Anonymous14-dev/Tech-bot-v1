import yts from "yt-search"
import fetch from "node-fetch"

const handler = async (m, { conn, text, command }) => {
  if (!text) return m.reply(`☯️ *Shadow-BOT-MD — Protocolo de Invocación*

Pronuncia el nombre del video o entrega el vínculo de YouTube...
y la sombra ejecutará tu voluntad.`)

  await m.react("🌌")

  try {
    let url = text
    let title = "Desconocido"
    let authorName = "Desconocido"
    let durationTimestamp = "Desconocida"
    let views = "Desconocidas"
    let thumbnail = ""

    if (!text.startsWith("https://")) {
      const res = await yts(text)
      if (!res || !res.videos || res.videos.length === 0) {
        return m.reply(`☯️ *Shadow-BOT-MD — Protocolo de Invocación*

Nada fue hallado en las tinieblas...
Intenta con un nombre más preciso.`)
      }

      const video = res.videos[0]
      title = video.title || title
      authorName = video.author?.name || authorName
      durationTimestamp = video.timestamp || durationTimestamp
      views = video.views || views
      url = video.url || url
      thumbnail = video.thumbnail || ""
    }

    const isAudio = ["play", "playaudio", "ytmp3"].includes(command)
    const isVideo = ["play2", "playvid", "ytv", "ytmp4"].includes(command)

    if (isAudio) {
      await downloadMedia(conn, m, url, title, thumbnail, "mp3")
    } else if (isVideo) {
      await downloadMedia(conn, m, url, title, thumbnail, "mp4")
    } else {
      await m.reply(`☯️ *Shadow-BOT-MD — Análisis de Objetivo*

『🎭』 Título: ${title}
✦ Canal: ${authorName}
✦ Duración: ${durationTimestamp}
✦ Vistas: ${views}

Comandos disponibles:
• .ytmp3 ${url}
• .ytmp4 ${url}`)
    }

  } catch (error) {
    console.error("Error general:", error)
    await m.reply(`☯️ *Shadow-BOT-MD — Falla en la ejecución*

Algo perturbó el flujo de las sombras...
Error: ${error.message}`)
    await m.react("⚠️")
  }
}

const downloadMedia = async (conn, m, url, title, thumbnail, type) => {
  try {
    const cleanTitle = cleanName(title) + (type === "mp3" ? ".mp3" : ".mp4")

    const msg = `☯️ *Shadow-BOT-MD — Descarga en curso*

『🎭』 Título: ${title}
Invocando tu ${type === "mp3" ? "audio espectral" : "video oculto"}...`

    if (thumbnail) {
      await conn.sendMessage(m.chat, { image: { url: thumbnail }, caption: msg }, { quoted: m })
    } else {
      await m.reply(msg)
    }

    const apiUrl = `https://mayapi.ooguy.com/ytdl?url=${encodeURIComponent(url)}&type=${type}&apikey=may-de618680`
    const response = await fetch(apiUrl)
    const data = await response.json()

    if (!data || !data.status || !data.result || !data.result.url) {
      throw new Error("No se pudo obtener el archivo desde las sombras.")
    }

    if (type === "mp3") {
      await conn.sendMessage(m.chat, {
        audio: { url: data.result.url },
        mimetype: "audio/mpeg",
        fileName: cleanTitle
      }, { quoted: m })
    } else {
      await conn.sendMessage(m.chat, {
        video: { url: data.result.url },
        mimetype: "video/mp4",
        fileName: cleanTitle
      }, { quoted: m })
    }

    const doneMsg = `☯️ *Shadow-BOT-MD — Transferencia completada*

『🎭』 Título: ${data.result.title || title}
✦ Tipo: ${type === "mp3" ? "Audio" : "Video"}
✦ Estado: Descargado con precisión letal.

Disfrútalo... como si fuera el último eco de tu misión.`

    await m.reply(doneMsg)
    await m.react("✅")

  } catch (error) {
    console.error("Error descargando:", error)
    const errorMsg = `☯️ *Shadow-BOT-MD — Error en la operación*

『🎭』 Título: ${title}
Algo falló en la ejecución...
${error.message}`

    await m.reply(errorMsg)
    await m.react("❌")
  }
}

const cleanName = (name) => name.replace(/[^\w\s-_.]/gi, "").substring(0, 50)

handler.command = handler.help = ["play", "playaudio", "ytmp3", "play2", "playvid", "ytv", "ytmp4", "yt"]
handler.tags = ["descargas"]
handler.register = true

export default handler