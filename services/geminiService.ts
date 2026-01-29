import { GoogleGenAI, Modality } from "@google/genai";
import { AIResponse, ChatMessage } from "../types";

// ============================================
// MODEL CONFIGURATION WITH FALLBACK
// ============================================

export interface ModelConfig {
  id: string;
  name: string;
  description: string;
  icon: string;
  isDefault?: boolean;
}

// Available models for text generation (in fallback order)
export const TEXT_MODELS: ModelConfig[] = [
  {
    id: "gemini-2.5-flash-preview-05-20",
    name: "Gemini 2.5 Flash",
    description: "Nhanh & Hiệu quả",
    icon: "⚡",
    isDefault: true
  },
  {
    id: "gemini-2.5-pro-preview-05-06",
    name: "Gemini 2.5 Pro",
    description: "Chất lượng cao",
    icon: "🎯"
  },
  {
    id: "gemini-2.0-flash",
    name: "Gemini 2.0 Flash",
    description: "Ổn định & An toàn",
    icon: "🔒"
  }
];

// TTS Model (separate from text models)
const TTS_MODEL = "gemini-2.5-flash-preview-tts";

// ============================================
// STATE MANAGEMENT
// ============================================

let appApiKey = "";
let selectedModelId = TEXT_MODELS[0].id;

// Load from localStorage on init
if (typeof window !== 'undefined') {
  const storedKey = localStorage.getItem('lingua_api_key');
  const storedModel = localStorage.getItem('lingua_selected_model');
  if (storedKey) appApiKey = storedKey;
  if (storedModel) selectedModelId = storedModel;
}

export const setApiKey = (key: string) => {
  appApiKey = key;
  if (typeof window !== 'undefined') {
    localStorage.setItem('lingua_api_key', key);
  }
};

export const getApiKey = (): string => {
  return appApiKey;
};

export const setSelectedModel = (modelId: string) => {
  selectedModelId = modelId;
  if (typeof window !== 'undefined') {
    localStorage.setItem('lingua_selected_model', modelId);
  }
};

export const getSelectedModel = (): string => {
  return selectedModelId;
};

export const getSelectedModelConfig = (): ModelConfig => {
  return TEXT_MODELS.find(m => m.id === selectedModelId) || TEXT_MODELS[0];
};

// ============================================
// API CLIENT
// ============================================

const getClient = () => {
  if (!appApiKey) {
    throw new Error("API Key is missing. Please enter your Gemini API Key in Settings.");
  }
  return new GoogleGenAI({ apiKey: appApiKey });
};

// Helper to clean JSON string if it comes with markdown blocks
const cleanJsonString = (str: string): string => {
  return str.replace(/```json\n?|```/g, "").trim();
};

// ============================================
// FALLBACK MECHANISM
// ============================================

interface FallbackOptions {
  startFromSelected?: boolean; // Start from user-selected model (default: true)
}

/**
 * Call API with automatic fallback to next model on failure
 * @param apiCall - Function that takes model ID and returns API response
 * @param options - Fallback options
 * @returns API response from successful model
 */
async function callWithFallback<T>(
  apiCall: (modelId: string) => Promise<T>,
  options: FallbackOptions = {}
): Promise<T> {
  const { startFromSelected = true } = options;
  
  // Build model order: start from selected, then try others
  let modelOrder: string[];
  if (startFromSelected) {
    const selectedIndex = TEXT_MODELS.findIndex(m => m.id === selectedModelId);
    const before = TEXT_MODELS.slice(0, selectedIndex);
    const after = TEXT_MODELS.slice(selectedIndex);
    modelOrder = [...after, ...before].map(m => m.id);
  } else {
    modelOrder = TEXT_MODELS.map(m => m.id);
  }

  let lastError: Error | null = null;

  for (const modelId of modelOrder) {
    try {
      console.log(`[GeminiService] Trying model: ${modelId}`);
      const result = await apiCall(modelId);
      console.log(`[GeminiService] Success with model: ${modelId}`);
      return result;
    } catch (error: any) {
      console.warn(`[GeminiService] Model ${modelId} failed:`, error.message);
      lastError = error;
      
      // Check if error is retriable (rate limit, quota, server error)
      const isRetriable = 
        error.message?.includes('429') || // Rate limit
        error.message?.includes('503') || // Service unavailable
        error.message?.includes('500') || // Server error
        error.message?.includes('quota') ||
        error.message?.includes('overloaded') ||
        error.message?.includes('capacity');
      
      if (!isRetriable) {
        // Non-retriable error (e.g., invalid API key, bad request)
        throw error;
      }
      
      // Continue to next model
      console.log(`[GeminiService] Falling back to next model...`);
    }
  }

  // All models failed
  throw lastError || new Error("All models failed. Please try again later.");
}

