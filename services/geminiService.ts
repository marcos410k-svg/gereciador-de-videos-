import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Configurações de segurança
const SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// AUMENTADO PARA 10 TENTATIVAS E DELAY INICIAL DE 5s PARA EVITAR ERRO 429
async function runWithRetry<T>(operation: () => Promise<T>, retries = 10, initialDelay = 5000): Promise<T> {
  let lastError;
  for (let i = 0; i < retries; i++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      const isRateLimit = error?.status === 429 || 
                          error?.code === 429 || 
                          error?.message?.includes('429') || 
                          error?.message?.includes('quota') ||
                          error?.toString().includes('RESOURCE_EXHAUSTED');
      
      if (isRateLimit && i < retries - 1) {
        // Backoff exponencial: 5s, 10s, 20s, 40s...
        const waitTime = initialDelay * Math.pow(2, i);
        console.warn(`⚠️ Cota API (429). Aguardando ${waitTime/1000}s antes da tentativa ${i + 2}/${retries}...`);
        await delay(waitTime);
        continue;
      }
      if (!isRateLimit) throw error; 
    }
  }
  throw lastError;
}

export async function classifyVideosByText(videoData: { id: string, name: string }[], availableCategories: string[]) {
  return runWithRetry(async () => {
    try {
      const prompt = `
        Analise os nomes dos arquivos e classifique.
        
        IMPORTANTE - DEDUPLICAÇÃO DE PESSOAS:
        1. Se identificar uma pessoa, verifique a lista 'Categorias Existentes'.
        2. Se o nome da pessoa já existir na lista (mesmo que parcial), USE O NOME DA LISTA.
        Exemplo: Se lista tem "Angelina Jolie" e arquivo é "angelina.mp4", use "Angelina Jolie".
        3. Se for um nome novo, use SEMPRE o formato completo: "Nome Sobrenome". Não use apelidos.

        Categorias Existentes: ${availableCategories.join(', ')}.
        
        Vídeos: ${JSON.stringify(videoData)}
        
        Retorne JSON array [{id, categories: string[], reason}].
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          safetySettings: SAFETY_SETTINGS, 
        }
      });

      if (response.text) return JSON.parse(response.text);
      return [];
    } catch (e) {
      console.error("Erro text class:", e);
      throw e;
    }
  });
}

export async function findSimilarContent(
  referenceVideo: { id: string, url: string, category: string },
  candidateVideos: { id: string, url: string, name: string }[]
): Promise<string[]> {
  try {
    const refFrames = await extractThreeKeyFrames(referenceVideo.url);
    if (refFrames.length === 0) return [];

    const matchedIds: string[] = [];
    // Reduzido batch para 3 para ser mais leve
    const BATCH_SIZE = 3; 

    for (let i = 0; i < candidateVideos.length; i += BATCH_SIZE) {
      const batch = candidateVideos.slice(i, i + BATCH_SIZE);
      
      const batchFrames = await Promise.all(batch.map(async (v) => {
        try {
            const frame = await extractFrameAsBase64(v.url);
            return { id: v.id, name: v.name, frame };
        } catch {
            return null;
        }
      }));

      const validBatch = batchFrames.filter(b => b && b.frame) as {id: string, name: string, frame: string}[];
      if (validBatch.length === 0) continue;

      const prompt = `
        ATUAR COMO: Especialista em Reconhecimento Facial.
        TAREFA: Compare as "IMAGENS DE REFERÊNCIA" (Target) com os "CANDIDATOS".
        Identifique se a pessoa/atriz ou o conteúdo exato do target aparece nos candidatos.
        
        Categoria Alvo: "${referenceVideo.category}".
        
        RETORNE JSON: { "matchIds": ["id_do_video_match"] }
      `;

      const parts: any[] = [{ text: prompt }];
      
      parts.push({ text: "--- REFERÊNCIA (TARGET) ---" });
      refFrames.forEach(data => parts.push({ inlineData: { mimeType: 'image/jpeg', data } }));

      parts.push({ text: "--- CANDIDATOS ---" });
      validBatch.forEach(item => {
        parts.push({ text: `ID: ${item.id} | Name: ${item.name}` });
        parts.push({ inlineData: { mimeType: 'image/jpeg', data: item.frame } });
      });

      await runWithRetry(async () => {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: { parts },
            config: {
            responseMimeType: "application/json",
            safetySettings: SAFETY_SETTINGS,
            }
        });

        if (response.text) {
            const cleanText = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
            const result = JSON.parse(cleanText);
            if (result.matchIds && Array.isArray(result.matchIds)) {
            matchedIds.push(...result.matchIds);
            }
        }
      });
      
      // Delay de 4 segundos entre buscas de similaridade
      await delay(4000);
    }
    return matchedIds;
  } catch (error) {
    console.error("Erro busca similares:", error);
    return [];
  }
}

export async function classifySingleVideoMultimodal(
  video: { id: string, name: string, url: string }, 
  availableCategories: string[]
): Promise<{ id: string, categories: string[], reason: string, description?: string, source?: { name: string, url: string } } | null> {
  return runWithRetry(async () => {
      try {
        const frames = await extractThreeKeyFrames(video.url);
        if (frames.length === 0) return null;

        // Prompt de Estratégia de Busca Avançada (Triangulação)
        const prompt = `
        ATUAR COMO: Investigador Digital Sênior.
        OBJETIVO: Identificar inequivocamente a pessoa no vídeo e a fonte original.

        CONTEXTO:
        - Arquivo: "${video.name}"
        - Categorias Existentes: [${availableCategories.join(', ')}]

        ESTRATÉGIA DE BUSCA (GOOGLE SEARCH - EXECUÇÃO OBRIGATÓRIA):
        1. ANÁLISE VISUAL + TEXTUAL:
           - Extraia qualquer texto visível nos frames (logos, marcas d'água, nomes em legendas).
           - Combine "Nome do Arquivo" + "Video Source".
        
        2. TRIANGULAÇÃO DE DADOS:
           - Se houver rosto: Busque "Nome provável + Atriz/Modelo".
           - Se houver logo de estúdio: Busque "Nome do Estúdio + Título ou Descrição Visual".
        
        3. PADRONIZAÇÃO (CRÍTICO):
           - Verifique se a pessoa identificada JÁ EXISTE na lista 'Categorias Existentes'.
           - Se Sim: Use EXATAMENTE o nome da lista.
           - Se Não: Use o Nome Artístico Completo (Padronizado).

        SAÍDA ESPERADA (JSON):
        Preencha com precisão, extraindo URLs reais dos resultados da busca.

        { 
            "id": "${video.id}", 
            "categories": ["Nome Completo da Pessoa", "Gênero/Categoria se aplicável"], 
            "reason": "Explique a lógica: 'Identificado rosto de X, cruzado com logo Y no frame 2'.",
            "description": "Descrição detalhada do conteúdo e cena.",
            "source": { 
                "name": "Nome do Site Oficial / Estúdio / Canal", 
                "url": "URL direta encontrada na busca (ex: link do perfil, vídeo ou site oficial)" 
            }
        }
        `;

        const parts: any[] = [{ text: prompt }];
        frames.forEach(base64 => {
        parts.push({ inlineData: { mimeType: 'image/jpeg', data: base64 } });
        });

        const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview", 
        contents: { parts },
        config: {
            // A ferramenta de busca está ativada para permitir a triangulação
            tools: [{ googleSearch: {} }],
            responseMimeType: "application/json",
            safetySettings: SAFETY_SETTINGS,
        }
        });

        if (response.text) {
        const cleanText = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleanText);
        }
        return null;

    } catch (error) {
        console.warn(`Erro análise visual ${video.name}`, error);
        throw error;
    }
  });
}

// Extrai 5 frames distribuídos para preview e 1 thumbnail
export async function generateVideoPreviews(videoUrl: string): Promise<{ thumbnail: string, previews: string[] }> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.src = videoUrl;
    video.crossOrigin = "anonymous";
    video.muted = true;
    video.playsInline = true;

    const timeout = setTimeout(() => {
        resolve({ thumbnail: '', previews: [] });
        video.remove();
    }, 15000); // 15s timeout para processar 5 frames

    const frames: string[] = [];
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const capture = () => {
      if (!ctx || video.videoWidth === 0) return '';
      // Reduzir resolução para preview (ex: 320px width) para economizar memória
      const scale = Math.min(1, 320 / video.videoWidth);
      canvas.width = video.videoWidth * scale;
      canvas.height = video.videoHeight * scale;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/jpeg', 0.6).split(',')[1];
    };

    video.onloadedmetadata = async () => {
      try {
        const d = video.duration || 0;
        if (d === 0) { resolve({ thumbnail: '', previews: [] }); return; }

        // Pontos de captura: 10%, 30%, 50%, 70%, 90%
        const points = [0.1, 0.3, 0.5, 0.7, 0.9].map(p => d * p);
        
        for (const t of points) {
           await new Promise<void>(r => {
             const onSeek = () => {
                video.removeEventListener('seeked', onSeek);
                const frame = capture();
                if (frame) frames.push(frame);
                r();
             };
             video.addEventListener('seeked', onSeek);
             video.currentTime = t;
           });
        }
        
        clearTimeout(timeout);
        // Thumbnail principal é o frame do meio (frames[2]), ou o primeiro se falhar
        const thumbnail = frames.length > 2 ? frames[2] : (frames[0] || '');
        
        resolve({ thumbnail, previews: frames });
      } catch (e) {
        resolve({ thumbnail: '', previews: [] });
      } finally {
        video.src = "";
        video.remove();
      }
    };
    video.onerror = () => { clearTimeout(timeout); resolve({ thumbnail: '', previews: [] }); };
    video.load();
  });
}

// Mantido para compatibilidade, mas agora usamos generateVideoPreviews
export async function extractThreeKeyFrames(videoUrl: string): Promise<string[]> {
    const data = await generateVideoPreviews(videoUrl);
    // Retorna até 3 frames dos previews gerados
    return data.previews.slice(0, 3);
}

// Mantido para compatibilidade simples
export async function extractFrameAsBase64(videoUrl: string): Promise<string> {
    const data = await generateVideoPreviews(videoUrl);
    return data.thumbnail;
}