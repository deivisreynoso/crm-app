export async function triggerN8NWebhook(event: string, data: any) {
    try {
      const webhookUrl = `${process.env.N8N_WEBHOOK_URL}/${event}`;
      
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
  
      if (!response.ok) {
        console.error(`N8N webhook error for ${event}:`, response.statusText);
      }
  
      return response.json();
    } catch (error) {
      console.error(`N8N webhook failed for ${event}:`, error);
      // Don't throw - webhook failure shouldn't break main operation
      return null;
    }
  }
  
  export async function triggerN8NWorkflow(workflowId: string, data: any) {
    try {
      const response = await fetch(
        `${process.env.N8N_BASE_URL}/api/v1/workflows/${workflowId}/execute`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-N8N-API-Key': process.env.N8N_API_KEY || '',
          },
          body: JSON.stringify({ data }),
        }
      );
  
      return response.json();
    } catch (error) {
      console.error('N8N workflow execution failed:', error);
      return null;
    }
  }