// ============================================
// TEXT-TO-SPEECH
// ============================================

export const generateSpeech = async (text: string): Promise<string> => {
  const ai = getClient();
  try {
    const response = await ai.models.generateContent({
      model: TTS_MODEL,
      contents: { parts: [{ text }] },
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
        }
      }
    });
    
    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("No audio generated");
    return base64Audio;
  } catch (error) {
    console.error("TTS Error:", error);
    return ""; // Return empty string if TTS fails, so chat can continue with text only
  }
};

// ============================================
// WRITING ANALYSIS
// ============================================

export const analyzeWriting = async (
  text: string,
  taskType: "IELTS" | "TOEIC" | "General" = "General"
): Promise<AIResponse> => {
  const ai = getClient();
  
  const prompt = `
    Act as an expert English teacher and examiner for ${taskType}.
    Analyze the following text provided by a student.
    
    Student Text: "${text}"

    Your task:
    1. Check for grammatical errors, spelling mistakes, and awkward phrasing.
    2. Suggest better vocabulary appropriate for a high-level context.
    3. Give a band score (0-10 scale based on accuracy and complexity).
    4. Provide a rewritten, improved version of the text.
    5. Provide specific sub-scores for: Task Response, Coherence & Cohesion, Lexical Resource, Grammatical Range & Accuracy.

    Return the result strictly in this JSON format:
    {
      "score": number,
      "scoreBreakdown": {
        "Task Response": number,
        "Coherence": number,
        "Vocabulary": number,
        "Grammar": number
      },
      "feedback": "string (general encouraging feedback)",
      "detailedErrors": [
        {
          "original": "string (the mistake)",
          "correction": "string (the fix)",
          "explanation": "string (why it is wrong)",
          "type": "grammar" | "vocabulary" | "coherence"
        }
      ],
      "improvedVersion": "string"
    }
  `;

  return callWithFallback(async (modelId) => {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    const jsonText = cleanJsonString(response.text || "{}");
    return JSON.parse(jsonText) as AIResponse;
  });
};

// ============================================
// SPEAKING ANALYSIS (SINGLE TURN)
// ============================================

export const analyzeSpeaking = async (
  audioBase64: string,
  topic: string = "General English"
): Promise<AIResponse> => {
  // Re-using the Grading Logic
  return gradeSpeakingSession([{ role: 'user', text: '(Audio Transcript Placeholder)' }], topic, audioBase64);
};

// ============================================
// SPEAKING INTERACTION (TURN-BY-TURN)
// ============================================

