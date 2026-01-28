import fetch from 'node-fetch'
import FormData from 'form-data'

// Función para subir a Uguu
async function uploadToUguu(buffer) {
  const form = new FormData()
  form.append('files[]', buffer, 'image.jpg')

  const res = await fetch('https://uguu.se/upload.php', {
    method: 'POST',
    body: form
  })

  if (!res.ok) throw new Error(`Error uploading to Uguu: ${res.status}`)

  const data = await res.json()
  if (!data.files || !data.files[0]) throw new Error('Uguu did not return a valid URL')

  return data.files[0].url
}

let handler = async (m, { conn, usedPrefix, command }) => {
  try {
    await m.react('⏳')

    let q = m.quoted ? m.quoted : m
    let mime = (q.msg || q).mimetype || q.mediaType || ''

    if (!mime) {
      return conn.sendMessage(m.chat, {
        text: `❇️ Por favor, envía una imagen o responde a una imagen usando *${usedPrefix + command}*`
      }, { quoted: m })
    }

    if (!/image\/(jpe?g|png|webp)/.test(mime)) {
      return conn.sendMessage(m.chat, {
        text: `⚠️ El formato (${mime}) no es compatible, usa JPG, PNG o WEBP.`
      }, { quoted: m })
    }

    await conn.sendMessage(m.chat, {
      text: `⏳ Mejorando tu imagen, espera...`
    }, { quoted: m })

    let img = await q.download?.()
    if (!img) throw new Error('No pude descargar la imagen.')

    // Subir imagen a Uguu primero
    let uploadedUrl = await uploadToUguu(img)

    // USAR LA NUEVA API SIN KEY - URL corregida
    const api = `https://api-nexy.ultraplus.click/api/tools/hd?url=${encodeURIComponent(uploadedUrl)}`
    
    console.log('Llamando a API:', api) // Para depuración
    
    const res = await fetch(api)
    
    if (!res.ok) {
      throw new Error(`Error en la API: ${res.status} ${res.statusText}`)
    }
    
    const data = await res.json()
    
    // Verificar la estructura de respuesta (puede variar)
    if (data.error) {
      throw new Error(data.error)
    }
    
    // Manejar diferentes posibles estructuras de respuesta
    let imageUrl
    if (data.url) {
      imageUrl = data.url
    } else if (data.imageUrl) {
      imageUrl = data.imageUrl
    } else if (data.result) {
      imageUrl = data.result.url || data.result
    } else if (data.data && data.data.url) {
      imageUrl = data.data.url
    } else {
      // Intentar obtener directamente si la API devuelve una URL
      const textResponse = await res.text()
      if (textResponse.startsWith('http')) {
        imageUrl = textResponse
      } else {
        throw new Error('No se pudo obtener la URL de la imagen mejorada')
      }
    }

    // Descargar la imagen mejorada
    const improvedRes = await fetch(imageUrl)
    if (!improvedRes.ok) throw new Error('No se pudo descargar la imagen mejorada')
    
    const buffer = await improvedRes.buffer()

    // Enviar la imagen mejorada
    await conn.sendMessage(m.chat, {
      image: buffer,
      caption: '✅ *Imagen mejorada con éxito*'
    }, { quoted: m })

    await m.react('✅')

  } catch (e) {
    console.error('Error completo:', e)
    await m.react('✖️')
    await conn.sendMessage(m.chat, {
      text: `❌ Error al mejorar la imagen: ${e.message}`,
      ...global.rcanal
    }, { quoted: m })
  }
}

handler.help = ['hd']
handler.tags = ['tools']
handler.command = ['remini', 'hd', 'enhance']

export default handler