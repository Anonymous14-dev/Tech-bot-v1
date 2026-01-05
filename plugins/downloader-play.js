import yts from "yt-search"
import fetch from "node-fetch"
import fs from "fs"
import path from "path"

const handler = async (m, { conn, text, command }) => {
  if (!text) return m.reply(`👻 *Michi wabot invocando*

🤍 Pronuncia el nombre del video o entrega el enlace de YouTube.`)

  await m.react("⏰")

  try {
    let url = text
    let title = "Desconocido"
    let authorName = "Desconocido"
    let durationTimestamp = "Desconocida"
    let views = "Desconocidas"
    let thumbnail = ""

    if (!text.startsWith("https://")) {
      const res = await yts(text)
      if (!res?.videos?.length) {
        return m.reply(`👻 *Michi wabot buscando*

🖤 Nada fue encontrado…`)
      }

      const video = res.videos[0]
      title = video.title
      authorName = video.author?.name
      durationTimestamp = video.timestamp
      views = video.views
      url = video.url
      thumbnail = video.thumbnail
    }

    const isAudio = ["play", "playaudio", "ytmp3"].includes(command)
    const isVideo = ["play2", "playvid", "ytv", "ytmp4"].includes(command)

    if (isAudio) {
      await downloadMedia(conn, m, url, title, thumbnail, "mp3")
    } else if (isVideo) {
      await downloadMedia(conn, m, url, title, thumbnail, "mp4")
    } else {
      await m.reply(`👻 *Michi wabot — Análisis navideño*

🖤 *Título:* ${title}
🔔 *Canal:* ${authorName}
🎬 *Duración:* ${durationTimestamp}
👁️ *Vistas:* ${views}

Comandos disponibles:
• *.ytmp3 ${url}*
• *.ytmp4 ${url}*`)
    }

  } catch (error) {
    await m.reply(`👻 *Michi wabot — Error en la operación*

❌ ${error.message}`)
    await m.react("⚠️")
  }
}

const downloadMedia = async (conn, m, url, title, thumbnail, type) => {
  let filePath = null
  
  try {
    const cleanTitle = cleanName(title) + (type === "mp3" ? ".mp3" : ".mp4")
    const tmpDir = "./tmp"
    
    // Crear directorio tmp si no existe
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true })
    }
    
    filePath = path.join(tmpDir, cleanTitle)

    const msg = `👻 *Michi wabot — Descarga en curso*

🤍 *Título:* ${title}
🖤 Preparando tu ${type === "mp3" ? "audio navideño" : "video festivo"}...`

    let sent
    if (thumbnail) {
      sent = await conn.sendMessage(
        m.chat,
        { image: { url: thumbnail }, caption: msg },
        { quoted: m }
      )
    } else {
      sent = await conn.sendMessage(
        m.chat,
        { text: msg },
        { quoted: m }
      )
    }

    // Array de APIs con sus configuraciones
    const apis = [
      {
        name: "GawrGura API",
        url: `https://gawrgura-api.onrender.com/download/ytdl?url=${encodeURIComponent(url)}`,
        extract: (data) => ({
          url: type === "mp3" ? data.result.mp3 : data.result.mp4,
          title: data.result.title
        })
      },
      {
        name: "Ootaizumi API",
        url: `https://api.ootaizumi.web.id/downloader/youtube/play?query=${encodeURIComponent(url)}`,
        extract: (data) => ({
          url: data.result.download,
          title: data.result.title
        })
      },
      {
        name: "Adonix API",
        url: type === "mp3"
          ? `https://api-adonix.ultraplus.click/download/ytaudio?url=${encodeURIComponent(url)}&apikey=WilkerKeydukz9l6871`
          : `https://api-adonix.ultraplus.click/download/ytvideo?url=${encodeURIComponent(url)}&apikey=WilkerKeydukz9l6871`,
        extract: (data) => ({
          url: data.data.url,
          title: data.data.title
        })
      }
    ]

    let fileUrl = null
    let fileTitle = title
    let usedApi = null

    // Intentar con cada API hasta encontrar una que funcione
    for (const api of apis) {
      try {
        const response = await fetch(api.url)
        const data = await response.json()

        if (data?.status && data.status === true) {
          const extracted = api.extract(data)
          if (extracted.url) {
            fileUrl = extracted.url
            fileTitle = extracted.title || title
            usedApi = api.name
            break
          }
        }
      } catch (apiError) {
        console.log(`Error con ${api.name}: ${apiError.message}`)
        continue
      }
    }

    if (!fileUrl) {
      throw new Error("Ninguna API pudo procesar la solicitud. Intenta más tarde.")
    }

    // Descargar el archivo a tmp/
    const fileResponse = await fetch(fileUrl)
    if (!fileResponse.ok) {
      throw new Error(`Error al descargar el archivo: ${fileResponse.statusText}`)
    }

    const buffer = await fileResponse.buffer()
    fs.writeFileSync(filePath, buffer)

    // Enviar el archivo desde tmp/
    if (type === "mp3") {
      await conn.sendMessage(
        m.chat,
        {
          audio: fs.readFileSync(filePath),
          mimetype: "audio/mpeg",
          fileName: cleanTitle
        },
        { quoted: m }
      )
    } else {
      await conn.sendMessage(
        m.chat,
        {
          video: fs.readFileSync(filePath),
          mimetype: "video/mp4",
          fileName: cleanTitle
        },
        { quoted: m }
      )
    }

    await conn.sendMessage(
      m.chat,
      {
        text: `👻 *Michi wabot — Operación completada*

🤍 *Título:* ${fileTitle}
🖤 Entregado con magia navideña.
🔮 *API:* ${usedApi}`,
        edit: sent.key
      }
    )

    await m.react("✅")

  } catch (error) {
    await m.reply(`👻 *Michi wabot — Falla en la entrega*

❌ ${error.message}`)
    await m.react("❌")
  } finally {
    // Limpiar archivo temporal después de enviar
    if (filePath && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath)
      } catch (cleanError) {
        console.log(`Error al limpiar archivo: ${cleanError.message}`)
      }
    }
  }
}

const cleanName = (name) => name.replace(/[^\w\s-_.]/gi, "").substring(0, 50)

handler.command = handler.help = ["play", "playaudio", "ytmp3", "play2", "playvid", "ytv", "ytmp4", "yt"]
handler.tags = ["descargas"]
handler.register = false

export default handler