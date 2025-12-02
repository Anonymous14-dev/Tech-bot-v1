mport axios from 'axios'
import fs from 'fs'
const premiumFile = './json/premium.json'

if (!fs.existsSync(premiumFile)) fs.writeFileSync(premiumFile, JSON.stringify([]), 'utf-8')

function isBotPremium(conn) {
  try {
    let data = JSON.parse(fs.readFileSync(premiumFile))
    let botId = conn?.user?.id?.split(':')[0]
    return data.includes(botId)
  } catch {
    return false
  }
}

const handler = async (m, { conn, args, usedPrefix, text, command }) => {
  if (!isBotPremium(conn)) {
    return m.reply('⚠️ *Se necesita que el bot sea premium.*\n> Usa *_.buyprem_* para activarlo.')
  }
  if (!text) return m.reply(`⏳ Ingresa una búsqueda para TikTok\n> *Ejemplo:* ${usedPrefix + command} https://vm.tiktok.com/ZMHTskG42AYo4-1ppUy/`)

  let url = `https://api-adonix.ultraplus.click/download/tiktok?apikey=DemonKeytechbot&url=${encodeURIComponent(text)}`
  let res = await axios.get(url)
  let json = res.data

  if (!json.status || !json.data) return m.reply('❌ No se encontró ningún video.')

  let vid = json.data

  let caption = `📎 \`${vid.title}\`\n\n` +
                `👤 *Autor:* » ${vid.author.name}\n` +
                `👍 *Likes:* » ${vid.likes}\n` +
                `💬 *Comentarios:* » ${vid.comments}\n` +
                `🔄 *Compartidos:* » ${vid.shares}\n` +
                `👀 *Vistas:* » ${vid.views.toLocaleString()}`

  await conn.sendMessage(m.chat, {
    video: { url: vid.video },
    caption
  }, { quoted: m })
}

handler.help = ['tiktokvid']
handler.tags = ['downloader']
handler.command = ['tiktokvid', 'playtiktok']
handler.register = true
export default handler