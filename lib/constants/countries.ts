export interface RegionOption {
  code: string;
  name: string;
  timezone: string;
}

export interface CountryOption {
  code: string;
  name: string;
  dialCode: string;
  timezone: string;
  states: RegionOption[];
}

const US_STATES: RegionOption[] = [
  { code: "AL", name: "Alabama", timezone: "America/Chicago" },
  { code: "AK", name: "Alaska", timezone: "America/Anchorage" },
  { code: "AZ", name: "Arizona", timezone: "America/Phoenix" },
  { code: "CA", name: "California", timezone: "America/Los_Angeles" },
  { code: "CO", name: "Colorado", timezone: "America/Denver" },
  { code: "FL", name: "Florida", timezone: "America/New_York" },
  { code: "GA", name: "Georgia", timezone: "America/New_York" },
  { code: "IL", name: "Illinois", timezone: "America/Chicago" },
  { code: "MA", name: "Massachusetts", timezone: "America/New_York" },
  { code: "MI", name: "Michigan", timezone: "America/Detroit" },
  { code: "NJ", name: "New Jersey", timezone: "America/New_York" },
  { code: "NY", name: "New York", timezone: "America/New_York" },
  { code: "NC", name: "North Carolina", timezone: "America/New_York" },
  { code: "OH", name: "Ohio", timezone: "America/New_York" },
  { code: "PA", name: "Pennsylvania", timezone: "America/New_York" },
  { code: "TX", name: "Texas", timezone: "America/Chicago" },
  { code: "WA", name: "Washington", timezone: "America/Los_Angeles" },
];

const MX_STATES: RegionOption[] = [
  { code: "AGU", name: "Aguascalientes", timezone: "America/Mexico_City" },
  { code: "BCN", name: "Baja California", timezone: "America/Tijuana" },
  { code: "BCS", name: "Baja California Sur", timezone: "America/Mazatlan" },
  { code: "CDMX", name: "Ciudad de México", timezone: "America/Mexico_City" },
  { code: "CHH", name: "Chihuahua", timezone: "America/Chihuahua" },
  { code: "JAL", name: "Jalisco", timezone: "America/Mexico_City" },
  { code: "MEX", name: "Estado de México", timezone: "America/Mexico_City" },
  { code: "NLE", name: "Nuevo León", timezone: "America/Monterrey" },
  { code: "PUE", name: "Puebla", timezone: "America/Mexico_City" },
  { code: "QRO", name: "Querétaro", timezone: "America/Mexico_City" },
  { code: "ROO", name: "Quintana Roo", timezone: "America/Cancun" },
  { code: "SLP", name: "San Luis Potosí", timezone: "America/Mexico_City" },
  { code: "SON", name: "Sonora", timezone: "America/Hermosillo" },
  { code: "YUC", name: "Yucatán", timezone: "America/Merida" },
];

export const COUNTRIES: CountryOption[] = [
  {
    code: "US",
    name: "United States",
    dialCode: "+1",
    timezone: "America/New_York",
    states: US_STATES,
  },
  {
    code: "MX",
    name: "Mexico",
    dialCode: "+52",
    timezone: "America/Mexico_City",
    states: MX_STATES,
  },
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

/** Resolve IANA timezone from country and optional state/province name. */
export function getTimezoneForLocation(
  countryCode: string | undefined | null,
  stateName?: string | null
): string {
  const country = getCountryByCode(countryCode);
  if (!country) return "";

  const trimmed = stateName?.trim();
  if (trimmed) {
    const region = country.states.find(
      (s) => s.name === trimmed || s.code === trimmed
    );
    if (region?.timezone) return region.timezone;
  }

  return country.timezone;
}
