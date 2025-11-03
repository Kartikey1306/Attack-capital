/**
 * Country data for international phone number support
 * Includes country codes, flags, and ISO codes for all countries
 */

export interface Country {
  code: string; // ISO 3166-1 alpha-2
  name: string;
  flag: string;
  dialCode: string;
  format: string;
  region: string;
}

export const COUNTRIES: Country[] = [
  { code: 'US', name: 'United States', flag: '🇺🇸', dialCode: '+1', format: '+1 (###) ###-####', region: 'North America' },
  { code: 'IN', name: 'India', flag: '🇮🇳', dialCode: '+91', format: '+91 #### #### ##', region: 'Asia-Pacific' },
];

// Sort by region first, then by country name
export const SORTED_COUNTRIES = COUNTRIES.sort((a, b) => {
  if (a.region !== b.region) {
    return a.region.localeCompare(b.region);
  }
  return a.name.localeCompare(b.name);
});

// Get countries by region
export function getCountriesByRegion(region: string): Country[] {
  return COUNTRIES.filter(c => c.region === region);
}

// Get country by code
export function getCountryByCode(code: string): Country | undefined {
  return COUNTRIES.find(c => c.code === code);
}
// Get unique regions
export const REGIONS = Array.from(new Set(COUNTRIES.map(c => c.region))).sort();


