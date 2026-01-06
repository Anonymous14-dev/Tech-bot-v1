import fetch from 'node-fetch'

async function streamToBuffer(stream) {
  const chunks = []
  for await (const chunk of stream) {
    chunks.push(chunk)
  }
  return Buffer.concat(chunks)
}

let handler = async (m, { conn, text, usedPrefix }) => {
  if (!text) return conn.reply(m.chat, `🗣️ Mande un texto pa que Adonix le hable al toque`, m)

  try {
    await conn.sendPresenceUpdate('recording', m.chat)

    // Opción 1: Primero probemos sin parámetros extra
    const url = `https://api-adonix.ultraplus.click/ai/iavoz?q=${encodeURIComponent(text)}`
    console.log('URL de solicitud:', url)
    
    const res = await fetch(url, {
      headers: {
        'apikey': 'WilkerKeydukz9l6871'
      }
    })

    console.log('Status de respuesta:', res.status)
    console.log('Headers de respuesta:', res.headers)
    
    if (!res.ok) {
      const errorText = await res.text()
      console.error('Error de la API:', errorText)
      throw new Error(`Error en la API: ${res.status} - ${errorText}`)
    }

    // Verificar el content-type
    const contentType = res.headers.get('content-type')
    console.log('Content-Type recibido:', contentType)
    
    if (!contentType || !contentType.includes('audio')) {
      const responseText = await res.text()
      console.log('Respuesta no audio:', responseText.substring(0, 200))
      throw new Error('La API no devolvió audio')
    }

    const bufferAudio = await streamToBuffer(res.body)
    console.log('Tamaño del buffer de audio:', bufferAudio.length, 'bytes')
    
    if (bufferAudio.length === 0) {
      throw new Error('El buffer de audio está vacío')
    }

    await conn.sendMessage(m.chat, {
      audio: bufferAudio,
      mimetype: 'audio/mpeg',
      ptt: true
    }, { quoted: m })

  } catch (e) {
    console.error('Error completo:', e)
    await conn.reply(m.chat, `❌ Error: ${e.message}\n\nPuedes intentar:\n1. Verificar la API\n2. Probar con otro texto\n3. Contactar al desarrollador`, m)
  }
}

handler.command = ['iavoz']
handler.help = ['iavoz']
handler.tags = ['ia']
export default handler