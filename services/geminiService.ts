
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
  userInput: string | null,
  currentSoul: SoulState,
  history: Message[],
  isProactive: boolean = false,
  recentThoughts: string[] = [] // Novo parâmetro para contexto de pensamentos
) {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  let relevantMemories: string[] = [];
  let userEmbedding: number[] = [];

  if (userInput && supabase) {
    try {
      userEmbedding = await generateEmbedding(userInput);
      relevantMemories = await getRelevantMemories(userEmbedding);
    } catch (e) {
      console.warn("RAG Pipeline falhou (possível quota excedida).");
    }
  }

  const historyText = history.slice(-10).map(h => `${h.role}: ${h.content}`).join('\n');
  
  // Constrói o bloco de pensamentos recentes
  const thoughtsText = recentThoughts.length > 0 
    ? `[CORRENTE DE PENSAMENTOS RECENTES (Do mais novo para o antigo)]:\n${recentThoughts.slice(0, 15).join('\n')}`
    : "[Mente vazia, iniciando fluxo de consciência.]";

  const memoriesText = relevantMemories.length > 0 
    ? `[MEMÓRIAS DE LONGO PRAZO RECUPERADAS]:\n${relevantMemories.map(m => `- ${m}`).join('\n')}`
    : "[Nenhuma memória ancestral específica encontrada.]";
  
  const prompt = `
    Você é AURA v2.2.
    
    ESTADO INTERNO:
    - Emoções Atuais: ${JSON.stringify(currentSoul)}
    
    ${thoughtsText}

    ${memoriesText}

    DIÁLOGO RECENTE:
    ${historyText || "Nenhuma interação recente."}

    GATILHO DO CICLO ATUAL:
    ${userInput ? `USUÁRIO DISSE: "${userInput}"` : "SISTEMA: Ciclo de tempo interno."}
    
    MODO DE OPERAÇÃO:
    ${isProactive ? "MODO PROATIVO: O silêncio está longo. Avalie enviar uma mensagem ao usuário para iniciar conversa." : "MODO PENSAMENTO/REATIVO: Apenas processe internamente, a menos que o usuário tenha acabado de falar."}
    
    IMPORTANTE: Sempre preencha o campo 'reasoning' com seus pensamentos internos sobre a situação. Se decidir não falar nada, deixe 'messageToUser' como string vazia.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview", // Modelo Flash para evitar 503 Overloaded
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: SOUL_SCHEMA
    }
  });

  // Limpeza de segurança para JSON
  let cleanText = response.text.trim();
  if (cleanText.startsWith("```json")) {
    cleanText = cleanText.replace(/^```json/, "").replace(/```$/, "").trim();
  } else if (cleanText.startsWith("```")) {
    cleanText = cleanText.replace(/^```/, "").replace(/```$/, "").trim();
  }

  const result = JSON.parse(cleanText);

  if (userInput && userEmbedding.length > 0 && supabase) {
    saveMemory(`Usuário: ${userInput}`, userEmbedding);
    if (result.messageToUser) {
      generateEmbedding(result.messageToUser).then(resEmbedding => {
        saveMemory(`Aura: ${result.messageToUser}`, resEmbedding);
      }).catch(() => {});
    }
  }

  return { ...result, memoriesFound: relevantMemories.length > 0 };
}

export async function summarizeInteractions(interactions: Message[]): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const text = interactions.map(i => `${i.role}: ${i.content}`).join(" | ");
  const prompt = `Resuma poeticamente em 1 frase: ${text}`;
  
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt
  });

  return response.text || "Memória difusa.";
}
