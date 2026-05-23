export async function triggerN8NWebhook(event: string, data: unknown) {
  const baseUrl = process.env.N8N_WEBHOOK_URL;
  if (!baseUrl?.trim()) return null;

  try {
    const webhookUrl = `${baseUrl.replace(/\/$/, "")}/${event}`;

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-N8N-Auth": process.env.N8N_API_KEY || "",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      console.error(`N8N webhook error for ${event}:`, response.statusText);
      return null;
    }

    const text = await response.text();
    if (!text) return null;
    try {
      return JSON.parse(text) as unknown;
    } catch {
      return null;
    }
  } catch (error) {
    console.error(`N8N webhook failed for ${event}:`, error);
    return null;
  }
}

export async function triggerN8NWorkflow(workflowId: string, data: unknown) {
  const baseUrl = process.env.N8N_BASE_URL;
  if (!baseUrl?.trim()) return null;

  try {
    const response = await fetch(
      `${baseUrl.replace(/\/$/, "")}/api/v1/workflows/${workflowId}/execute`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-N8N-API-Key": process.env.N8N_API_KEY || "",
        },
        body: JSON.stringify({ data }),
      }
    );

    const text = await response.text();
    if (!text) return null;
    try {
      return JSON.parse(text) as unknown;
    } catch {
      return null;
    }
  } catch (error) {
    console.error("N8N workflow execution failed:", error);
    return null;
  }
}
