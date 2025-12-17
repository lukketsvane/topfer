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

  const parts: any[] = [];

  // Load reference images from public folder.
  // We assume the user has placed 'reference_1.png' and 'reference_2.png' in the public directory.
  const referenceImageUrls = ['/reference_1.png', '/reference_2.png'];
  
  for (const url of referenceImageUrls) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        const blob = await response.blob();
        const base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            // Remove data:image/png;base64, prefix
            const base64 = result.split(',')[1];
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });

        parts.push({
          inlineData: {
            mimeType: blob.type || 'image/png',
            data: base64Data
          }
        });
      } else {
        console.warn(`Reference image not found: ${url}. Make sure to add it to the public folder.`);
      }
    } catch (error) {
      console.warn(`Failed to load reference image ${url}:`, error);
    }
  }

  const prefix = "{generate the pages following these two spreads matching font size divider lines etc etc. the following is the next for the couple next spreads plan accordingly create one at a time. }";
  
  parts.push({
    text: `${prefix}\n\n${inputText}`,
  });

  const contents = [
    {
      role: 'user',
      parts: parts,
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