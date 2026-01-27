import axios from 'axios'
import { wrapper } from 'axios-cookiejar-support'
import { CookieJar } from 'tough-cookie'
import FormData from 'form-data'

const BASE_URL = 'https://photoeditorai.io'
const API_BASE = 'https://api.photoeditorai.io/pe/photo-editor'
const SITE_KEY = '0x4AAAAAACLCCZe3S9swHyiM'

const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Origin': BASE_URL,
    'Referer': `${BASE_URL}/`,
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Product-Serial': '72405aaeae4d6fcbbe71854be3d00603', // Taken from dump
    'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"'
}

const jar = new CookieJar()
const client = wrapper(axios.create({ jar }))

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

async function solveTurnstile() {
    try {
        const response = await axios.post('https://cloudflare.ryzecodes.xyz/api/bypass/cf-turnstile', {
            url: BASE_URL,
            siteKey: SITE_KEY
        }, {
            headers: { 'Content-Type': 'application/json' }
        })
        return response.data?.data?.token
    } catch (e) {
        console.error('Bypass error:', e.message)
        return null
    }
}

function generateSerial() {
    return 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

async function createJob(imageBuffer, prompt, retry = false) {
    const form = new FormData()
    form.append('target_images', imageBuffer, { filename: 'image.jpg', contentType: 'image/jpeg' })
    form.append('prompt', prompt)
    form.append('model_name', 'photoeditor_3.0')

    const currentHeaders = {
        ...headers,
        'Product-Serial': generateSerial(),
        ...form.getHeaders()
    }

    const token = await solveTurnstile()
    if (token) {
        form.append('turnstile_token', token)
    } else {
        console.log('Warning: No turnstile token obtained')
        form.append('turnstile_token', '') 
    }

    try {
        const response = await client.post(`${API_BASE}/create-job-v2`, form, {
            headers: currentHeaders,
            validateStatus: status => status < 500
        })

        if (response.status === 403 || response.status === 429) {
            if (!retry) return createJob(imageBuffer, prompt, true)
            throw new Error(`Access Denied: ${response.status}`)
        }

        return response.data
    } catch (error) {
        if (!retry && (error.response?.status === 403 || error.response?.status === 429)) {
            return createJob(imageBuffer, prompt, true)
        }
        throw error
    }
}

async function getJob(jobId) {
    const url = `${API_BASE}/get-job/${jobId}`
    let attempts = 0
    while (attempts < 30) {
        try {
            const response = await client.get(url, { headers })
            const data = response.data
            
            const jobStatus = data.result?.status
            const jobResult = data.result

            if (jobStatus === 2 || (jobResult && jobResult.output && jobResult.output.length > 0)) {
                return jobResult
            }
            if (jobStatus === -1 || jobStatus === 'failed') { 
                throw new Error(jobResult.error || 'Job failed')
            }
        
        } catch (e) {
            console.error('Poll error:', e.message)
        }
        
        await sleep(2000)
        attempts++
    }
    throw new Error('Timeout waiting for job')
}

const handler = async (m, { conn, text, args, usedPrefix, command }) => {
    let q = m.quoted ? m.quoted : m
    let mime = (q.msg || q).mimetype || ''
    
    if (!/image\/(jpe?g|png)/.test(mime)) {
       return m.reply(`Reply to an image with ${usedPrefix + command} <prompt>`)
    }

    const prompt = text.trim()
    if (!prompt) return m.reply('Please provide a prompt.')

    await m.react?.('⏳')

    try {
        const img = await q.download()
        
        const jobData = await createJob(img, prompt)
        
        const jobId = jobData.result?.job_id || jobData.job_id || jobData.id || jobData.uuid
        
        if (!jobId) {
             console.log('Job Creation Response:', JSON.stringify(jobData))
             if (jobData.code && jobData.code !== 100000) throw new Error(`API Error: ${jobData.msg || jobData.code}`)
             throw new Error('No Job ID received')
        }

        const result = await getJob(jobId)
        
        
        let outputUrl = result.url || result.output_url || result.result_url
        if (!outputUrl && Array.isArray(result.output) && result.output.length > 0) {
            outputUrl = result.output[0]
        }
        
        if (!outputUrl) throw new Error('No output URL in result')

        const mediaResponse = await axios.get(outputUrl, { responseType: 'arraybuffer' })
        
        await conn.sendMessage(m.chat, { 
            image: mediaResponse.data, 
            caption: `✨ Result for: ${prompt}` 
        }, { quoted: m })

        await m.react?.('✅')
    } catch (e) {
        console.error(e)
        await m.react?.('❌')
        m.reply(`Error: ${e.message}`)
    }
}

handler.help = ['photoeditor <prompt>']
handler.tags = ['ai']
handler.command = /^(photoeditor|pe|editai)$/i

export default handler