import yts from "yt-search"
import fetch from "node-fetch"

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
        return m.reply(`👻 *Michi bot buscando*

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

    // Solo procesar comandos de video
    await downloadVideo(conn, m, url, title, thumbnail)

  } catch (error) {
    await m.reply(`👻 *Michi bot — Error en la operación*

❌ ${error.message}`)
    await m.react("⚠️")
  }
}

const downloadVideo = async (conn, m, url, title, thumbnail) => {
  try {
    const cleanTitle = cleanName(title) + ".mp4"

    const msg = `👻 *Michi bot — Descarga en curso*

🤍 *Título:* ${title}
🖤 Preparando tu video festivo...`

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

    const apiUrl = `https://api-adonix.ultraplus.click/download/ytvideo?url=${encodeURIComponent(url)}&apikey=WilkerKeydukz9l6871`

    const response = await fetch(apiUrl)
    const data = await response.json()

    if (!data?.status || !data?.data?.url) {
      throw new Error("La API no devolvió un archivo válido.")
    }

    const fileUrl = data.data.url
    const fileTitle = data.data.title || title

    await conn.sendMessage(
      m.chat,
      {
        video: { url: fileUrl },
        mimetype: "video/mp4",
        fileName: cleanTitle
      },
      { quoted: m }
    )

    await conn.sendMessage(
      m.chat,
      {
        text: `👻 *Michi bot — Operación completada*

🤍 *Título:* ${fileTitle}
🖤 Entregado con magia navideña.`,
        edit: sent.key
      }
    )

    await m.react("✅")

  } catch (error) {
    await m.reply(`🙃 Michi bot — Falla en la entrega*

❌ ${error.message}`)
    await m.react("❌")
  }
}

const cleanName = (name) => name.replace(/[^\w\s-_.]/gi, "").substring(0, 50)

// Solo comandos de video
handler.command = handler.help = ["play2", "playvid", "ytv", "ytmp4"]
handler.tags = ["descargas"]
handler.register = false

export default handler