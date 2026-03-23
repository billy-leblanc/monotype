import { streamText } from 'ai';
import { google } from '@ai-sdk/google';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function run() {
  try {
    console.log("Starting streamText...");
    const result = streamText({
      model: google('gemini-1.5-pro-latest'),
      messages: [{role: 'user', content: 'hello'}]
    });
    
    for await (const chunk of result.textStream) {
      process.stdout.write(chunk);
    }
    console.log("\nDone.");
  } catch (e) {
    console.error("\nAI SDK CRASH:", e.message, e.stack);
  }
}

run();
