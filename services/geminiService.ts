import { GoogleGenAI } from "@google/genai";
import { SYSTEM_INSTRUCTION } from "../constants";
import { SpreadImage } from "../types";

const IMGBB_API_KEY = "67bc9085dfd47a9a6df5409995e66874";

// This will be called fresh each time to ensure we get the selected key
const createAIClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

async function uploadToImgBB(base64Image: string): Promise<string | null> {
  const formData = new FormData();
  formData.append("key", IMGBB_API_KEY);
  formData.append("image", base64Image);

  try {
    const response = await fetch("https://api.imgbb.com/1/upload", {
      method: "POST",
      body: formData,
    });
    const data = await response.json();
    if (data && data.data && data.data.url) {
      return data.data.url;
    } else {
      console.error("ImgBB Upload Failed:", data);
      return null;
    }
  } catch (error) {
    console.error("Error uploading to ImgBB:", error);
    return null;
  }
}

export const streamSpreadGeneration = async (
  inputText: string,
  onImage: (image: SpreadImage) => void,
  onText: (text: string) => void
) => {
  const ai = createAIClient();
  const model = 'gemini-3-pro-image-preview';
  
  const config = {
    responseModalities: ['IMAGE', 'TEXT'] as any,
    imageConfig: {
      aspectRatio: '3:2',
      imageSize: '4K',
    },
    systemInstruction: [SYSTEM_INSTRUCTION],
  };

  const imageParts: any[] = [];

  // Load reference images from provided URLs
  // Using the direct links provided
  const referenceImageUrls = [
    'https://i.ibb.co/PvWhDnNB/IMG-6743.jpg',
    'https://i.ibb.co/Q2QbfRM/IMG-6744.jpg'
  ];
  
  // Attempt to fetch and process reference images
  // We use a try-catch per image to ensure one bad image doesn't stop the flow
  for (const url of referenceImageUrls) {
    try {
      const response = await fetch(url, { mode: 'cors' });
      
      if (!response.ok) {
        console.warn(`Failed to fetch reference ${url}: ${response.status}`);
        continue;
      }

      // Basic content type check from headers
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('text/html')) {
         console.warn(`Reference image ${url} returned HTML content-type. Skipping.`);
         continue;
      }

      const blob = await response.blob();
      
      // Secondary check on the blob type
      if (blob.type.includes('text/html')) {
        console.warn(`Reference image ${url} is HTML blob. Skipping.`);
        continue;
      }
      
      if (blob.size < 1000) {
         console.warn(`Reference image ${url} is too small (${blob.size} bytes). Skipping.`);
         continue;
      }
      
      let mimeType = blob.type;
      const lowerUrl = url.toLowerCase();

      // If generic, guess from extension
      if (!mimeType || mimeType === 'application/octet-stream') {
           if (lowerUrl.endsWith('.png')) mimeType = 'image/png';
           else if (lowerUrl.endsWith('.jpg') || lowerUrl.endsWith('.jpeg')) mimeType = 'image/jpeg';
           else if (lowerUrl.endsWith('.webp')) mimeType = 'image/webp';
           else if (lowerUrl.endsWith('.heic')) mimeType = 'image/heic';
      }
      
      if (!mimeType.startsWith('image/')) {
          console.warn(`Skipping reference ${url}: Invalid mime type ${mimeType}`);
          continue;
      }

      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          // Remove data prefix if present
          if (result.includes(',')) {
              resolve(result.split(',')[1]);
          } else {
              resolve(result);
          }
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      if (base64Data) {
          imageParts.push({
            inlineData: {
                mimeType: mimeType,
                data: base64Data
            }
          });
      }
    } catch (error) {
      console.warn(`Failed to load reference image ${url}:`, error);
    }
  }

  const prefix = "{generate the pages following these two spreads matching font size divider lines etc etc. the following is the next for the couple next spreads plan accordingly create one at a time. }";
  
  const textPart = {
    text: `${prefix}\n\n${inputText}`,
  };

  // Helper function to execute generation
  // Allows us to retry if the first attempt with images fails
  const executeGeneration = async (includeImages: boolean) => {
    const parts = includeImages ? [...imageParts, textPart] : [textPart];
    
    const contents = [
        {
        role: 'user',
        parts: parts,
        },
    ];

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
                const id = crypto.randomUUID();

                const image: SpreadImage = {
                    id,
                    url,
                    mimeType,
                };
                onImage(image);

                // Upload to ImgBB
                uploadToImgBB(data).then((remoteUrl) => {
                    if (remoteUrl) {
                        onImage({
                            ...image,
                            remoteUrl: remoteUrl
                        });
                    }
                });
            } else if (part.text) {
                onText(part.text);
            }
        }
    }
  };

  try {
    // 1. Try with reference images if we have any
    await executeGeneration(imageParts.length > 0);
  } catch (error: any) {
    // 2. If it fails with a 400 error (Invalid Argument) and we included images, 
    // it's likely the images were rejected by the API. Retry without them.
    if (imageParts.length > 0 && (error.toString().includes('400') || error.message?.includes('INVALID_ARGUMENT'))) {
        console.warn("Generation with reference images failed (likely API rejection). Retrying with text only...");
        await executeGeneration(false);
    } else {
        // Re-throw if it's a different error or we didn't use images
        console.error("Error generating spreads:", error);
        throw error;
    }
  }
};