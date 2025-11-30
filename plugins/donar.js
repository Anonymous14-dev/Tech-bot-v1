var handler = async (m, { conn }) => {
  
  if (m.text === '.donar') {
    const paypalLink = 'https://www.paypal.me/master679835'
    
    await conn.reply(m.chat, 
      `🌟 *APOYA EL MANTENIMIENTO DEL BOT* 🌟\n\n` +
      `¡Hola! Si el bot te ha sido útil y quieres contribuir para su mejora y mantenimiento continuo, puedes hacerlo mediante una donación. Tu apoyo nos ayuda a:\n\n` +
      `💠 *Mantener los servidores activos y estables*\n` +
      `💠 *Implementar nuevas funciones y comandos*\n` +
      `💠 *Mejorar el rendimiento y velocidad*\n` +
      `💠 *Solucionar errores y mantener actualizaciones*\n` +
      `💠 *Garantizar que el bot esté siempre disponible*\n\n` +
      `🔗 *Enlace de Donación PayPal:*\n${paypalLink}\n\n` +
      `*¡Cualquier aporte, por pequeño que sea, es de gran ayuda!* 🙏\n\n` +
      `*Gracias por tu apoyo y confianza* 💖\n` +
      `_El equipo de desarrollo agradece tu contribución_`, 
    m)
    m.react('💖')
    return
  }
}

handler.help = ['donar']
handler.tags = ['main']
handler.command = ['donar', 'donate', 'apoyar', 'donacion']

export default handler