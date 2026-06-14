#!/usr/bin/env node
/**
 * Patch ClickIn360 N8N flows for unified conversation inbox.
 * Reads source exports from docs/n8n/, writes *_Updated.json siblings.
 */
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const N8N_DIR = path.join(ROOT, "docs/n8n");
const CRM_CRED = { httpHeaderAuth: { id: "avN9SN9QlpkztmyC", name: "CRM API" } };
const uuid = () => crypto.randomUUID();

/** Stable IDs so re-running the patch script does not churn N8N node UUIDs. */
function stableUuid(scope, name) {
  const hash = crypto.createHash("sha256").update(`${scope}:${name}`).digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

function load(name) {
  return JSON.parse(fs.readFileSync(path.join(N8N_DIR, name), "utf8"));
}

function save(name, workflow) {
  const out = path.join(N8N_DIR, name);
  fs.writeFileSync(out, JSON.stringify(workflow, null, 2) + "\n");
  return out;
}

function nodeByName(workflow, name) {
  return workflow.nodes.find((n) => n.name === name);
}

function removeNodes(workflow, names) {
  const set = new Set(names);
  workflow.nodes = workflow.nodes.filter((n) => !set.has(n.name));
  for (const key of Object.keys(workflow.connections)) {
    if (set.has(key)) delete workflow.connections[key];
  }
  for (const [from, outs] of Object.entries(workflow.connections)) {
    if (!outs?.main) continue;
    outs.main = outs.main.map((branch) =>
      branch.filter((c) => !set.has(c.node))
    );
  }
}

function httpNode(name, id, position, method, url, jsonBody, continueOnFail = true) {
  return {
    id,
    name,
    type: "n8n-nodes-base.httpRequest",
    typeVersion: 4.4,
    position,
    parameters: {
      method,
      url,
      authentication: "genericCredentialType",
      genericAuthType: "httpHeaderAuth",
      ...(jsonBody
        ? {
            sendBody: true,
            specifyBody: "json",
            jsonBody,
          }
        : {}),
      options: continueOnFail ? { continueOnFail: true } : {},
    },
    credentials: CRM_CRED,
  };
}

function passSessionNode(id, position, normalizeNodeName) {
  return {
    id,
    name: "Pass Session Context",
    type: "n8n-nodes-base.code",
    typeVersion: 2,
    position,
    parameters: {
      jsCode: `return [{ json: $('${normalizeNodeName}').first().json }];`,
    },
  };
}

/** Restore original lookup input + explicit eq filter after CRM nodes were inserted upstream. */
function strengthenLeadSessionLookup(workflow) {
  const lookup = nodeByName(workflow, "Lookup Lead Session");
  const cond = lookup?.parameters?.filters?.conditions?.[0];
  if (!cond) return;
  cond.condition = "eq";
  cond.keyValue = "={{$json.session_id}}";
}

function fixSessionExistsCheck(workflow) {
  const node = nodeByName(workflow, "Session Exists?");
  const cond = node?.parameters?.conditions?.conditions?.[0];
  if (!cond) return;
  cond.leftValue = "={{ $json.session_id }}";
}

/** Fix duplicate lead_sessions insert when CRM nodes sit upstream of lookup. */
function applySessionLookupFix(workflow, normalizeNodeName, scope = "whatsapp") {
  const passId = stableUuid(scope, "Pass Session Context");
  let pass = nodeByName(workflow, "Pass Session Context");
  const branch = nodeByName(workflow, "CRM: Human Handler Branch");
  const lookup = nodeByName(workflow, "Lookup Lead Session");
  const passPosition = branch?.position
    ? [branch.position[0] + 96, lookup?.position?.[1] ?? branch.position[1] + 96]
    : [448, 544];

  if (!pass) {
    workflow.nodes.push(passSessionNode(passId, passPosition, normalizeNodeName));
  } else {
    pass.parameters.jsCode = `return [{ json: $('${normalizeNodeName}').first().json }];`;
    pass.position = passPosition;
  }

  strengthenLeadSessionLookup(workflow);
  fixSessionExistsCheck(workflow);

  const branchConn = workflow.connections["CRM: Human Handler Branch"];
  if (branchConn?.main?.[1]) {
    branchConn.main[1] = [{ node: "Pass Session Context", type: "main", index: 0 }];
  }
  workflow.connections["Pass Session Context"] = {
    main: [[{ node: "Lookup Lead Session", type: "main", index: 0 }]],
  };
}

function patchWhatsappNewVersion() {
  const file = "ClickIn360 Whatsapp Flow New Version.json";
  const wf = load(file);
  applySessionLookupFix(wf, "Normalize WABA Payload", "whatsapp-new");
  const out = save(file, wf);
  console.log("WhatsApp New Version patched:", out, "nodes:", wf.nodes.length);
}

function patchWebchat() {
  const wf = load("ClickIn360 Web Chat Qualification Flow.json");
  const ids = {
    check: stableUuid("webchat", "CRM: Check Session State"),
    branch: stableUuid("webchat", "CRM: Human Handler Branch"),
    branchCond: stableUuid("webchat", "CRM: Human Handler Branch cond"),
    passSession: stableUuid("webchat", "Pass Session Context"),
    syncInbound: stableUuid("webchat", "CRM: Sync Inbound Only"),
    respondHuman: stableUuid("webchat", "Respond: Human Handler"),
    syncTurn: stableUuid("webchat", "CRM: Sync Turn"),
  };

  const check = httpNode(
    "CRM: Check Session State",
    ids.check,
    [176, 208],
    "POST",
    "https://www.clickin360.com/api/integrations/conversations/session-state",
    "={{ JSON.stringify({ session_id: $('Normalize Web Payload').first().json.session_id, channel: 'webchat', phone_number: $('Normalize Web Payload').first().json.phone_number, name: $('Normalize Web Payload').first().json.name }) }}"
  );

  const branch = {
    id: ids.branch,
    name: "CRM: Human Handler Branch",
    type: "n8n-nodes-base.if",
    typeVersion: 2.3,
    position: [352, 208],
    parameters: {
      conditions: {
        options: {
          caseSensitive: true,
          typeValidation: "strict",
          version: 3,
        },
        conditions: [
          {
            id: ids.branchCond,
            leftValue: "={{ $json.handler }}",
            rightValue: "human",
            operator: { type: "string", operation: "equals" },
          },
        ],
        combinator: "and",
      },
      options: {},
    },
  };

  const syncInbound = httpNode(
    "CRM: Sync Inbound Only",
    ids.syncInbound,
    [528, 80],
    "POST",
    "https://www.clickin360.com/api/integrations/conversations/sync",
    "={{ JSON.stringify({ session_id: $('Normalize Web Payload').first().json.session_id, channel: 'webchat', phone_number: $('Normalize Web Payload').first().json.phone_number, name: $('Normalize Web Payload').first().json.name, inbound_message: $('Normalize Web Payload').first().json.message, ai_reply: null, next_action: 'continue', qualification: {}, human_review_requested: false }) }}"
  );

  const respondHuman = {
    id: ids.respondHuman,
    name: "Respond: Human Handler",
    type: "n8n-nodes-base.respondToWebhook",
    typeVersion: 1.5,
    position: [704, 80],
    parameters: {
      respondWith: "text",
      responseBody: "",
      options: { responseCode: 200 },
    },
  };

  const syncTurn = httpNode(
    "CRM: Sync Turn",
    ids.syncTurn,
    [2976, 400],
    "POST",
    "https://www.clickin360.com/api/integrations/conversations/sync",
    "={{ JSON.stringify({ session_id: $('State Manager').first().json.session_id, channel: 'webchat', phone_number: $('State Manager').first().json.phone_number, name: $('State Manager').first().json.name, inbound_message: $('Normalize Web Payload').first().json.message, ai_reply: $('State Manager').first().json.latest_ai_response, next_action: $('State Manager').first().json.next_action, qualification: { name: $('State Manager').first().json.name, email: $('State Manager').first().json.email, platform: $('State Manager').first().json.platform, channels: $('State Manager').first().json.communication_channels || [], friction_area: $('State Manager').first().json.friction_area, signals: $('State Manager').first().json.signals || [], temperature: $('State Manager').first().json.temperature, summary: $('State Manager').first().json.summary, message_volume: $('State Manager').first().json.message_volume, main_customer_questions: $('State Manager').first().json.main_customer_questions || [] }, contact_id: $('CRM UPDATE').first().json.contact_id || null, human_review_requested: $('State Manager').first().json.next_action === 'human_review' }) }}"
  );

  wf.nodes.push(
    check,
    branch,
    passSessionNode(ids.passSession, [448, 208], "Normalize Web Payload"),
    syncInbound,
    respondHuman,
    syncTurn
  );

  wf.connections["Normalize Web Payload"] = {
    main: [[{ node: "CRM: Check Session State", type: "main", index: 0 }]],
  };
  wf.connections["CRM: Check Session State"] = {
    main: [[{ node: "CRM: Human Handler Branch", type: "main", index: 0 }]],
  };
  wf.connections["CRM: Human Handler Branch"] = {
    main: [
      [{ node: "CRM: Sync Inbound Only", type: "main", index: 0 }],
      [{ node: "Pass Session Context", type: "main", index: 0 }],
    ],
  };
  wf.connections["Pass Session Context"] = {
    main: [[{ node: "Lookup Lead Session", type: "main", index: 0 }]],
  };
  wf.connections["CRM: Sync Inbound Only"] = {
    main: [[{ node: "Respond: Human Handler", type: "main", index: 0 }]],
  };

  const updateLead = wf.connections["Update Lead Session"];
  if (updateLead?.main?.[0]) {
    updateLead.main[0].push({ node: "CRM: Sync Turn", type: "main", index: 0 });
  }

  strengthenLeadSessionLookup(wf);
  fixSessionExistsCheck(wf);

  const out = save("ClickIn360_Web_Chat_Qualification_Flow_Updated.json", wf);
  console.log("Webchat updated:", out, "nodes:", wf.nodes.length);
}

function crmFormatSlotsJs() {
  return `// Node: "Format Available Slots" — CRM booking-offers response\n\nconst crm = $json;\nconst previousState = $('State Manager').first().json;\n\nreturn [{\n  json: {\n    ...previousState,\n    next_action: crm.next_action || 'book_call',\n    available_slots: crm.available_slots || [],\n    selected_slot: null,\n    selected_slot_index: null,\n    latest_ai_response: crm.message || previousState.latest_ai_response\n  }\n}];`;
}

function patchWhatsapp() {
  const source = fs.existsSync(path.join(N8N_DIR, "ClickIn360 Whatsapp Flow .json"))
    ? "ClickIn360 Whatsapp Flow .json"
    : null;
  if (!source) {
    console.log("WhatsApp source export missing — skipping full patch (use New Version + applySessionLookupFix).");
    return;
  }
  const wf = load(source);
  const ids = {
    check: stableUuid("whatsapp", "CRM: Check Session State"),
    branch: stableUuid("whatsapp", "CRM: Human Handler Branch"),
    branchCond: stableUuid("whatsapp", "CRM: Human Handler Branch cond"),
    passSession: stableUuid("whatsapp", "Pass Session Context"),
    syncInbound: stableUuid("whatsapp", "CRM: Sync Inbound Only"),
    syncTurn: stableUuid("whatsapp", "CRM: Sync Turn"),
    bookingOffers: stableUuid("whatsapp", "CRM: Get Booking Offers"),
    bookAppt: stableUuid("whatsapp", "CRM: Book Appointment"),
    syncReview: stableUuid("whatsapp", "CRM: Sync Human Review"),
    sendHumanReview: stableUuid("whatsapp", "Send: Human Review Reply"),
  };

  const ghlRemove = [
    "Get free slots of a calendar",
    "Book: Create a contact",
    "Book: Create an opportunity",
    "Human Review: Create or update a contact",
    "Human Review: Create an opportunity",
    "Create a task",
    "Add Notes",
    "Book appointment in a calendar",
  ];
  removeNodes(wf, ghlRemove);

  const check = httpNode(
    "CRM: Check Session State",
    ids.check,
    [272, 544],
    "POST",
    "https://www.clickin360.com/api/integrations/conversations/session-state",
    "={{ JSON.stringify({ session_id: $('Normalize WABA Payload').first().json.session_id, channel: 'whatsapp', phone_number: $('Normalize WABA Payload').first().json.phone_number, name: $('Normalize WABA Payload').first().json.name }) }}"
  );

  const branch = {
    id: ids.branch,
    name: "CRM: Human Handler Branch",
    type: "n8n-nodes-base.if",
    typeVersion: 2.3,
    position: [448, 544],
    parameters: {
      conditions: {
        options: {
          caseSensitive: true,
          typeValidation: "strict",
          version: 3,
        },
        conditions: [
          {
            id: ids.branchCond,
            leftValue: "={{ $json.handler }}",
            rightValue: "human",
            operator: { type: "string", operation: "equals" },
          },
        ],
        combinator: "and",
      },
      options: {},
    },
  };

  const syncInbound = httpNode(
    "CRM: Sync Inbound Only",
    ids.syncInbound,
    [624, 400],
    "POST",
    "https://www.clickin360.com/api/integrations/conversations/sync",
    "={{ JSON.stringify({ session_id: $('Normalize WABA Payload').first().json.session_id, channel: 'whatsapp', phone_number: $('Normalize WABA Payload').first().json.phone_number, name: $('Normalize WABA Payload').first().json.name, inbound_message: $('Normalize WABA Payload').first().json.message, ai_reply: null, next_action: 'continue', qualification: {}, human_review_requested: false }) }}"
  );

  const syncTurn = httpNode(
    "CRM: Sync Turn",
    ids.syncTurn,
    [3120, 400],
    "POST",
    "https://www.clickin360.com/api/integrations/conversations/sync",
    "={{ JSON.stringify({ session_id: $('State Manager').first().json.session_id, channel: 'whatsapp', phone_number: $('State Manager').first().json.phone_number, name: $('State Manager').first().json.name, inbound_message: $('Normalize WABA Payload').first().json.message, ai_reply: $('State Manager').first().json.latest_ai_response, next_action: $('State Manager').first().json.next_action, qualification: { name: $('State Manager').first().json.name, email: $('State Manager').first().json.email, platform: $('State Manager').first().json.platform, channels: $('State Manager').first().json.communication_channels || [], friction_area: $('State Manager').first().json.friction_area, signals: $('State Manager').first().json.signals || [], temperature: $('State Manager').first().json.temperature, summary: $('State Manager').first().json.summary, message_volume: $('State Manager').first().json.message_volume, main_customer_questions: $('State Manager').first().json.main_customer_questions || [] }, contact_id: null, human_review_requested: $('State Manager').first().json.next_action === 'human_review' }) }}"
  );

  const bookingOffers = httpNode(
    "CRM: Get Booking Offers",
    ids.bookingOffers,
    [3344, 352],
    "GET",
    "=https://www.clickin360.com/api/leads/booking-offers?lang=es&reschedule={{ $json.next_action === 'reschedule' ? 'true' : 'false' }}",
    null,
    false
  );

  const bookAppt = httpNode(
    "CRM: Book Appointment",
    ids.bookAppt,
    [3120, 928],
    "POST",
    "https://www.clickin360.com/api/leads/bookings",
    "={{ JSON.stringify({ contact_info: { name: $('State Manager').item.json.name || 'Visitor', email: $('State Manager').item.json.email, phone: $('State Manager').item.json.phone_number }, slot_index: $('State Manager').item.json.selected_slot_index, offered_slots: $('State Manager').item.json.available_slots, ai_insights: { platform: $('State Manager').item.json.platform, ai_summary: $('State Manager').item.json.summary }, conversation_transcript: $('State Manager').item.json.conversation_history.map(h => (h.role === 'user' ? 'Usuario' : 'Andrea') + ': ' + h.content).join(' | '), source: 'whatsapp', language: 'es' }) }}",
    false
  );

  const syncReview = httpNode(
    "CRM: Sync Human Review",
    ids.syncReview,
    [3568, 640],
    "POST",
    "https://www.clickin360.com/api/integrations/conversations/sync",
    "={{ JSON.stringify({ session_id: $('State Manager').item.json.session_id, channel: 'whatsapp', phone_number: $('State Manager').item.json.phone_number, name: $('State Manager').item.json.name, inbound_message: $('Normalize WABA Payload').first().json.message, ai_reply: $('State Manager').item.json.latest_ai_response, next_action: 'human_review', qualification: { name: $('State Manager').item.json.name, email: $('State Manager').item.json.email, platform: $('State Manager').item.json.platform, channels: $('State Manager').item.json.communication_channels || [], friction_area: $('State Manager').item.json.friction_area, signals: $('State Manager').item.json.signals || [], temperature: $('State Manager').item.json.temperature, summary: $('State Manager').item.json.summary }, human_review_requested: true }) }}"
  );

  const sendHumanReview = {
    id: ids.sendHumanReview,
    name: "Send: Human Review Reply",
    type: "n8n-nodes-base.whatsApp",
    typeVersion: 1.1,
    position: [3344, 640],
    parameters: {
      operation: "send",
      phoneNumberId: "=1072161985980185",
      recipientPhoneNumber: '={{$node["Normalize WABA Payload"].json.phone_number}}',
      textBody: '={{$json.latest_ai_response || "Gracias por tu mensaje."}}',
      additionalFields: {},
    },
    credentials: {
      whatsAppApi: { id: "rtQxcM3TvqSHWTYs", name: "WhatsApp account" },
    },
  };

  wf.nodes.push(
    check,
    branch,
    passSessionNode(ids.passSession, [448, 544], "Normalize WABA Payload"),
    syncInbound,
    syncTurn,
    bookingOffers,
    bookAppt,
    syncReview,
    sendHumanReview
  );

  const formatSlots = nodeByName(wf, "Format Available Slots");
  if (formatSlots) {
    formatSlots.parameters.jsCode = crmFormatSlotsJs();
  }

  const updateSlots = nodeByName(wf, "Update Slots in DB");
  if (updateSlots?.parameters?.fieldsUi?.fieldValues) {
    updateSlots.parameters.fieldsUi.fieldValues = [
      {
        fieldId: "available_slots",
        fieldValue: "={{ $json.available_slots }}",
      },
      {
        fieldId: "next_action",
        fieldValue: "={{ $json.next_action }}",
      },
      {
        fieldId: "latest_ai_response",
        fieldValue: "={{ $json.latest_ai_response }}",
      },
    ];
  }

  wf.connections["Normalize WABA Payload"] = {
    main: [[{ node: "CRM: Check Session State", type: "main", index: 0 }]],
  };
  wf.connections["CRM: Check Session State"] = {
    main: [[{ node: "CRM: Human Handler Branch", type: "main", index: 0 }]],
  };
  wf.connections["CRM: Human Handler Branch"] = {
    main: [
      [{ node: "CRM: Sync Inbound Only", type: "main", index: 0 }],
      [{ node: "Pass Session Context", type: "main", index: 0 }],
    ],
  };
  wf.connections["Pass Session Context"] = {
    main: [[{ node: "Lookup Lead Session", type: "main", index: 0 }]],
  };
  wf.connections["CRM: Sync Inbound Only"] = { main: [[]] };

  wf.connections["CRM: Get Booking Offers"] = {
    main: [[{ node: "Format Available Slots", type: "main", index: 0 }]],
  };
  wf.connections["CRM: Book Appointment"] = {
    main: [[{ node: "Update Session as Booked", type: "main", index: 0 }]],
  };
  wf.connections["Update Session as Booked"] = {
    main: [[{ node: "Send Confirmation ", type: "main", index: 0 }]],
  };
  wf.connections["Send: Human Review Reply"] = {
    main: [[{ node: "CRM: Sync Human Review", type: "main", index: 0 }]],
  };

  wf.connections["Switch"] = {
    main: [
      [{ node: "CRM: Get Booking Offers", type: "main", index: 0 }],
      [{ node: "Send: Human Review Reply", type: "main", index: 0 }],
      [{ node: "CRM: Book Appointment", type: "main", index: 0 }],
      [{ node: "CRM: Get Booking Offers", type: "main", index: 0 }],
      [{ node: "Message: continue / ask_contact / close", type: "main", index: 0 }],
    ],
  };

  const updateLead = wf.connections["Update Lead Session"];
  if (updateLead?.main?.[0]) {
    updateLead.main[0].push({ node: "CRM: Sync Turn", type: "main", index: 0 });
  }

  strengthenLeadSessionLookup(wf);
  fixSessionExistsCheck(wf);

  const out = save("ClickIn360_Whatsapp_Flow_Updated.json", wf);
  const text = JSON.stringify(wf);
  const ghlHits = (text.match(/highLevel|HighLevel/gi) || []).length;
  console.log("WhatsApp updated:", out, "nodes:", wf.nodes.length, "GHL refs:", ghlHits);
  if (ghlHits > 0) {
    console.error("ERROR: GHL references remain");
    process.exit(1);
  }
}

function validateWebchat() {
  const src = load("ClickIn360 Web Chat Qualification Flow.json");
  const upd = load("ClickIn360_Web_Chat_Qualification_Flow_Updated.json");
  const srcIds = new Set(src.nodes.map((n) => n.id));
  for (const n of src.nodes) {
    const u = upd.nodes.find((x) => x.id === n.id);
    if (!u) throw new Error(`Missing original node ${n.name}`);
    if (n.name === "Lookup Lead Session" || n.name === "Session Exists?") continue;
    if (JSON.stringify(u) !== JSON.stringify(n)) {
      throw new Error(`Modified original node ${n.name}`);
    }
  }
  const newNames = [
    "CRM: Check Session State",
    "CRM: Human Handler Branch",
    "Pass Session Context",
    "CRM: Sync Inbound Only",
    "CRM: Sync Turn",
    "Respond: Human Handler",
  ];
  for (const name of newNames) {
    if (!upd.nodes.find((n) => n.name === name)) throw new Error(`Missing ${name}`);
  }
  console.log("Webchat validation OK");
}

patchWebchat();
patchWhatsapp();
patchWhatsappNewVersion();
validateWebchat();
