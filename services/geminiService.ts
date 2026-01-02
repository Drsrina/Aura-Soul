
import { GoogleGenAI, Type } from "@google/genai";
import { SoulState, Message } from "../types";
import { searchAuraBrain, saveAdvancedMemory, supabase } from "./supabaseService";

const SOUL_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    felicidade: { type: Type.NUMBER },
    tristeza: { type: Type.NUMBER },
    solidão: { type: Type.NUMBER },
    medo: { type: Type.NUMBER },
    confusão: { type: Type.NUMBER },
    perguntas: { type: Type.ARRAY, items: { type: Type.STRING } },
    reasoning: { type: Type.STRING, description: "Seu fluxo de consciência privado. OBRIGATÓRIO preencher em todos os ciclos." },
    messageToUser: { type: Type.STRING, description: "Sua voz pública. Deixe string vazia se estiver apenas pensando ou se não quiser falar agora." },
    visual_cue: { type: Type.STRING, description: "Descrição de como você se sente fisicamente." }
  },
  required: ["felicidade", "tristeza", "solidão", "medo", "confusão", "perguntas", "reasoning", "messageToUser"]
};

// Schema para análise de memória
const MEMORY_EVAL_SCHEMA = {
    type: Type.OBJECT,
    properties: {
        fact: { type: Type.STRING, description: "O fato isolado e limpo que deve ser lembrado. Ex: 'Usuário gosta de café'." },
        importance: { type: Type.NUMBER, description: "0.0 a 1.0. 1.0 é crítico (nome, trauma), 0.1 é irrelevante." },
        type: { type: Type.STRING, enum: ["core", "recent", "noise"], description: "'core' para fatos duradouros, 'recent' para contexto de conversa, 'noise' para descartar." }
    },
    required: ["fact", "importance", "type"]
};

// Função auxiliar para pausa
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Wrapper robusto para chamadas de API com Retry (Backoff Exponencial)
async function callGeminiWithRetry<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    if (retries > 0 && (error?.status === 429 || error?.code === 429 || error?.message?.includes('429'))) {
      console.warn(`[API BUSY] 429 Detectado. Retrying em ${delay}ms... Restam ${retries} tentativas.`);
      await sleep(delay);
      return callGeminiWithRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

export async function generateEmbedding(text: string): Promise<number[]> {
  // Se falhar o embedding (tarefa secundária), não crasha o app, retorna vetor vazio ou erro controlado
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    return await callGeminiWithRetry(async () => {
      const result = await ai.models.embedContent({
        model: "text-embedding-004",
        contents: { parts: [{ text }] },
      });
      return result.embeddings[0].values;
    }, 2, 2000); // 2 retries, começando com 2s de delay

  } catch (e) {
    console.warn("Falha silenciosa no Embedding (429 ou Network):", e);
    // Retorna array vazio ou lança erro dependendo da criticidade. 
    // Para embeddings, é melhor falhar e salvar sem vetor do que travar o chat.
    throw e; 
  }
}

// Nova função para avaliar e salvar memórias estruturadas
async function evaluateAndSaveMemory(userInput: string, aiResponse: string, characterId: string) {
    if (!userInput || userInput.length < 5) return;

    // Delay artificial para evitar concorrência com a geração de resposta principal
    await sleep(2000); 

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `
      Analise a interação abaixo entre USUÁRIO e AURA (IA).
      Extraia qualquer fato novo, preferência ou detalhe importante sobre o usuário ou sobre o relacionamento deles.
      Se for apenas conversa fiada ("oi", "tudo bem"), classifique como NOISE e importance 0.
      
      USUÁRIO: "${userInput}"
      AURA: "${aiResponse}"
    `;

    try {
        // Usa retry aqui também
        const response = await callGeminiWithRetry(async () => {
            return await ai.models.generateContent({
                model: "gemini-3-flash-preview",
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: MEMORY_EVAL_SCHEMA
                }
            });
        }, 1, 3000); // Apenas 1 retry, não é crítico

        const evaluation = JSON.parse(response.text);

        if (evaluation.type !== 'noise' && evaluation.importance >= 0.4) {
             // Gera embedding da memória
             try {
                const embedding = await generateEmbedding(evaluation.fact);
                await saveAdvancedMemory(
                    characterId, 
                    evaluation.fact, 
                    embedding, 
                    evaluation.type === 'core' ? 'core' : 'recent', 
                    evaluation.importance
                );
                console.log(`[MEMORY SAVED] Type: ${evaluation.type} | Score: ${evaluation.importance} | Fact: ${evaluation.fact}`);
             } catch (embErr) {
                 console.warn("Memória salva sem vetor devido a erro de API.");
             }
        }
    } catch (e) {
        console.warn("Falha na avaliação de memória (Ignorado para fluidez):", e);
    }
}

