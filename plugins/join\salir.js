import fetch from 'node-fetch';

const handler = async (m, { conn, args, command, usedPrefix, isOwner }) => {
  try {
    if (command === 'join') {
      if (!isOwner) return m.reply('❌ Este comando es solo para el owner del bot.');
      
      const link = args[0];
      if (!link) return m.reply(`❌ Por favor, proporciona un enlace de grupo.\nEjemplo: ${usedPrefix}join https://chat.whatsapp.com/...`);
      
      if (!link.includes('chat.whatsapp.com')) return m.reply('❌ Enlace inválido. Debe ser un enlace de WhatsApp.');

      await m.reply('🔄 Uniendo al grupo...');
      
      const code = link.split('/').pop();
      const joinResult = await conn.groupAcceptInvite(code)
        .then(() => '✅ *Bot unido al grupo exitosamente.*')
        .catch(err => {
          console.error(err);
          return `❌ Error al unirse: ${err.message || 'Enlace inválido o expirado'}`;
        });
      
      await m.reply(joinResult);
    }

    if (command === 'salir' || command === 'leave') {
      if (!isOwner) return m.reply('❌ Este comando es solo para el owner del bot.');
      
      const groupId = m.isGroup ? m.chat : (args[0] ? args[0].replace('@', '') + '@g.us' : null);
      
      if (!groupId && !m.isGroup) {
        return m.reply(`❌ Debes usar este comando en un grupo o proporcionar el ID del grupo.\nEjemplo: ${usedPrefix}salir 123456789@g.us`);
      }
      
      await m.reply('👋 Saliendo del grupo...');
      
      try {
        await conn.groupLeave(groupId || m.chat);
        await m.reply('✅ *Bot ha salido del grupo exitosamente.*');
      } catch (err) {
        console.error(err);
        await m.reply(`❌ Error al salir: ${err.message}`);
      }
    }
    
    if (command === 'grupos' || command === 'groups') {
      if (!isOwner) return m.reply('❌ Este comando es solo para el owner del bot.');
      
      const groups = await conn.groupFetchAllParticipating();
      const groupList = Object.values(groups)
        .map((group, i) => 
          `*${i + 1}.* ${group.subject || 'Sin nombre'}\n   👥 *Participantes:* ${group.participants.length}\n   🆔 *ID:* ${group.id}\n   🔗 *Enlace:* ${group.id ? 'https://chat.whatsapp.com/' + (await conn.groupInviteCode(group.id)) : 'No disponible'}\n`
        )
        .join('\n');
      
      await m.reply(`📋 *GRUPOS DONDE ESTÁ EL BOT*\n\n${groupList || '❌ No hay grupos.'}\n\n📊 *Total:* ${Object.keys(groups).length} grupos`);
    }

  } catch (error) {
    console.error(error);
    await m.reply(`❌ Ocurrió un error: ${error.message}`);
  }
};

handler.command = ['join', 'salir', 'leave', 'grupos', 'groups'];
handler.help = [
  'join <enlace> - Unir bot a un grupo (Owner)',
  'salir - Sacar bot del grupo (Owner)',
  'grupos - Ver lista de grupos (Owner)'
];
handler.tags = ['owner'];
handler.owner = true;

export default handler;