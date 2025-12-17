import { GoogleGenAI } from "@google/genai";
import { SYSTEM_INSTRUCTION } from "../constants";
import { SpreadImage } from "../types";

// This will be called fresh each time to ensure we get the selected key
const createAIClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const streamSpreadGeneration = async (
  inputText: string,
  onImage: (image: SpreadImage) => void,
  onText: (text: string) => void
) => {
  const ai = createAIClient();
  const model = 'gemini-3-pro-image-preview';
  
  const config = {
    responseModalities: ['IMAGE', 'TEXT'] as any, // Cast because SDK types might trail actual features for preview models
    imageConfig: {
      aspectRatio: '3:2',
      imageSize: '4K',
    },
    systemInstruction: [SYSTEM_INSTRUCTION],
  };

  const contents = [
    {
      role: 'user',
      parts: [
        {
          text: inputText,
        },
      ],
    },
  ];

  try {
    const responseStream = await ai.models.generateContentStream({
      model,
      config,
      contents,
    });

    for await (const chunk of responseStream) {
      const candidates = chunk.candidates;
      if (!candidates || candidates.length === 0) continue;

      const content = candidates[0].content;
      if (!content || !content.parts) continue;

      for (const part of content.parts) {
        if (part.inlineData) {
          const mimeType = part.inlineData.mimeType || 'image/png';
          const data = part.inlineData.data;
          const url = `data:${mimeType};base64,${data}`;
          
          const image: SpreadImage = {
            id: crypto.randomUUID(),
            url,
            mimeType,
          };
          onImage(image);
        } else if (part.text) {
          onText(part.text);
        }
      }
    }
  } catch (error) {
    console.error("Error generating spreads:", error);
    throw error;
  }
};