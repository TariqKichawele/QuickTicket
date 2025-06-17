'use server';

import * as Sentry from '@sentry/nextjs';

export async function createTicket(
    prevState: { success: boolean, message: string }, 
    formData: FormData
): Promise<{ success: boolean, message: string }> {
    try {
        const subject = formData.get('subject');
        const description = formData.get('description');
        const priority = formData.get('priority');
    
        if (!subject || !description || !priority) {
            Sentry.captureMessage('Validation Error: Missing required fields', 'warning');
            return { success: false, message: 'All fields are required' };
        }
    
        console.log(subject, description, priority);
    
        return { success: true, message: 'Ticket created successfully' };    
    } catch (error) {
        Sentry.captureException(error, {
            extra: { formData: Object.fromEntries(formData.entries()) }
        });
        return { success: false, message: 'An error occurred while creating the ticket' };
    }
}