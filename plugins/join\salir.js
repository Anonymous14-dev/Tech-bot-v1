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
        
        // Solo funciona si el mensaje viene de un grupo
        if (!m.isGroup) {
          return conn.reply(m.chat, `❌ Este comando solo funciona dentro de un grupo.\n\nVe al grupo donde quieres sacar al bot y escribe: ${usedPrefix}salir`, m);
        }
        
        await conn.reply(m.chat, '👋 Saliendo del grupo...', m);
        
        try {
          // Método 1: Intentar salir del grupo
          await conn.groupLeave(m.chat);
          
          // Si llegamos aquí, el bot salió exitosamente
          // Nota: No podemos enviar mensaje después de salir, así que lo enviamos antes
          await conn.reply(m.chat, '✅ *Bot ha salido del grupo exitosamente.*', m);
          
        } catch (err) {
          console.error('Error al salir del grupo:', err);
          
          // Si el bot no es admin, intentamos con otro método
          if (err.message.includes('not an admin') || err.message.includes('no permission')) {
            await conn.reply(m.chat, '⚠️ El bot no es administrador. Intentando método alternativo...', m);
            
            try {
              // Método alternativo: Expulsarnos a nosotros mismos
              const botId = conn.user.id.split(':')[0] + '@s.whatsapp.net';
              await conn.groupParticipantsUpdate(m.chat, [botId], 'remove');
              await conn.reply(m.chat, '✅ *Bot ha sido expulsado del grupo.*', m);
            } catch (err2) {
              console.error('Error en método alternativo:', err2);
              await conn.reply(m.chat, `❌ No se pudo sacar al bot. Posibles causas:\n• El bot no es admin\n• El grupo está restringido\n• Error: ${err2.message}`, m);
            }
          } else {
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
  'salir - Sacar bot del grupo (Owner - usar dentro del grupo)',
  'grupos - Ver lista de grupos (Owner)'
];
handler.tags = ['owner'];
handler.owner = true;

export default handler;