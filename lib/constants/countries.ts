export interface RegionOption {
  code: string;
  name: string;
}

export interface CountryOption {
  code: string;
  name: string;
  dialCode: string;
  timezone: string;
  states?: RegionOption[];
}

const US_STATES: RegionOption[] = [
  { code: "AL", name: "Alabama" },
  { code: "AK", name: "Alaska" },
  { code: "AZ", name: "Arizona" },
  { code: "CA", name: "California" },
  { code: "CO", name: "Colorado" },
  { code: "FL", name: "Florida" },
  { code: "GA", name: "Georgia" },
  { code: "IL", name: "Illinois" },
  { code: "MA", name: "Massachusetts" },
  { code: "MI", name: "Michigan" },
  { code: "NJ", name: "New Jersey" },
  { code: "NY", name: "New York" },
  { code: "NC", name: "North Carolina" },
  { code: "OH", name: "Ohio" },
  { code: "PA", name: "Pennsylvania" },
  { code: "TX", name: "Texas" },
  { code: "WA", name: "Washington" },
];

const MX_STATES: RegionOption[] = [
  { code: "AGU", name: "Aguascalientes" },
  { code: "BCN", name: "Baja California" },
  { code: "CDMX", name: "Ciudad de México" },
  { code: "JAL", name: "Jalisco" },
  { code: "MEX", name: "Estado de México" },
  { code: "NLE", name: "Nuevo León" },
  { code: "PUE", name: "Puebla" },
  { code: "QRO", name: "Querétaro" },
  { code: "SLP", name: "San Luis Potosí" },
  { code: "YUC", name: "Yucatán" },
];

const CA_PROVINCES: RegionOption[] = [
  { code: "AB", name: "Alberta" },
  { code: "BC", name: "British Columbia" },
  { code: "ON", name: "Ontario" },
  { code: "QC", name: "Quebec" },
];

export const COUNTRIES: CountryOption[] = [
  { code: "US", name: "United States", dialCode: "+1", timezone: "America/New_York", states: US_STATES },
  { code: "MX", name: "Mexico", dialCode: "+52", timezone: "America/Mexico_City", states: MX_STATES },
  { code: "CA", name: "Canada", dialCode: "+1", timezone: "America/Toronto", states: CA_PROVINCES },
  { code: "GB", name: "United Kingdom", dialCode: "+44", timezone: "Europe/London" },
  { code: "DE", name: "Germany", dialCode: "+49", timezone: "Europe/Berlin" },
  { code: "FR", name: "France", dialCode: "+33", timezone: "Europe/Paris" },
  { code: "ES", name: "Spain", dialCode: "+34", timezone: "Europe/Madrid" },
  { code: "CO", name: "Colombia", dialCode: "+57", timezone: "America/Bogota" },
  { code: "AR", name: "Argentina", dialCode: "+54", timezone: "America/Argentina/Buenos_Aires" },
  { code: "BR", name: "Brazil", dialCode: "+55", timezone: "America/Sao_Paulo" },
  { code: "CL", name: "Chile", dialCode: "+56", timezone: "America/Santiago" },
  { code: "PE", name: "Peru", dialCode: "+51", timezone: "America/Lima" },
  { code: "AU", name: "Australia", dialCode: "+61", timezone: "Australia/Sydney" },
  { code: "IN", name: "India", dialCode: "+91", timezone: "Asia/Kolkata" },
];

export function getCountryByCode(code: string | undefined | null): CountryOption | undefined {
  if (!code) return undefined;
  return COUNTRIES.find((c) => c.code === code);
}

export function getStatesForCountry(code: string | undefined | null): RegionOption[] {
  return getCountryByCode(code)?.states ?? [];
}

export function getTimezoneForCountry(code: string | undefined | null): string {
  return getCountryByCode(code)?.timezone ?? "";
}
