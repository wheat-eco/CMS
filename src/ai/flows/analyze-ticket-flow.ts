'use server';
/**
 * @fileOverview An AI agent that analyzes a support ticket and provides assistance.
 * 
 * - analyzeTicket - A function that analyzes ticket details and conversation history.
 * - AnalyzeTicketInput - The input type for the analyzeTicket function.
 * - AnalyzeTicketOutput - The return type for the analyzeTicket function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AnalyzeTicketInputSchema = z.object({
    title: z.string().describe("The title of the ticket."),
    description: z.string().describe("The initial description of the problem."),
    comments: z.array(z.object({
        authorName: z.string(),
        text: z.string()
    })).describe("The conversation history for the ticket.")
});
export type AnalyzeTicketInput = z.infer<typeof AnalyzeTicketInputSchema>;

const AnalyzeTicketOutputSchema = z.object({
    summary: z.string().describe("A brief, one or two sentence summary of the core issue."),
    analysis: z.string().describe("A deeper analysis of the potential root cause of the issue based on the conversation. Provide actionable insights."),
    suggestedReply: z.string().describe("A professionally worded, empathetic reply to the user who reported the issue. The reply should summarize the understanding of the issue and suggest the next step.")
});
export type AnalyzeTicketOutput = z.infer<typeof AnalyzeTicketOutputSchema>;


export async function analyzeTicket(input: AnalyzeTicketInput): Promise<AnalyzeTicketOutput> {
  return analyzeTicketFlow(input);
}


const prompt = ai.definePrompt({
  name: 'analyzeTicketPrompt',
  input: { schema: AnalyzeTicketInputSchema },
  output: { schema: AnalyzeTicketOutputSchema },
  prompt: `You are an expert IT Support Supervisor. Your task is to analyze a support ticket to help your team resolve it faster.
Analyze the ticket title, description, and the full conversation history.

Based on your analysis, provide the following:
1. A concise summary of the issue.
2. A technical analysis of the potential root cause.
3. A suggested reply to send back to the user who reported the issue.

Ticket Title: {{{title}}}
Ticket Description: {{{description}}}

Conversation History:
{{#each comments}}
- {{this.authorName}}: "{{this.text}}"
{{/each}}
`,
});

const analyzeTicketFlow = ai.defineFlow(
  {
    name: 'analyzeTicketFlow',
    inputSchema: AnalyzeTicketInputSchema,
    outputSchema: AnalyzeTicketOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    return output!;
  }
);
