/**
 * Google Gemini 2.5 Flash Live API Integration
 * 
 * Real-time multimodal streaming audio analysis for AMD
 */

import type { AmdAnalysisResult } from '@/lib/types';

export interface GeminiLiveConfig {
  apiKey: string;
  model?: string;
}

export interface AudioFrame {
  data: string; // Base64 encoded audio
  mimeType: string;
}

export interface GeminiLiveResponse {
  result: 'HUMAN' | 'MACHINE' | 'UNCERTAIN';
  confidence: number;
  reasoning?: string;
}

/**
 * Gemini 2.5 Flash Live AMD Strategy
 * 
 * Uses Google's latest Live API for real-time audio analysis
 */
export class Gemini25FlashLiveAMD {
  private apiKey: string;
  private model: string;
  private session: any = null;
  private ws: WebSocket | null = null;
  private configUrl: string;

  constructor(config: GeminiLiveConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model || 'models/gemini-2.5-flash-exp:live';
    
    // Gemini Live API endpoints
    this.configUrl = `https://generativelanguage.googleapis.com/v1beta/${this.model}:configure?key=${this.apiKey}`;
  }

  /**
   * Initialize Live session
   */
  async initialize(): Promise<string> {
    try {
      const response = await fetch(this.configUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{
              text: `You are an expert answering machine detector. Analyze incoming audio to determine if it's a human answering or a voicemail/machine greeting.

Detection criteria for MACHINE/VOICEMAIL:
- Formal recorded greetings ("Hello, you've reached...", "Please leave a message...")
- Beep tones
- Pre-recorded messages
- Robotic or synthesized voices
- Multiple numbers recited ("press 1 for...")
- Consistent timing/pace

Detection criteria for HUMAN:
- Casual greetings ("hello?", "hi", "hey")
- Natural speech patterns
- Background noise (TV, people, etc.)
- Immediate response to "hello?"
- Varying intonation
- Incomplete sentences

Respond ONLY with valid JSON in this exact format:
{"result": "HUMAN" or "MACHINE" or "UNCERTAIN", "confidence": 0.0-1.0, "reasoning": "brief explanation"}`
            }],
          },
          tools: [],
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Gemini Live config failed: ${error}`);
      }

      const data = await response.json();
      this.session = data;
      
      // Extract WebSocket URL
      const wsUrl = data.response?.socket?.url;
      if (!wsUrl) {
        throw new Error('No WebSocket URL in Gemini response');
      }

      return wsUrl;
    } catch (error) {
      console.error('Gemini Live initialization error:', error);
      throw error;
    }
  }

  /**
   * Connect to Live WebSocket and start streaming
   */
  async startLiveAnalysis(onResult: (result: GeminiLiveResponse) => void): Promise<void> {
    if (!this.session) {
      const wsUrl = await this.initialize();
      
      // Connect to Gemini Live WebSocket
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('Gemini Live WebSocket connected');
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          if (message.response?.result) {
            const parts = message.response.result.parts;
            parts.forEach((part: any) => {
              if (part.text) {
                // Parse the JSON response
                const analysis = this.parseAnalysisResponse(part.text);
                if (analysis) {
                  onResult(analysis);
                }
              }
            });
          }
        } catch (error) {
          console.error('Error parsing Gemini Live message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('Gemini Live WebSocket error:', error);
      };

      this.ws.onclose = () => {
        console.log('Gemini Live WebSocket closed');
      };
    }
  }

  /**
   * Send audio frame to Gemini Live
   */
  async sendAudioFrame(audioData: Buffer, mimeType: string = 'audio/pcm'): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }

    // Convert to base64
    const base64Audio = Buffer.from(audioData).toString('base64');

    // Send frame
    const message = {
      setupComplete: false,
      data: {
        mediaChunks: [{
          mimeType,
          data: base64Audio,
        }],
      },
    };

    this.ws.send(JSON.stringify(message));
  }

  /**
   * Parse analysis response from Gemini
   */
  private parseAnalysisResponse(text: string): GeminiLiveResponse | null {
    try {
      // Extract JSON from text response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return null;

      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        result: parsed.result as 'HUMAN' | 'MACHINE' | 'UNCERTAIN',
        confidence: parsed.confidence || 0.5,
        reasoning: parsed.reasoning,
      };
    } catch (error) {
      console.error('Error parsing Gemini response:', error);
      return null;
    }
  }

  /**
   * Stop Live analysis and cleanup
   */
  async stop(): Promise<void> {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.session = null;
  }

  /**
   * Process audio chunk (compatible interface)
   */
  async processAudioChunk(
    audioChunk: Buffer,
    mimeType: string = 'audio/pcm'
  ): Promise<AmdAnalysisResult> {
    if (!this.ws) {
      await this.startLiveAnalysis(() => {});
    }

    await this.sendAudioFrame(audioChunk, mimeType);

    // Wait briefly for response (in real implementation, you'd have a queue)
    await new Promise(resolve => setTimeout(resolve, 500));

    // Return placeholder (real implementation would use the callback)
    return {
      result: 'UNCERTAIN',
      confidence: 0.5,
      strategy: 'GEMINI_FLASH',
    };
  }
}

/**
 * Create Gemini Live AMD instance
 */
export function createGeminiLiveAMD(apiKey: string): Gemini25FlashLiveAMD {
  return new Gemini25FlashLiveAMD({ apiKey });
}