export const interactWithExaminer = async (
  history: ChatMessage[],
  topic: string,
  userAudioBase64?: string,
  specificQuestion?: string,
  isFinish: boolean = false
): Promise<{ userTranscription: string; aiResponse: string; aiAudioBase64?: string }> => {
  const ai = getClient();

  // Construct context from history
  const context = history.map(h => `${h.role === 'ai' ? 'Examiner' : 'Student'}: ${h.text}`).join("\n");

  const systemInstruction = `
    You are a friendly but professional IELTS Speaking Examiner. 
    The topic is: "${topic}".
    
    Your goal is to conduct a short interview.
    
    Current Conversation History:
    ${context}
  `;

  let prompt = "";
  const parts: any[] = [];

  if (!userAudioBase64) {
    // Start of session
    if (specificQuestion) {
        prompt = `Start the interview. Introduce yourself briefly (1 sentence) and ask exactly this question: "${specificQuestion}". Return JSON: { "transcription": "", "response": "Your intro and question" }`;
    } else {
        prompt = `Start the interview. Introduce yourself briefly and ask the first question about "${topic}". Return JSON: { "transcription": "", "response": "Your intro and question" }`;
    }
    parts.push({ text: prompt });
  } else {
    // User responded
    const transcriptionInstruction = "1. Transcribe the user's audio accurately.";
    
    if (isFinish) {
        prompt = `
          The user just answered the final question via audio.
          ${transcriptionInstruction}
          2. Generate a brief polite closing statement (e.g. "Thank you for your answers. The test is now finished.").
          Do NOT ask another question.
          
          Return JSON: { "transcription": "exact words spoken by student", "response": "Closing statement" }
        `;
    } else if (specificQuestion) {
        prompt = `
          The user just answered via audio. 
          ${transcriptionInstruction}
          2. Generate a brief, natural response to acknowledge their answer (e.g., "That's interesting," "I see").
          3. Ask exactly this NEXT question: "${specificQuestion}".
          4. Keep your response concise (under 30 words) so the student talks more.
          
          Return JSON: { "transcription": "exact words spoken by student", "response": "Your reaction + next question" }
        `;
    } else {
        prompt = `
          The user just answered via audio. 
          ${transcriptionInstruction}
          2. Generate a brief, natural response to acknowledge their answer (e.g., "That's interesting," "I see").
          3. Ask the NEXT follow-up question related to the topic.
          4. Keep your response concise (under 30 words) so the student talks more.
          
          Return JSON: { "transcription": "exact words spoken by student", "response": "Your reaction + next question" }
        `;
    }
    
    parts.push({ inlineData: { mimeType: "audio/webm; codecs=opus", data: userAudioBase64 } });
    parts.push({ text: prompt });
  }

  const result = await callWithFallback(async (modelId) => {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: {
        parts: parts
      },
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json"
      }
    });

    const jsonText = cleanJsonString(response.text || "{}");
    return JSON.parse(jsonText);
  });

  // Generate TTS Audio for the response
  let aiAudioBase64 = "";
  if (result.response) {
    aiAudioBase64 = await generateSpeech(result.response);
  }

  return {
    userTranscription: result.transcription || "",
    aiResponse: result.response,
    aiAudioBase64
  };
};

// ============================================
// SPEAKING SESSION GRADING
// ============================================

