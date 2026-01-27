import axios from 'axios'
import * as cheerio from 'cheerio'

async function scrapeFacebook(url) {
  const TARGET_URL = 'https://fdownloader.net/es'

  const UA =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

  try {
    const pageResponse = await axios.get(TARGET_URL, {
      headers: { 'User-Agent': UA }
    })

    const html = pageResponse.data
    const kExpMatch = html.match(/k_exp="(.*?)"/)
    const kTokenMatch = html.match(/k_token="(.*?)"/)

    const k_exp = kExpMatch ? kExpMatch[1] : null
    const k_token = kTokenMatch ? kTokenMatch[1] : null

    if (!k_exp || !k_token) throw new Error('Could not find tokens on the page.')

    const searchPayload = {
      k_exp,
      k_token,
      q: url,
      lang: 'es',
      web: 'fdownloader.net',
      v: 'v2',
      w: '',
      cftoken: ''
    }

    const searchResponse = await axios.post(
      'https://v3.fdownloader.net/api/ajaxSearch',
      new URLSearchParams(searchPayload).toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'User-Agent': UA,
          Origin: 'https://fdownloader.net',
          Referer: 'https://fdownloader.net/'
        }
      }
    )

    if (searchResponse.data.status !== 'ok') {
      throw new Error('Search failed or private video.')
    }

    const htmlData = searchResponse.data.data
    const $result = cheerio.load(htmlData)

    let videoLink = null
    let bestQuality = ''

    const renderButton = $result('button[onclick*="convertFile"]')
    if (renderButton.length > 0) {
      const videoUrl = renderButton.attr('data-videourl')
      const videoCodec = renderButton.attr('data-videocodec')
      const videoType = renderButton.attr('data-videotype')
      const fquality = renderButton.attr('data-fquality')

      const audioUrl = $result('#audioUrl').val()
      const audioType = $result('#audioType').val()
      const v_id = $result('#FbId').val()

      const cTokenMatch = htmlData.match(/c_token\s*=\s*"(.*?)"/)
      const kExpMatchRes = htmlData.match(/k_exp\s*=\s*"(.*?)"/)
      const kUrlConvertMatch = htmlData.match(/k_url_convert\s*=\s*"(.*?)"/)

      const c_token = cTokenMatch ? cTokenMatch[1] : null
      const k_exp_res = kExpMatchRes ? kExpMatchRes[1] : null
      const k_url_convert = kUrlConvertMatch
        ? kUrlConvertMatch[1]
        : 'https://s3.vidcdn.app/api/json/convert'

      if (videoUrl && audioUrl && c_token) {
        const convertPayload = {
          ftype: 'mp4',
          v_id,
          videoUrl,
          videoType,
          videoCodec,
          audioUrl,
          audioType,
          fquality,
          fname: 'FDownloader.net',
          exp: k_exp_res,
          token: c_token,
          cv: 'v2'
        }

        try {
          const convertResponse = await axios.post(
            k_url_convert,
            new URLSearchParams(convertPayload).toString(),
            {
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'User-Agent': UA,
                Origin: 'https://fdownloader.net',
                Referer: 'https://fdownloader.net/'
              }
            }
          )

          if (convertResponse.data?.result) {
            videoLink = convertResponse.data.result
            bestQuality = fquality || ''
          }
        } catch (e) {}
      }
    }

    if (!videoLink) {
      $result('a.download-link-fb').each((i, el) => {
        const quality = $result(el).closest('tr').find('.video-quality').text().trim()
        const href = $result(el).attr('href')
        if (!href) return

        if (
          !videoLink ||
          quality.includes('1080') ||
          quality.includes('720') ||
          quality.toUpperCase().includes('HD')
        ) {
          videoLink = href
          bestQuality = quality
        }
      })
    }

    if (!videoLink) {
      const firstLink = $result('a.download-link-fb').first().attr('href')
      if (firstLink) videoLink = firstLink
    }

    if (!videoLink) throw new Error('No video links found.')

    return { videoUrl: videoLink, quality: bestQuality }
  } catch (error) {
    throw error
  }
}

async function downloadToBuffer(fileUrl) {
  const UA =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

  const res = await axios.get(fileUrl, {
    responseType: 'arraybuffer',
    maxRedirects: 5,
    timeout: 120000,
    headers: {
      'User-Agent': UA,
      Accept: '*/*'
    }
  })

  return Buffer.from(res.data)
}

let handler = async (m, { conn, text }) => {
  if (!text) return m.reply('Ingresa el link del video de Facebook')

  await m.reply('Descargando video de Facebook, por favor espere...')

  try {
    const { videoUrl, quality } = await scrapeFacebook(text)

    const buffer = await downloadToBuffer(videoUrl)

    const caption = `Facebook Video (${quality || 'SD'})`
    await conn.sendFile(
      m.chat,
      buffer,
      `fb_${Date.now()}.mp4`,
      caption,
      m,
      false,
      { mimetype: 'video/mp4' }
    )
  } catch (error) {
    console.error('Error:', error?.message || error)
    m.reply(`Ocurrió un error: ${error?.message || error}`)
  }
}

handler.help = ['fb']
handler.tags = ['dl']
handler.command = /^(fb|fbook|fbdl)$/i

export default handler