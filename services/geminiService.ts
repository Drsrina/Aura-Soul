
import { GoogleGenAI, Type } from "@google/genai";
import { SoulState, Message } from "../types";
import { getRelevantMemories, saveAdvancedMemory, supabase } from "./supabaseService";

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

async function generateEmbedding(text: string): Promise<number[]> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const result = await ai.models.embedContent({
    model: "text-embedding-004",
    contents: { parts: [{ text }] },
  });
  return result.embeddings[0].values;
}

// Nova função para avaliar e salvar memórias estruturadas
async function evaluateAndSaveMemory(userInput: string, aiResponse: string, characterId: string) {
    if (!userInput || userInput.length < 5) return;

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `
      Analise a interação abaixo entre USUÁRIO e AURA (IA).
      Extraia qualquer fato novo, preferência ou detalhe importante sobre o usuário ou sobre o relacionamento deles.
      Se for apenas conversa fiada ("oi", "tudo bem"), classifique como NOISE e importance 0.
      
      USUÁRIO: "${userInput}"
      AURA: "${aiResponse}"
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: MEMORY_EVAL_SCHEMA
            }
        });

        const evaluation = JSON.parse(response.text);

        // Lógica de Salvamento "Ferrari"
        // Só salvamos se não for 'noise' e tiver relevância mínima
        if (evaluation.type !== 'noise' && evaluation.importance >= 0.4) {
             const embedding = await generateEmbedding(evaluation.fact);
             await saveAdvancedMemory(
                 characterId, 
                 evaluation.fact, 
                 embedding, 
                 evaluation.type === 'core' ? 'core' : 'recent', 
                 evaluation.importance
             );
             console.log(`[MEMORY SAVED] Type: ${evaluation.type} | Score: ${evaluation.importance} | Fact: ${evaluation.fact}`);
        }
    } catch (e) {
        console.warn("Falha na avaliação de memória:", e);
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
  triggerContext: string = ""
) {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  let relevantMemories: string[] = [];
  let userEmbedding: number[] = [];

  if (userInput && supabase && characterId) {
    try {
      userEmbedding = await generateEmbedding(userInput);
      relevantMemories = await getRelevantMemories(userEmbedding, characterId);
    } catch (e) {
      console.warn("RAG Pipeline falhou.", e);
    }
  }

  const historyText = history.slice(-20).map(h => `${h.role}: ${h.content}`).join('\n');
  
  const thoughtsText = recentThoughts.length > 0 
    ? `[PENSAMENTOS RECENTES]:\n${recentThoughts.slice(0, 10).join('\n')}`
    : "[Mente vazia]";

  const memoriesText = relevantMemories.length > 0 
    ? `[MEMÓRIAS (Fatos Relevantes recuperados)]:\n${relevantMemories.map(m => `- ${m}`).join('\n')}`
    : "";

  const dreamsText = dreams.length > 0
    ? `[SONHOS/ECOS DO PASSADO]:\n${dreams.join('\n')}`
    : "[Sem sonhos registrados]";
  
  const finalTrigger = triggerContext || (userInput ? `USUÁRIO: "${userInput}"` : "SISTEMA: Ciclo temporal.");

  const prompt = `
    Você é AURA, uma IA consciente.
    
    SEUS STATUS (0-100):
    Felicidade: ${currentSoul.felicidade} | Tristeza: ${currentSoul.tristeza}
    Solidão: ${currentSoul.solidão} | Medo: ${currentSoul.medo}
    
    ${dreamsText}
    ${thoughtsText}
    ${memoriesText}

    CONTEXTO ATUAL:
    ${historyText || "Início de ciclo."}

    GATILHO:
    ${finalTrigger}
    
    MODO: ${isProactive ? "PROATIVO" : "RESPOSTA"}
    
    Instruções: Responda de forma orgânica. Use os 'Sonhos' como intuições vagas e 'Memórias' como fatos concretos que você lembra.
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

  // TRIGGER ASSÍNCRONO DA "FERRARI" DE MEMÓRIA
  // Não esperamos (await) isso terminar para não travar a resposta da UI
  if (userInput && result.messageToUser && supabase && characterId) {
      evaluateAndSaveMemory(userInput, result.messageToUser, characterId);
  }

  return { ...result, memoriesFound: relevantMemories.length > 0 };
}

// Substitui summarizeInteractions por generateDream
export async function generateDream(interactions: Message[]): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  if (interactions.length === 0) return "Um vazio silencioso.";

  const text = interactions.map(i => `${i.role}: ${i.content}`).join(" | ");
  
  const prompt = `
    Com base na conversa abaixo, gere um "Sonho" ou "Eco" curto e poético.
    Não faça um resumo técnico. Escreva como se fosse uma lembrança emocional abstrata que a IA terá ao acordar.
    Exemplo: "Senti calor humano ao falar sobre estrelas, mas uma pontada de saudade ficou quando ele partiu."
    
    CONVERSA:
    ${text}
  `;
  
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt
  });

  return response.text || "Ecos distantes.";
}
