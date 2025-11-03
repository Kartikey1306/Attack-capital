/**
 * AMD Strategy Implementations
 * 
 * Multiple implementations of Answering Machine Detection:
 * - Twilio Native
 * - Jambonz
 * - Hugging Face ML Model
 * - Gemini Flash
 */

import type { AmdAnalysisResult, AmdStrategy } from '@/lib/types';

export interface AmdStrategyProcessor {
  processAudio(audioUrl: string): Promise<AmdAnalysisResult>;
  processLiveAudio(audioChunk: Buffer): Promise<AmdAnalysisResult | null>;
}

/**
 * Twilio Native AMD Strategy
 * 
 * Uses Twilio's built-in machine detection
 */
export class TwilioNativeAMD implements AmdStrategyProcessor {
  async processAudio(audioUrl: string): Promise<AmdAnalysisResult> {
    // Twilio native AMD is handled via call events
    // This is a placeholder for any post-processing
    throw new Error('Twilio native AMD is handled via webhooks, not direct audio processing');
  }

  async processLiveAudio(_audioChunk: Buffer): Promise<AmdAnalysisResult | null> {
    throw new Error('Twilio native AMD is handled via webhooks');
  }
}

/**
 * Jambonz AMD Strategy
 * 
 * Uses Jambonz's AMD capabilities via SIP trunk with optimized parameters
 * Tuned for: thresholdWordCount: 5, timers.decisionTimeoutMs: 10000
 */
export class JambonzAMD implements AmdStrategyProcessor {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = process.env.JAMBONZ_BASE_URL || '';
    this.apiKey = process.env.JAMBONZ_API_KEY || '';
  }

  /**
   * Process audio for AMD using Jambonz API
   * 
   * Jambonz excels over Twilio native through:
   * - Custom recognizers and models
   * - Fine-tuned parameters (word count thresholds)
   * - Better SIP integration for enterprise setups
   * - More granular control over AMD behavior
   */
  async processAudio(audioUrl: string): Promise<AmdAnalysisResult> {
    try {
      const response = await fetch(`${this.baseUrl}/api/amd/analyze`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          audioUrl,
          // Optimized parameters per spec
          thresholdWordCount: 5,
          decisionTimeoutMs: 10000,
        }),
      });

      if (!response.ok) {
        throw new Error(`Jambonz AMD failed: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        result: data.result === 'human' ? 'HUMAN' : 'MACHINE',
        confidence: data.confidence || 0.5,
        detectedGreeting: data.transcript,
        strategy: 'JAMBONZ',
        rawData: {
          wordCount: data.wordCount,
          decisionTime: data.decisionTime,
        },
      };
    } catch (error) {
      console.error('Jambonz AMD error:', error);
      return {
        result: 'ERROR',
        confidence: 0,
        strategy: 'JAMBONZ',
        rawData: { error: String(error) },
      };
    }
  }

  async processLiveAudio(audioChunk: Buffer): Promise<AmdAnalysisResult | null> {
    // Jambonz processes via SIP events and webhooks
    // Real-time processing happens server-side
    return null;
  }
}

/**
 * Hugging Face ML Model AMD Strategy
 * 
 * Uses a fine-tuned ML model for AMD
 */
export class HuggingFaceAMD implements AmdStrategyProcessor {
  private serviceUrl: string;

  constructor() {
    this.serviceUrl = process.env.PYTHON_AMD_SERVICE_URL || 'http://localhost:8001';
  }

  async processAudio(audioUrl: string): Promise<AmdAnalysisResult> {
    try {
      const response = await fetch(`${this.serviceUrl}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ audioUrl }),
      });

      if (!response.ok) {
        throw new Error(`Hugging Face AMD failed: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        result: data.prediction as AmdAnalysisResult['result'],
        confidence: data.confidence,
        detectedGreeting: data.transcript,
        processingTime: data.processingTime,
        strategy: 'HUGGINGFACE',
        rawData: data,
      };
    } catch (error) {
      console.error('Hugging Face AMD error:', error);
      return {
        result: 'ERROR',
        confidence: 0,
        strategy: 'HUGGINGFACE',
        rawData: { error: String(error) },
      };
    }
  }

  async processLiveAudio(audioChunk: Buffer): Promise<AmdAnalysisResult | null> {
    try {
      const response = await fetch(`${this.serviceUrl}/analyze-stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
        },
        body: Buffer.from(audioChunk),
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return {
        result: data.prediction as AmdAnalysisResult['result'],
        confidence: data.confidence,
        strategy: 'HUGGINGFACE',
      };
    } catch (error) {
      console.error('Hugging Face stream AMD error:', error);
      return null;
    }
  }
}

/**
 * Gemini Flash AMD Strategy
 * 
 * Uses Google's Gemini Flash for real-time AMD
 */
export class GeminiAMD implements AmdStrategyProcessor {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || '';
  }

  async processAudio(audioUrl: string): Promise<AmdAnalysisResult> {
    try {
      // First, fetch the audio and convert to base64
      const audioResponse = await fetch(audioUrl);
      const audioBuffer = await audioResponse.arrayBuffer();
      const base64Audio = Buffer.from(audioBuffer).toString('base64');

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [
                {
                  text: 'Analyze this audio and determine if it is a human answering or an answering machine/voicemail. Respond with JSON: {"result": "HUMAN" or "MACHINE", "confidence": 0.0-1.0, "reason": "explanation"}',
                },
                {
                  inline_data: {
                    mime_type: 'audio/wav',
                    data: base64Audio,
                  },
                },
              ],
            }],
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 100,
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Gemini AMD failed: ${response.statusText}`);
      }

      const data = await response.json();
      const analysis = JSON.parse(data.candidates[0].content.parts[0].text);

      return {
        result: analysis.result,
        confidence: analysis.confidence,
        strategy: 'GEMINI_FLASH',
        rawData: analysis,
      };
    } catch (error) {
      console.error('Gemini AMD error:', error);
      return {
        result: 'ERROR',
        confidence: 0,
        strategy: 'GEMINI_FLASH',
        rawData: { error: String(error) },
      };
    }
  }

  async processLiveAudio(_audioChunk: Buffer): Promise<AmdAnalysisResult | null> {
    // Gemini requires longer audio segments for analysis
    return null;
  }
}

/**
 * Get AMD strategy processor by type
 */
export function getAmdProcessor(strategy: AmdStrategy): AmdStrategyProcessor {
  switch (strategy) {
    case 'TWILIO_NATIVE':
      return new TwilioNativeAMD();
    case 'JAMBONZ':
      return new JambonzAMD();
    case 'HUGGINGFACE':
      return new HuggingFaceAMD();
    case 'GEMINI_FLASH':
      return new GeminiAMD();
    default:
      throw new Error(`Unknown AMD strategy: ${strategy}`);
  }
}

