const handler = async (msg, { conn }) => {
  try {
    const chatId = msg.key.remoteJid
    const sender = (msg.key.participant || msg.key.remoteJid).replace(/[^0-9]/g, '')
    const isGroup = chatId.endsWith('@g.us')
    const isBotMessage = msg.key.fromMe

    await conn.sendMessage(chatId, { react: { text: '🔊', key: msg.key } })

    if (!isGroup) {
      await conn.sendMessage(chatId, {
        text: '⚠️ *Este comando solo se puede usar en grupos.*'
      }, { quoted: msg })
      return
    }

    const metadata = await conn.groupMetadata(chatId)
    const participant = metadata.participants.find(p => p.id.includes(sender))
    const isAdmin = participant?.admin === 'admin' || participant?.admin === 'superadmin'

    const participants = metadata.participants
    const mentionList = participants.map(p => `➪ @${p.id.split('@')[0]}`).join('\n')
    const messageText = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
    const args = messageText.trim().split(' ').slice(1)
    const extraMsg = args.join(' ') 

    let finalMsg = '*📢 ATENCIÓN 📢* \n'
    finalMsg += '\n'
    if (extraMsg.trim().length > 0) {
      finalMsg += `\n❑ *Mensaje :* ${extraMsg}\n\n`
    } else {
      finalMsg += '\n'
    }
    finalMsg += mentionList

    const mentionIds = participants.map(p => p.id)

    await conn.sendMessage(chatId, {
      text: finalMsg,
      mentions: mentionIds
    }, { quoted: msg })

  } catch (error) {
    console.error('❌ Error en el comando tagall:', error)
    await conn.sendMessage(msg.key.remoteJid, {
      text: '❌ Ocurrió un error al ejecutar el comando tagall.'
    }, { quoted: msg })
  }
}

handler.tags = ['group']
handler.help = ['invocar < mensaje opcional >']
handler.admin = true
handler.command = ['tagall', 'invocar', 'todos']
handler.group = true

export default handler
