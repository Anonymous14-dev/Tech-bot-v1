import fetch from 'node-fetch'

var handler = async (m, { conn, args, usedPrefix, command }) => {
    // Verificar si el usuario es premium o el owner
    const ownerNumber = "5492644893953";
    const sender = m.sender;
    const isOwner = sender.includes(ownerNumber);
    const isPremium = global.db.data.users[m.sender]?.premium || false;
    
    // Si no es owner ni premium, rechazar el comando
    if (!isOwner && !isPremium) {
        throw m.reply(`*[ 🔒 ] Este comando está reservado para usuarios premium.*\n\n*[ 💎 ] Adquiere premium para acceder a esta función.*`);
    }
    
    if (!args[0]) {
        throw m.reply(`*[ 🕸️ ] Has olvidado el vínculo... ¿Acaso temes revelar el portal?*\n\n*[ 🧠 ] Ejemplo:* ${usedPrefix + command} https://vm.tiktok.com/ZMkcmTCa6/`);
    }

    if (!args[0].match(/(https?:\/\/)?(www\.)?(vm\.|vt\.)?tiktok\.com\//)) {
        throw m.reply(`*[ ⚠️ ] Ese enlace no pertenece al reino de TikTok. No intentes engañar a la sombra.*`);
    }

    try {
        await conn.reply(m.chat, "*[ ⏳ ] Invocando el arte prohibido... Preparando la transferencia dimensional...*", m);

        const tiktokData = await tiktokdl(args[0]);

        if (!tiktokData || !tiktokData.data) {
            throw m.reply("*[ 🕳️ ] La sombra no pudo extraer el contenido. El vínculo está corrompido.*");
        }

        const videoURL = tiktokData.data.play;
        const videoURLWatermark = tiktokData.data.wmplay;
        const shadowInfo = `*📜 Fragmento extraído:*\n> ${tiktokData.data.title}`;

        if (videoURL || videoURLWatermark) {
            await conn.sendFile(
                m.chat,
                videoURL,
                "shadow_tiktok.mp4",
                `*[ 💎 ] TRANSMISIÓN COMPLETADA - USUARIO ${isOwner ? 'OWNER' : 'PREMIUM'}*\n\n${shadowInfo}`,
                m
            );
            setTimeout(async () => {}, 1500);
        } else {
            throw m.reply("*[ ❌ ] La sombra ha fallado. No se pudo completar la invocación.*");
        }
    } catch (error1) {
        conn.reply(m.chat, `*[ 🩸 ] Error detectado: ${error1}*\n*Las sombras no perdonan los errores...*`, m);
    }
};

handler.help = ['tiktok']
handler.tags = ['descargas', 'premium']
handler.command = /^(tt|tiktok)$/i;
handler.group = false;
handler.premium = true; // Esta línea marca el comando como premium

export default handler

async function tiktokdl(url) {
    let tikwm = `https://www.tikwm.com/api/?url=${url}?hd=1`
    let response = await (await fetch(tikwm)).json()
    return response
}