export const gradeSpeakingSession = async (
  fullHistory: ChatMessage[],
  topic: string,
  lastAudioBase64?: string
): Promise<AIResponse> => {
  const ai = getClient();

  const transcript = fullHistory.map(h => `${h.role.toUpperCase()}: ${h.text}`).join("\n");

  const prompt = `
    Act as a Speaking Examiner.
    Topic: "${topic}".
    
    Here is the full transcript of the interview with the student:
    
    ${transcript}

    Your task is to evaluate the student's performance based STRICTLY on the following rubric (Total 10 points):

    **1. Content (Nội dung) - Max 3 points**
    - 3 pts: Answers are relevant, clear ideas, includes examples/explanations.
    - 2 pts: Relevant but simple ideas.
    - 1 pt: Unclear ideas, rambling or not directly answering.
    - 0 pts: No answer.

    **2. Language (Ngôn ngữ) - Max 3 points**
    - 3 pts: Appropriate vocabulary, accurate sentences.
    - 2 pts: Minor errors but understandable.
    - 1 pt: Many errors, limited vocabulary.
    - 0 pts: Severe errors, unintelligible.

    **3. Pronunciation (Phát âm) - Max 2 points**
    - 2 pts: Clear pronunciation, natural intonation.
    - 1 pt: Some errors but understandable.
    - 0 pts: Poor pronunciation, hard to hear.

    **4. Fluency (Lưu loát) - Max 2 points**
    - 2 pts: Fluent, confident speaking.
    - 1 pt: Hesitant, pauses often.
    - 0 pts: Very hesitant or silent.

    Analyze the transcript (and audio context if available) to determine the score.
    Identify any specific errors in pronunciation or grammar from the text provided.

    Return the result strictly in this JSON format:
    {
      "transcription": "Full session transcript...",
      "score": number, // Total score out of 10
      "scoreBreakdown": {
         "Content": number, // Max 3
         "Language": number, // Max 3
         "Pronunciation": number, // Max 2
         "Fluency": number // Max 2
      },
      "feedback": "string (Overall feedback in Vietnamese or English)",
      "detailedErrors": [
        {
          "original": "string (error)",
          "correction": "string (correction)",
          "explanation": "string (why)",
          "type": "pronunciation" | "grammar" | "vocabulary"
        }
      ]
    }
  `;

  // We can attach the last audio chunk just to give the model a sense of the voice quality for the *final* turn
  const contents: any = { parts: [] };
  if (lastAudioBase64) {
    contents.parts.push({ inlineData: { mimeType: "audio/webm; codecs=opus", data: lastAudioBase64 } });
  }
  contents.parts.push({ text: prompt });

  return callWithFallback(async (modelId) => {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: contents,
      config: {
        responseMimeType: "application/json"
      }
    });

    const jsonText = cleanJsonString(response.text || "{}");
    return JSON.parse(jsonText) as AIResponse;
  });
};

// ============================================
// PRONUNCIATION ANALYSIS
// ============================================

export const analyzePronunciation = async (
  audioBase64: string,
  targetText: string
): Promise<AIResponse> => {
  const ai = getClient();

  const prompt = `
    Act as a strict pronunciation coach.
    The student is trying to read this specific sentence: "${targetText}".
    Analyze the attached audio recording based on the following rubric (Total 10 points).

    **RUBRIC CRITERIA:**

    **1. Articulation (Max 3 points)**
    - 3 pts: Clear pronunciation, correct ending sounds and difficult sounds.
    - 2 pts: Minor errors but still understandable.
    - 1 pt: Many errors, causing confusion.
    - 0 pts: Severe pronunciation errors.

    **2. Intonation & Stress (Max 3 points)**
    - 3 pts: Correct stress, natural intonation.
    - 2 pts: Some stress but inconsistent.
    - 1 pt: Little stress, monotone.
    - 0 pts: No intonation.

    **3. Fluency & Linking (Max 2 points)**
    - 2 pts: Seamless flow, good linking.
    - 1 pt: Slight pauses.
    - 0 pts: Hesitant, many pauses.

    **4. Confidence & Attitude (Max 2 points)**
    - 2 pts: Confident, clear voice.
    - 1 pt: Slightly shy.
    - 0 pts: Lack of focus/confidence.

    Your task:
    1. Transcribe exactly what the student said.
    2. Score strictly based on the rubric above.
    3. Identify words that were mispronounced, skipped, or added.

    Return the result strictly in this JSON format:
    {
      "transcription": "string",
      "score": number (Sum of criteria points, integer 0-10),
      "scoreBreakdown": {
         "Articulation": number,
         "Intonation": number,
         "Fluency": number,
         "Confidence": number
      },
      "feedback": "string (Overall comment on performance)",
      "detailedErrors": [
        {
          "original": "string (the word they struggled with)",
          "correction": "string (IPA or phonetic spelling)",
          "explanation": "string (specific advice on how to pronounce this word)",
          "type": "pronunciation"
        }
      ]
    }
  `;

  return callWithFallback(async (modelId) => {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "audio/webm; codecs=opus", 
              data: audioBase64
            }
          },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json"
      }
    });

    const jsonText = cleanJsonString(response.text || "{}");
    return JSON.parse(jsonText) as AIResponse;
  });
};