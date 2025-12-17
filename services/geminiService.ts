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

  const parts: any[] = [];

  // Load reference images from public folder.
  // We assume the user has placed 'reference_1.png' and 'reference_2.png' in the public directory.
  const referenceImageUrls = ['/reference_1.png', '/reference_2.png'];
  
  for (const url of referenceImageUrls) {
    try {
      const response = await fetch(url);
      
      // Check headers first if available to detect HTML fallback
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('text/html')) {
         console.warn(`Reference image ${url} returned HTML (likely SPA fallback). Skipping.`);
         continue;
      }

      if (response.ok) {
        const blob = await response.blob();
        
        let mimeType = blob.type;
        const lowerUrl = url.toLowerCase();

        // STRICT CHECK: If the blob is HTML, it is definitely not an image we can use.
        // This prevents the app from sending the index.html file as an image to Gemini,
        // which causes the 400 Invalid Argument error.
        if (mimeType.includes('text/html')) {
             console.warn(`Reference image ${url} is text/html. Skipping.`);
             continue;
        }

        // If MIME type is generic/missing, we can try to guess based on extension,
        // but ONLY if we are sure it's not HTML.
        if (!mimeType || mimeType === 'application/octet-stream') {
             if (lowerUrl.endsWith('.png')) mimeType = 'image/png';
             else if (lowerUrl.endsWith('.jpg') || lowerUrl.endsWith('.jpeg')) mimeType = 'image/jpeg';
             else if (lowerUrl.endsWith('.webp')) mimeType = 'image/webp';
             else if (lowerUrl.endsWith('.heic')) mimeType = 'image/heic';
             else if (lowerUrl.endsWith('.heif')) mimeType = 'image/heif';
        }
        
        // Final safety check: if it's still not an image type, skip it.
        if (!mimeType.startsWith('image/')) {
            console.warn(`Skipping reference ${url}: Could not determine valid image mime type (got ${blob.type})`);
            continue;
        }

        const base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            // Remove data:image/png;base64, prefix if present
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
            parts.push({
            inlineData: {
                mimeType: mimeType,
                data: base64Data
            }
            });
        }
      } else {
        // Just warn, don't break. This is expected if the user only added one image or none.
        console.warn(`Reference image not found: ${url}. Proceeding without it.`);
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
          const id = crypto.randomUUID();

          // 1. Emit local image immediately for UI feedback
          const image: SpreadImage = {
            id,
            url,
            mimeType,
          };
          onImage(image);

          // 2. Upload to ImgBB in background
          uploadToImgBB(data).then((remoteUrl) => {
            if (remoteUrl) {
                console.log("Uploaded to ImgBB:", remoteUrl);
                // 3. Update the image with the remote URL
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
  } catch (error) {
    console.error("Error generating spreads:", error);
    throw error;
  }
};