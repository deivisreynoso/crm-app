export const INDUSTRIES = [
  "Technology",
  "Software / SaaS",
  "Financial Services",
  "Healthcare",
  "Manufacturing",
  "Retail",
  "E-commerce",
  "Real Estate",
  "Construction",
  "Education",
  "Professional Services",
  "Marketing & Advertising",
  "Hospitality",
  "Transportation & Logistics",
  "Energy",
  "Telecommunications",
  "Non-profit",
  "Government",
  "Other",
] as const;

export type Industry = (typeof INDUSTRIES)[number];