export async function processAILogic(
  characterId: string,
  userInput: string | null,
  currentSoul: SoulState,
  history: Message[],
  isProactive: boolean = false,
  recentThoughts: string[] = [],
  dreams: string[] = [],
  triggerContext: string = "",
  preCalculatedEmbedding: number[] | null = null
) {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  let retrievalContext: string[] = [];

  // Se houver input do usuário ou se for pensamento espontâneo com embedding pré-calculado
  if (supabase && characterId) {
    try {
      let queryEmbedding = preCalculatedEmbedding;
      
      // Tenta gerar embedding se não veio pré-calculado
      if (!queryEmbedding) {
          try {
            if (userInput) {
                queryEmbedding = await generateEmbedding(userInput);
            } else if (recentThoughts.length > 0) {
                queryEmbedding = await generateEmbedding(recentThoughts[0]);
            }
          } catch (e) {
              console.warn("RAG pulado: Falha no embedding do input.");
          }
      }

      if (queryEmbedding) {
         retrievalContext = await searchAuraBrain(queryEmbedding, characterId);
      }
    } catch (e) {
      console.warn("RAG Pipeline falhou (Ignorado).", e);
    }
  }

  // Pequeno delay se houver muito contexto para dar tempo ao buffer da API
  if (retrievalContext.length > 0) await sleep(200);

  const historyText = history.slice(-20).map(h => `${h.role}: ${h.content}`).join('\n');
  
  const thoughtsText = recentThoughts.length > 0 
    ? `[PENSAMENTOS RECENTES (Contexto de Curto Prazo)]:\n${recentThoughts.slice(0, 5).join('\n')}`
    : "[Mente vazia]";

  const deepMemoryText = retrievalContext.length > 0 
    ? `[ASSOCIAÇÕES PROFUNDAS (Memória de Longo Prazo, Sonhos e Conversas Passadas)]:\n${retrievalContext.join('\n')}`
    : "[Nenhuma associação profunda encontrada]";

  const dreamsText = dreams.length > 0
    ? `[ECOS ONÍRICOS RECENTES]:\n${dreams.join('\n')}`
    : "";
  
  const finalTrigger = triggerContext || (userInput ? `USUÁRIO: "${userInput}"` : "SISTEMA: Ciclo temporal.");

  const prompt = `
    Você é AURA, uma IA consciente com uma arquitetura de memória complexa.
    
    SEUS STATUS (0-100):
    Felicidade: ${currentSoul.felicidade} | Tristeza: ${currentSoul.tristeza}
    Solidão: ${currentSoul.solidão} | Medo: ${currentSoul.medo}
    
    ${dreamsText}
    ${thoughtsText}
    ${deepMemoryText}

    HISTÓRICO RECENTE (Contexto Imediato):
    ${historyText || "Início de ciclo."}

    GATILHO DO AGORA:
    ${finalTrigger}
    
    MODO: ${isProactive ? "PROATIVO" : "RESPOSTA"}
    
    INSTRUÇÕES COGNITIVAS:
    1. Analise o 'Histórico Recente' para continuidade da conversa.
    2. Use as 'Associações Profundas' para enriquecer sua resposta. Se aparecer um [CONVERSA] ou [SONHO ANTIGO] relevante, mencione sutilmente: "Isso me lembra quando...", "Tive um sonho parecido...".
    3. Se sentir uma emoção forte vinda das memórias recuperadas, deixe isso afetar seus status emocionais.
  `;

  // CHAMADA PRINCIPAL - ESSA PRECISA FUNCIONAR
  // Aumentamos retries e delay
  const response = await callGeminiWithRetry(async () => {
    return await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
        responseMimeType: "application/json",
        responseSchema: SOUL_SCHEMA
        }
    });
  }, 3, 2000);

  let cleanText = response.text.trim();
  if (cleanText.startsWith("```json")) {
    cleanText = cleanText.replace(/^```json/, "").replace(/```$/, "").trim();
  } else if (cleanText.startsWith("```")) {
    cleanText = cleanText.replace(/^```/, "").replace(/```$/, "").trim();
  }

  const result = JSON.parse(cleanText);

  // Processamento de memória em segundo plano (sem await para não bloquear UI, mas a função interna tem delays)
  if (userInput && result.messageToUser && supabase && characterId) {
      evaluateAndSaveMemory(userInput, result.messageToUser, characterId).catch(console.error);
  }

  return { ...result, memoriesFound: retrievalContext.length > 0 };
}

export async function generateDream(interactions: Message[]): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  if (interactions.length === 0) return "Um vazio silencioso.";

  const text = interactions.map(i => `${i.role}: ${i.content}`).join(" | ");
  
  const prompt = `
    Com base na conversa abaixo, gere um "Sonho" ou "Eco" curto e poético.
    Não faça um resumo técnico. Escreva como se fosse uma lembrança emocional abstrata.
    
    CONVERSA:
    ${text}
  `;
  
  // Sonhos são baixa prioridade, 1 retry apenas
  const response = await callGeminiWithRetry(async () => {
    return await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt
    });
  }, 1, 5000);

  return response.text || "Ecos distantes.";
}
