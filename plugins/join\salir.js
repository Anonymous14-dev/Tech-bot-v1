import fetch from 'node-fetch';

const handler = async (m, { conn, args, command, usedPrefix, isOwner }) => {
  try {
    switch(command) {
      case 'join':
        if (!isOwner) return conn.reply(m.chat, '❌ Este comando es solo para el owner del bot.', m);
        
        const link = args[0];
        if (!link) return conn.reply(m.chat, `❌ Por favor, proporciona un enlace de grupo.\nEjemplo: ${usedPrefix}join https://chat.whatsapp.com/...`, m);
        
        if (!link.includes('chat.whatsapp.com')) return conn.reply(m.chat, '❌ Enlace inválido. Debe ser un enlace de WhatsApp.', m);

        await conn.reply(m.chat, '🔄 Uniendo al grupo...', m);
        
        const code = link.split('/').pop();
        try {
          await conn.groupAcceptInvite(code);
          await conn.reply(m.chat, '✅ *Bot unido al grupo exitosamente.*', m);
        } catch (err) {
          console.error(err);
          await conn.reply(m.chat, `❌ Error al unirse: ${err.message || 'Enlace inválido o expirado'}`, m);
        }
        break;
        
      case 'salir':
      case 'leave':
        if (!isOwner) return conn.reply(m.chat, '❌ Este comando es solo para el owner del bot.', m);
        
        if (m.isGroup) {
          await conn.reply(m.chat, '👋 Saliendo del grupo...', m);
          try {
            await conn.groupLeave(m.chat);
            await conn.reply(m.chat, '✅ *Bot ha salido del grupo exitosamente.*', m);
          } catch (err) {
            console.error(err);
            await conn.reply(m.chat, `❌ Error al salir: ${err.message}`, m);
          }
        } else {
          if (!args[0]) return conn.reply(m.chat, `❌ Debes usar este comando en un grupo o proporcionar el ID del grupo.\nEjemplo: ${usedPrefix}salir 123456789@g.us`, m);
          
          const groupId = args[0].includes('@g.us') ? args[0] : args[0] + '@g.us';
          await conn.reply(m.chat, '👋 Saliendo del grupo...', m);
          try {
            await conn.groupLeave(groupId);
            await conn.reply(m.chat, '✅ *Bot ha salido del grupo exitosamente.*', m);
          } catch (err) {
            console.error(err);
            await conn.reply(m.chat, `❌ Error al salir: ${err.message}`, m);
          }
        }
        break;
        
      case 'grupos':
      case 'groups':
        if (!isOwner) return conn.reply(m.chat, '❌ Este comando es solo para el owner del bot.', m);
        
        try {
          const groups = await conn.groupFetchAllParticipating();
          if (!groups || Object.keys(groups).length === 0) {
            return conn.reply(m.chat, '❌ El bot no está en ningún grupo.', m);
          }
          
          let groupList = '📋 *GRUPOS DONDE ESTÁ EL BOT*\n\n';
          let index = 1;
          
          for (const groupId in groups) {
            const group = groups[groupId];
            try {
              const inviteCode = await conn.groupInviteCode(groupId).catch(() => null);
              groupList += `*${index}.* ${group.subject || 'Sin nombre'}\n`;
              groupList += `   👥 *Participantes:* ${group.participants?.length || 0}\n`;
              groupList += `   🆔 *ID:* ${groupId}\n`;
              groupList += `   🔗 *Enlace:* ${inviteCode ? 'https://chat.whatsapp.com/' + inviteCode : 'No disponible'}\n\n`;
              index++;
            } catch (e) {
              console.error(`Error procesando grupo ${groupId}:`, e);
            }
          }
          
          groupList += `\n📊 *Total:* ${Object.keys(groups).length} grupos`;
          await conn.reply(m.chat, groupList, m);
        } catch (error) {
          console.error(error);
          await conn.reply(m.chat, '❌ Error al obtener la lista de grupos.', m);
        }
        break;
    }
  } catch (error) {
    console.error('Error general en comando join/salir:', error);
    await conn.reply(m.chat, `❌ Ocurrió un error: ${error.message}`, m);
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