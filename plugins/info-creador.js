var handler = async (m, { conn }) => {

  if (m.text === '.creador') {
    const contacto = `
🤖 *¿QUIERES CONTACTAR A MI CREADOR?* 🤖

👤 *nombre*  *WILKER OFC*
📞 *Numero:* +5492644893953
🔔 *Lenguajes* Node.js Python.py

💫 *NOTA IMPORTANTE:*

¿Tienes preguntas, dudas o sugerencias sobre el funcionamiento de *tech bot*? Puedes contactar a mis creadores.

*Una cosa:* Los bots no descansan, pero yo sí, así que no me andes mandando mensaje a las 3am porque no te voy a contestar… 😴

_¡Gracias por tu comprensión!_ 💖
    `.trim()

    await conn.reply(m.chat, contacto, m)
    m.react('📞')
    return
  }
}

handler.help = ['creador']
handler.tags = ['main']
handler.command = ['creador', 'owner', 'creador', 'developer', 'desarrollador']

export default handler