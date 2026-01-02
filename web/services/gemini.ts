
import { GoogleGenAI, Type } from "@google/genai";

// Initialize the Gemini API client using the environment variable directly as required by guidelines.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function processSittingDocuments(images: string[]) {
  // Create parts for each image
  const imageParts = images.map(img => {
    const [header, data] = img.split(',');
    const mimeType = header.split(':')[1].split(';')[0];
    return {
      inlineData: {
        mimeType: mimeType,
        data: data,
      },
    };
  });

  const prompt = `
    Analyze these images of official Senate 'Votes and Proceedings' documents. 
    1. Extract all agenda items (title, number, and full content text). 
    2. Provide a concise, institutional summary of the entire sitting's proceedings.
    3. Ensure all text is transcribed accurately as it appears in the official record.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ parts: [...imageParts, { text: prompt }] }],
      config: {
        systemInstruction: "You are an expert Senate Registry Clerk assistant. Your job is to accurately digitize and summarize legislative records.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summaryText: { type: Type.STRING, description: "An official summary of the sitting." },
            agendaItems: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  number: { type: Type.INTEGER, description: "The item number (e.g. 1, 2, 3)." },
                  title: { type: Type.STRING, description: "The uppercase title of the section." },
                  content: { type: Type.STRING, description: "The full body text of the section." }
                },
                required: ["number", "title", "content"]
              }
            }
          },
          required: ["summaryText", "agendaItems"]
        }
      }
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Gemini multi-modal processing error:", error);
    throw error;
  }
}

// Deprecated: Replaced by processSittingDocuments for better context
export async function generateSessionSummary(sittingText: string): Promise<string> {
  return "Deprecated. Use processSittingDocuments.";
}

export async function extractAgendaItems(documentText: string) {
  return [];
}
