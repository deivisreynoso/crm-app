import { test, expect } from "@playwright/test";

const websiteSecret = process.env.WEBSITE_LEADS_API_SECRET;

test.describe("Website lead → CRM", () => {
  test.skip(!websiteSecret, "WEBSITE_LEADS_API_SECRET required for lead API test");

  test("form submission creates contact with qualified stage opportunity", async ({
    request,
  }) => {
    const email = `lead-e2e-${Date.now()}@example.com`;
    const res = await request.post("/api/leads/form-submission", {
      headers: {
        "x-website-secret": websiteSecret!,
        "content-type": "application/json",
      },
      data: {
        contact_info: {
          name: "E2E Lead",
          email,
          phone: "+15551234567",
          company: "E2E Co",
        },
        qualification: {
          platform: "Website",
          friction_area: ["before-purchase"],
          communication_channels: ["web-chat"],
        },
        source: "form",
        language: "en",
      },
    });

    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as {
      contact_id?: string;
      opportunity_id?: string | null;
    };
    expect(body.contact_id).toBeTruthy();
    expect(body.opportunity_id).toBeTruthy();
  });

  test("website proxy accepts same-origin form without client secret", async ({
    request,
  }) => {
    const email = `lead-proxy-${Date.now()}@example.com`;
    const res = await request.post("/api/website/form-submission", {
      headers: {
        "content-type": "application/json",
        origin: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
      },
      data: {
        contact_info: {
          name: "Proxy Lead",
          email,
          phone: "+15559876543",
        },
        source: "form",
        language: "en",
      },
    });

    expect(res.ok()).toBeTruthy();
  });
});
