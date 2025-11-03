/**
 * Twilio Integration Service
 * 
 * Handles outbound calling via Twilio with support for AMD strategies.
 */

import twilio from 'twilio';
import type { AmdStrategy } from '@/lib/types';

const accountSid = process.env.TWILIO_ACCOUNT_SID || '';
const authToken = process.env.TWILIO_AUTH_TOKEN || '';
const fromNumber = process.env.TWILIO_PHONE_NUMBER || '';

export const twilioClient = twilio(accountSid, authToken);

export interface TwilioCallParams {
  to: string;
  strategy: AmdStrategy;
  callId: string;
}

export interface TwilioCallResult {
  callSid: string;
  status: string;
  from: string;
  to: string;
}

/**
 * Initiate an outbound call via Twilio
 */
export async function initiateCall(
  params: TwilioCallParams
): Promise<TwilioCallResult> {
  // Check if Twilio credentials are configured
  if (!accountSid || !authToken || !fromNumber) {
    throw new Error('Twilio credentials are not configured. Please set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER in your .env file.');
  }

  const webhookBaseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  const callParams: Record<string, unknown> = {
    to: params.to,
    from: fromNumber,
    statusCallback: `${webhookBaseUrl}/api/webhooks/twilio/status`,
    statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
    record: true,
    recordFromAnswerOnConnect: true,
  };

  // Enable Media Streams for bidirectional audio session
  callParams.statusCallbackEvent = ['initiated', 'ringing', 'answered', 'completed'];

  if (params.strategy === 'TWILIO_NATIVE') {
    callParams.machineDetection = 'Enable';
    callParams.machineDetectionTimeout = 30;
  }

  // Build WebSocket URL for Media Streams
  // For local development, use ws://localhost, for production use wss://
  let streamUrl: string;
  if (webhookBaseUrl.includes('localhost') || webhookBaseUrl.includes('127.0.0.1')) {
    streamUrl = `ws://localhost:3000/api/streams`;
  } else {
    // For production, convert https:// to wss://
    streamUrl = webhookBaseUrl.replace(/^https?:\/\//, 'wss://') + '/api/streams';
  }

  // TwiML with Media Streams for live agent connection
  callParams.twiml = `<Response>
      <Start>
        <Stream url="${streamUrl}" />
      </Start>
      <Say voice="alice">Hello, this is an automated call.</Say>
      <Pause length="5"/>
      <Hangup/>
    </Response>`;

  try {
    const call = await twilioClient.calls.create(callParams as any);
    
    return {
      callSid: call.sid,
      status: call.status,
      from: call.from || fromNumber,
      to: call.to,
    };
  } catch (error) {
    // Provide more detailed error information
    if (error instanceof Error) {
      throw new Error(`Twilio API Error: ${error.message}. Check your Twilio credentials and account status.`);
    }
    throw error;
  }
}

/**
 * Get call details by SID
 */
export async function getCallDetails(callSid: string) {
  const call = await twilioClient.calls(callSid).fetch();
  return {
    sid: call.sid,
    status: call.status,
    duration: call.duration,
    from: call.from,
    to: call.to,
    answeredBy: call.answeredBy,
    machineDetection: {
      type: (call as any).machineDetection?.type,
      confidence: (call as any).machineDetection?.confidence,
      duration: (call as any).machineDetection?.duration,
    },
  };
}

/**
 * Update an in-progress call
 */
export async function updateCall(
  callSid: string,
  instruction: string
) {
  return await twilioClient.calls(callSid).update({
    twiml: instruction,
  });
}

/**
 * Hang up a call
 */
export async function hangUpCall(callSid: string) {
  return await twilioClient.calls(callSid).update({
    status: 'completed',
  });
}

/**
 * Get call recordings
 */
export async function getCallRecordings(callSid: string) {
  return await twilioClient.calls(callSid).recordings.list();
}

