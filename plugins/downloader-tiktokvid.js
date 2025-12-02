import axios from 'axios'
import fs from 'fs'
const premiumFile = './json/premium.json'

// Aseguramos archivo
if (!fs.existsSync(premiumFile)) fs.writeFileSync(premiumFile, JSON.stringify([]), 'utf-8')

// Función de verificación
function isBotPremium(conn) {
  try {
    let data = JSON.parse(fs.readFileSync(premiumFile))
    let botId = conn?.user?.id?.split(':')[0] // extraemos el numérico del JID
    return data.includes(botId)
  } catch {
    return false
  }
}

const handler = async (m, { conn, args, usedPrefix, text, command }) => {
  if (!isBotPremium(conn)) {
    return m.reply('⚠️ *Se necesita que el bot sea premium.*\n> Usa *_.buyprem_* para activarlo.')
  }
  if (!text) return m.reply(`⏳ Ingresa una búsqueda para TikTok\n> *Ejemplo:* ${usedPrefix + command} haikyuu edit`)

  try {
    // Nueva API con parámetro de búsqueda
    let res = await fetch(`https://api-adonix.ultraplus.click/download/tiktok?apikey=DemonKeytechbot&q=${encodeURIComponent(text)}`)
    let json = await res.json()
    
    // Verificación de la estructura de respuesta
    if (!json.status || !json.data || !json.data.url) {
      return m.reply('❌ No se encontró ningún video o la API no devolvió datos válidos.')
    }

    let vid = json.data
    
    let caption = `📎 \`${vid.title || 'Sin título'}\`\n\n` +
                  `👤 *Autor:* » ${vid.author || 'Desconocido'}\n` +
                  `👀 *Vistas:* » ${vid.views ? vid.views.toLocaleString() : 'N/A'}\n` +
                  `📎 *Link:* » ${vid.url}`

    await conn.sendMessage(m.chat, {
      video: { url: vid.url },
      caption
    }, { quoted: m })
    
  } catch (error) {
    console.error(error)
    return m.reply('❌ Error al procesar la solicitud. Intenta más tarde.')
  }
}

handler.help = ['tiktokvid']
handler.tags = ['downloader']
handler.command = ['tiktokvid', 'playtiktok']
handler.register = true
export default handler