import { streamText } from 'ai';
import { google } from '@ai-sdk/google';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function run() {
  try {
    const result = streamText({
      model: google('gemini-1.5-pro-latest'),
      messages: [{role: 'user', content: 'hello'}]
    });
    console.log("StreamText created", result);
  } catch (e) {
    console.error("Crash", e);
  }
}
run();
