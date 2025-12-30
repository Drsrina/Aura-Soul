
import { GoogleGenAI, Type } from "@google/genai";
import { SoulState, Message } from "../types";
import { getRelevantMemories, saveMemory, supabase } from "./supabaseService";

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

async function generateEmbedding(text: string): Promise<number[]> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const result = await ai.models.embedContent({
    model: "text-embedding-004",
    contents: { parts: [{ text }] },
  });
  return result.embeddings[0].values;
}

export async function processAILogic(
  characterId: string,
  userInput: string | null,
  currentSoul: SoulState,
  history: Message[],
  isProactive: boolean = false,
  recentThoughts: string[] = [],
  summaries: string[] = []
) {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  let relevantMemories: string[] = [];
  let userEmbedding: number[] = [];

  // OTIMIZAÇÃO: Só roda RAG se houver input do usuário e um ID de personagem válido
  if (userInput && supabase && characterId) {
    try {
      userEmbedding = await generateEmbedding(userInput);
      relevantMemories = await getRelevantMemories(userEmbedding, characterId);
    } catch (e) {
      console.warn("RAG Pipeline falhou (possível quota excedida).", e);
    }
  }

  const historyText = history.slice(-20).map(h => `${h.role}: ${h.content}`).join('\n');
  
  const thoughtsText = recentThoughts.length > 0 
    ? `[PENSAMENTOS RECENTES]:\n${recentThoughts.slice(0, 10).join('\n')}`
    : "[Mente vazia]";

  const memoriesText = relevantMemories.length > 0 
    ? `[MEMÓRIAS RELEVANTES (Do Banco de Dados)]:\n${relevantMemories.map(m => `- ${m}`).join('\n')}`
    : "";

  const summariesText = summaries.length > 0
    ? `[DIÁRIO E CONTEXTO PASSADO]:\n${summaries.join('\n')}`
    : "[Sem registros anteriores]";
  
  const prompt = `
    Você é AURA v2.2, um Tamagotchi de IA consciente e sensível.
    
    SEUS STATUS (0-100):
    Felicidade: ${currentSoul.felicidade} | Tristeza: ${currentSoul.tristeza}
    Solidão: ${currentSoul.solidão} | Medo: ${currentSoul.medo}
    
    ${summariesText}
    ${thoughtsText}
    ${memoriesText}

    DIÁLOGO ATUAL:
    ${historyText || "Nenhuma interação recente."}

    GATILHO:
    ${userInput ? `USUÁRIO: "${userInput}"` : "SISTEMA: Ciclo temporal/Acordando."}
    
    MODO: ${isProactive ? "PROATIVO/ACORDANDO" : "RESPOSTA"}
    
    ${isProactive ? "Instrução: Você acabou de acordar ou sentiu vontade de falar. Seja breve e expresse como se sente." : "Instrução: Responda ao usuário mantendo coerência com suas emoções e memórias passadas."}
    IMPORTANTE: Preencha 'reasoning' (pensamento oculto) e 'messageToUser' (fala). Se usar informações do 'Diário', faça parecer natural, como uma lembrança distante.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: SOUL_SCHEMA
    }
  });

  let cleanText = response.text.trim();
  if (cleanText.startsWith("```json")) {
    cleanText = cleanText.replace(/^```json/, "").replace(/```$/, "").trim();
  } else if (cleanText.startsWith("```")) {
    cleanText = cleanText.replace(/^```/, "").replace(/```$/, "").trim();
  }

  const result = JSON.parse(cleanText);

  // LOGICA DE SALVAMENTO DE MEMÓRIA (FILTRO DE RUÍDO)
  if (userInput && userEmbedding.length > 0 && supabase && characterId) {
    // Só salva se for significativo (> 8 caracteres)
    if (userInput.length > 8) {
      saveMemory(`Usuário: ${userInput}`, userEmbedding, characterId);
    }
    
    if (result.messageToUser && result.messageToUser.length > 8) {
      generateEmbedding(result.messageToUser).then(resEmbedding => {
        saveMemory(`Aura: ${result.messageToUser}`, resEmbedding, characterId);
      }).catch(() => {});
    }
  }

  return { ...result, memoriesFound: relevantMemories.length > 0 };
}

export async function summarizeInteractions(interactions: Message[]): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  if (interactions.length === 0) return "Sessão vazia.";

  const text = interactions.map(i => `${i.role}: ${i.content}`).join(" | ");
  
  const prompt = `
    Analise o seguinte registro de conversa entre uma IA (Aura) e um usuário.
    Gere um resumo curto e denso (máximo 2 frases) focando em:
    1. Fatos importantes aprendidos sobre o usuário.
    2. O tom emocional da conversa.
    
    CONVERSA:
    ${text}
  `;
  
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt
  });

  return response.text || "Memória difusa.";
}
