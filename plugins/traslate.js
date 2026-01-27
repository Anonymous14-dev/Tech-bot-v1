import axios from 'axios';
import qs from 'qs';

const ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

async function googleTranslate(text, targetLang = 'es', sourceLang = 'auto') {
    const rpcId = 'MkEWBc';
    const url = 'https://translate.google.com/_/TranslateWebserverUi/data/batchexecute?rpcids=' + rpcId + '&f.sid=-4434000341074907770&bl=boq_translate-webserver_20260116.05_p1&hl=es&soc-app=1&soc-platform=1&soc-device=1&_reqid=168167&rt=c';

    const rpcPayload = [
        [
            [
                rpcId, 
                JSON.stringify([[text, sourceLang, targetLang, true], [null]]), 
                null, 
                "generic"
            ]
        ]
    ];

    const data = qs.stringify({
        'f.req': JSON.stringify(rpcPayload)
    });

    try {
        const response = await axios.post(url, data, {
            headers: {
                'content-type': 'application/x-www-form-urlencoded;charset=UTF-8',
                'user-agent': ua,
                'origin': 'https://translate.google.com',
                'referer': 'https://translate.google.com/',
                'x-same-domain': '1'
            }
        });

        let rawData = response.data;
        if (rawData.startsWith(")]}'")) {
            rawData = rawData.substring(4);
        }
        
        const lines = rawData.split('\n');
        let json = null;
        
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('[[') && trimmed.endsWith(']]')) {
                try {
                    const potentialJson = JSON.parse(trimmed);
                    if (potentialJson && Array.isArray(potentialJson) && potentialJson[0] && potentialJson[0][1] === 'MkEWBc') {
                        json = potentialJson;
                        break;
                    }
                } catch (e) {
                }
            } else if (trimmed.startsWith('[[') && !trimmed.endsWith(']]')) {
                 try {
                 } catch (e) {}
            }
        }
        
        if (!json) {
             const jsonStartIndex = rawData.indexOf('[[');
             if (jsonStartIndex !== -1) {
                 let jsonString = rawData.substring(jsonStartIndex);
                 let balance = 0;
                 let endIndex = -1;
                 for (let i = 0; i < jsonString.length; i++) {
                     if (jsonString[i] === '[') balance++;
                     else if (jsonString[i] === ']') balance--;
                     
                     if (balance === 0) {
                         endIndex = i + 1;
                         break;
                     }
                 }
                 
                 if (endIndex !== -1) {
                    json = JSON.parse(jsonString.substring(0, endIndex));
                 }
             }
        }

        if (json && json[0] && json[0][2]) {
            const innerData = JSON.parse(json[0][2]);
            if (innerData && innerData[1] && innerData[1][0] && innerData[1][0][0] && innerData[1][0][0][5]) {
                 const translation = innerData[1][0][0][5].map(t => t[0]).join('');
                 return {
                     translation: translation,
                     detectedLanguage: innerData[2]
                 };
            } else {
                 console.log("Unexpected inner structure:", JSON.stringify(innerData, null, 2));
                 return null;
            }
        }
        
    } catch (error) {
        console.error("Error scraping Google Translate:", error);
        return null;
    }
}

let handler = async (m, { args, usedPrefix, command }) => {
    let lang = 'es'
    let text = ''
    
    if (m.quoted && m.quoted.text) {
        if (args.length >= 1 && /^[a-z]{2,5}(-[a-z]{2,5})?$/i.test(args[0])) {
            lang = args[0].toLowerCase()
        }
        text = m.quoted.text
    } else {
        if (args.length >= 2 && /^[a-z]{2,5}(-[a-z]{2,5})?$/i.test(args[0])) {
            lang = args[0].toLowerCase()
            text = args.slice(1).join(' ')
        } else if (args.length >= 1) {
            text = args.join(' ')
        } else {
             throw `*⚠️ ¿Qué quieres traducir?*\n\n*Ejemplo:*\n${usedPrefix + command} en Hola mundo\n${usedPrefix + command} es Hello world\n\n*Uso:*\n${usedPrefix + command} <lang> <texto>\n${usedPrefix + command} <texto> (a español)\nO responde a un mensaje con ${usedPrefix + command}`
        }
    }

    if (!text) throw `*⚠️ Texto vacío*`

    try {
        const result = await googleTranslate(text, lang)
        if (result && result.translation) {
            await m.reply(result.translation)
            m.react('✅')
        } else {
            throw 'Error al traducir.'
        }
    } catch (e) {
        throw e
    }
}

handler.help = ['translate', 'tr']
handler.tags = ['tools']
handler.command = /^(tr|translate|traducir|trad)$/i

export default handler
