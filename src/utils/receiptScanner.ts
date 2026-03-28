import type { ReceiptItem } from '../types';

export interface ReceiptResult {
  total: number;
  items: ReceiptItem[];
  storeName?: string;
}

/**
 * Convert a File/Blob to a base64 data string (without the prefix).
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip the data:image/...;base64, prefix
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Send a receipt image to the Gemini API and extract total + line items.
 */
export async function scanReceipt(imageFile: File): Promise<ReceiptResult> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Gemini API key not configured (VITE_GEMINI_API_KEY)');
  }

  const base64 = await fileToBase64(imageFile);
  const mimeType = imageFile.type || 'image/jpeg';

  const prompt = `You are a receipt parser. Analyze this receipt image and extract:
1. The total amount paid
2. Each line item with its name and price

Respond ONLY with valid JSON in this exact format, no markdown:
{
  "total": 12.50,
  "items": [
    { "name": "Item name", "price": 1.50 }
  ],
  "storeName": "Store Name"
}

Rules:
- All prices must be numbers, not strings
- If you cannot read an item clearly, skip it
- The total should be the final amount paid
- If no total is visible, sum the items
- Keep item names short and clean`;

  // Try models in order (cheapest first)
  const endpoints = [
    'https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash-lite:generateContent',
    'https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent',
    'https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash-lite:generateContent',
  ];
  const requestBody = JSON.stringify({
    contents: [{
      parts: [
        { text: prompt },
        {
          inlineData: {
            mimeType,
            data: base64,
          },
        },
      ],
    }],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 2048,
    },
  });

  let response: Response | null = null;
  let lastError = '';

  for (const endpoint of endpoints) {
    const url = `${endpoint}?key=${apiKey}`;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: requestBody,
      });
      if (response.ok) break;
      lastError = await response.text();
      // Retry on 429 (rate limit) or 404 (model not found)
      if (response.status !== 429 && response.status !== 404) break;
    } catch {
      // Network error — try next endpoint
      lastError = 'Network error';
    }
  }

  if (!response || !response.ok) {
    if (response?.status === 429) {
      throw new Error('API rate limit reached. Please wait a moment and try again.');
    }
    throw new Error(`Gemini API error (${response?.status}): ${lastError}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

  // Extract JSON from the response (handle markdown code blocks)
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Could not parse receipt — no JSON in response');
  }

  const parsed = JSON.parse(jsonMatch[0]);

  return {
    total: typeof parsed.total === 'number' ? parsed.total : 0,
    items: Array.isArray(parsed.items)
      ? parsed.items
          .filter((i: { name?: string; price?: number }) => i.name && typeof i.price === 'number')
          .map((i: { name: string; price: number }) => ({ name: i.name, price: i.price }))
      : [],
    storeName: parsed.storeName || undefined,
  };
}
