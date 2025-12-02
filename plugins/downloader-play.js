import yts from "yt-search"
import fetch from "node-fetch"

const handler = async (m, { conn, text, command }) => {
  if (!text) return m.reply(`☯️ *Tech bot v1 — está buscando tu pedido*

Pronuncia el nombre del video o entrega el vínculo de YouTube..`)

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
        return m.reply(`☯️ *Tech bot v1 — Protocolo te envio*

Nada fue encontrado...
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
      await m.reply(`☯️ *Tech bot v1— Análisis de Objetivo*

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
    await m.reply(`☯️ *Tech bot v1— Falla en la ejecución*

Algo perturbó el flujo de las sombras...
Error: ${error.message}`)
    await m.react("⚠️")
  }
}

const downloadMedia = async (conn, m, url, title, thumbnail, type) => {
  try {
    const cleanTitle = cleanName(title) + (type === "mp3" ? ".mp3" : ".mp4")

    const msg = `☯️ *tech bot v1 — Descarga en curso*

『🎭』 Título: ${title}
Invocando tu ${type === "mp3" ? "audio espectral" : "video oculto"}...`

    if (thumbnail) {
      await conn.sendMessage(m.chat, { image: { url: thumbnail }, caption: msg }, { quoted: m })
    } else {
      await m.reply(msg)
    }

    // uwu Nueva API para audio att: shadow uwu
    let apiUrl
    if (type === "mp3") {
      apiUrl = `https://api-adonix.ultraplus.click/download/ytaudio?apikey=DemonKeytechbot&url=${encodeURIComponent(url)}`
    } else {
      // si quieres también video, aquí puedes poner otra API de video
      throw new Error("Solo está configurada la API para audio (mp3).")
    }

    const response = await fetch(apiUrl)
    const data = await response.json()

    if (!data || !data.status || !data.result || !data.result.url) {
      throw new Error("No se pudo obtener el archivo, hay un error en la API.")
    }

    if (type === "mp3") {
      await conn.sendMessage(m.chat, {
        audio: { url: data.result.url },
        mimetype: "audio/mpeg",
        fileName: cleanTitle
      }, { quoted: m })
    }

    const doneMsg = `☯️ *Tech bot v1— Transferencia completada*

『🎭』 Título: ${data.result.title || title}
✦ Tipo: Audio
✦ Estado: Descargado con precisión letal.

Disfrútalo... como si fuera el último día en la tierra.`

    await m.reply(doneMsg)
    await m.react("✅")

  } catch (error) {
    console.error("Error descargando:", error)
    const errorMsg = `☯️ *Tech bot v1 — Error en la operación*

『🎭』 Título: ${title}
Algo falló en la ejecución...
${error.message}`

    await m.reply(errorMsg)
    await m.react("❌")
  }
}

const cleanName = (name) => name.replace(/[^\w\s-_.]/gi, "").substring(0, 50)

handler.command = handler.help = ["play", "playaudio", "ytmp3"]
handler.tags = ["descargas"]
handler.register = true

export default handler