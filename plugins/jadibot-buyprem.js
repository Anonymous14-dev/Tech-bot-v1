let handler = async (m, { conn }) => {
  
  let link = await conn.groupInviteCode(m.chat)
  m.reply(`✨ *ACTIVACIÓN DE PREMIUM*\n\n> Con el sistema premium tendrás muchos más beneficios: Descargas ilimitadas, Descargas de pinterest, acceso a funciones premium, ¡Y muchas cosas mas!\n\n\n*Actívalo desde aquí:*\n\n✳️ *PayPal:*\nhttps:\/\/www.paypal.me\/master679835\n\n\n👤 *Contacto:*\nwa.me\/5492644893953 (Owner)\n\n💲 *Precios Mensuales:*\n\n*$1455 USD* x20d\n*$7256 COP* x30d\n*$29,025 ARS* x80d`)
}

handler.help = ['buyprem']
handler.tags = ['jadibot']
handler.command = ['comprarpremium', 'buyprem']

export default handler
