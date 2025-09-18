
// FIX: Import Modality for use in the image editing function.
import { GoogleGenAI, Modality } from "@google/genai";

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}
  
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateImages = async (prompt: string, aspectRatio: string): Promise<string[]> => {
  try {
    const response = await ai.models.generateImages({
      model: 'imagen-4.0-generate-001',
      prompt: prompt,
      config: {
        numberOfImages: 4,
        outputMimeType: 'image/png',
        aspectRatio: aspectRatio,
      },
    });

    if (response.generatedImages && response.generatedImages.length > 0) {
      return response.generatedImages.map(img => `data:image/png;base64,${img.image.imageBytes}`);
    }

    return [];
  } catch (error) {
    console.error('Error generating images with Gemini:', error);
    throw new Error('Failed to generate images. The prompt may have been blocked or the service may be unavailable.');
  }
};

export const downloadGeneratedImage = async (imageUrl: string, prompt: string, format: 'png' | 'jpeg'): Promise<void> => {
  try {
    // The imageUrl is now a data URL (e.g., "data:image/png;base64,...")
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    
    const filename = prompt.substring(0, 40).replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'generated-image';
    a.download = `${filename}.${format}`;
    
    document.body.appendChild(a);
    a.click();
    
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (error) {
    console.error('Error downloading image:', error);
    throw new Error('Could not download the image.');
  }
};

// FIX: Export 'editImage' function to be used in ImageEditor.tsx.
// This function takes a base64 encoded image, its MIME type, and a text prompt
// to edit the image using the 'gemini-2.5-flash-image-preview' model.
export const editImage = async (base64ImageData: string, mimeType: string, prompt: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image-preview',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64ImageData,
              mimeType: mimeType,
            },
          },
          {
            text: prompt,
          },
        ],
      },
      config: {
        responseModalities: [Modality.IMAGE, Modality.TEXT],
      },
    });

    if (response.candidates && response.candidates.length > 0) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          const base64ImageBytes: string = part.inlineData.data;
          const imageMimeType = part.inlineData.mimeType;
          return `data:${imageMimeType};base64,${base64ImageBytes}`;
        }
      }
    }
    
    throw new Error('No edited image was returned from the API.');
  } catch (error) {
    console.error('Error editing image:', error);
    throw new Error('Failed to edit image. Please try again.');
  }
};