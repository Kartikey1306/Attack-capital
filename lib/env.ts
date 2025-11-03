/**
 * Environment variables validation and access
 */

import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  TWILIO_ACCOUNT_SID: z.string(),
  TWILIO_AUTH_TOKEN: z.string(),
  TWILIO_PHONE_NUMBER: z.string(),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().url(),
  JAMBONZ_API_KEY: z.string().optional(),
  JAMBONZ_BASE_URL: z.string().url().optional(),
  HUGGINGFACE_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  PYTHON_AMD_SERVICE_URL: z.string().url().optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(): Env {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Invalid environment variables:');
      error.errors.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
      throw new Error('Invalid environment configuration');
    }
    throw error;
  }
}

// Note: validateEnv() should be called explicitly
// Not validated on module load to allow flexibility

export const env = process.env as unknown as Env;

