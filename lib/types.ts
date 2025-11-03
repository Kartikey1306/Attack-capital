/**
 * Type definitions for AMD Call Detection system
 */

export type AmdStrategy = 'TWILIO_NATIVE' | 'JAMBONZ' | 'HUGGINGFACE' | 'GEMINI_FLASH';
export type CallStatus = 'INITIATED' | 'RINGING' | 'ANSWERED' | 'HUMAN_DETECTED' | 'MACHINE_DETECTED' | 'FAILED' | 'COMPLETED' | 'NO_ANSWER' | 'BUSY';
export type AmdResult = 'HUMAN' | 'MACHINE' | 'UNCERTAIN' | 'TIMEOUT' | 'ERROR';

export interface AmdAnalysisResult {
  result: AmdResult;
  confidence: number; // 0-1
  detectedGreeting?: string;
  processingTime?: number;
  strategy: AmdStrategy;
  rawData?: Record<string, unknown>;
}

export interface CallInitiationRequest {
  phoneNumber: string;
  strategy: AmdStrategy;
  userId?: string;
  customGreeting?: string;
}

export interface CallStatusUpdate {
  callId: string;
  status: CallStatus;
  amdResult?: AmdAnalysisResult;
  errorMessage?: string;
}

export interface AudioChunk {
  callId: string;
  audio: Buffer;
  timestamp: Date;
  format: 'pcm' | 'wav' | 'mp3';
}


