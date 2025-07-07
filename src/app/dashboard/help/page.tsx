
'use client';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Mail, Phone } from "lucide-react";

export default function HelpPage() {
  const faqs = [
    {
      question: "How do I create a new ticket?",
      answer: "Navigate to your dashboard and click the 'Create New Ticket' button. Fill out the required fields including title, description, and priority, then submit."
    },
    {
      question: "How can I track the status of my tickets?",
      answer: "Your dashboard displays a list of your recent tickets with their current status. You can click on any ticket to view more details and its conversation history."
    },
    {
      question: "What do the different ticket statuses mean?",
      answer: "'Open' means the ticket is new and hasn't been addressed. 'In Progress' means a supervisor or admin is actively working on it. 'Resolved' means the issue has been fixed."
    },
    {
      question: "Can I see tickets from other people?",
      answer: "Yes. Your dashboard includes a 'Public Department Tickets' section. These are non-private tickets created by others in your department. If you have information that could help, you are encouraged to open the ticket and add a comment."
    }
  ];

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">Help & Support</h1>
        <p className="text-muted-foreground mt-2">Find answers to common questions or contact us for assistance.</p>
      </div>
      
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Frequently Asked Questions</h2>
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, index) => (
            <AccordionItem value={`item-${index}`} key={index}>
              <AccordionTrigger>{faq.question}</AccordionTrigger>
              <AccordionContent>
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>

      <div className="text-center space-y-4 pt-8 border-t">
        <h2 className="text-2xl font-semibold">Still need help?</h2>
        <p className="text-muted-foreground">If you can't find the answer you're looking for, please don't hesitate to reach out to us.</p>
        <div className="flex justify-center items-center gap-8 text-lg">
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary" />
            <a href="mailto:support@cms.com" className="hover:underline">support@cms.com</a>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="w-5 h-5 text-primary" />
            <span>+1 (555) 123-4567</span>
          </div>
        </div>
      </div>
    </div>
  )
}
