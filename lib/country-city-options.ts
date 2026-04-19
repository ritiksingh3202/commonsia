/**
 * Curated lists for profile setup country + city `<select>`s.
 * For countries without a dedicated city list, {@link citiesForCountry} falls back to {@link GENERIC_MAJOR_CITIES}.
 */

const COUNTRIES_UNSORTED = [
  "Australia",
  "Bangladesh",
  "Brazil",
  "Canada",
  "China",
  "Egypt",
  "France",
  "Germany",
  "India",
  "Indonesia",
  "Italy",
  "Japan",
  "Malaysia",
  "Mexico",
  "Nepal",
  "Netherlands",
  "New Zealand",
  "Nigeria",
  "Norway",
  "Pakistan",
  "Philippines",
  "Qatar",
  "Saudi Arabia",
  "Singapore",
  "South Africa",
  "South Korea",
  "Spain",
  "Sri Lanka",
  "Sweden",
  "Switzerland",
  "Thailand",
  "Turkey",
  "United Arab Emirates",
  "United Kingdom",
  "United States",
  "Vietnam",
] as const;

export const COUNTRY_OPTIONS: readonly string[] = [...COUNTRIES_UNSORTED].sort((a, b) =>
  a.localeCompare(b),
);

const INDIAN_CITIES = [
  "Ahmedabad",
  "Bangalore",
  "Bhopal",
  "Bhubaneswar",
  "Chandigarh",
  "Chennai",
  "Coimbatore",
  "Delhi NCR",
  "Guwahati",
  "Hyderabad",
  "Indore",
  "Jaipur",
  "Kanpur",
  "Kochi",
  "Kolkata",
  "Lucknow",
  "Mumbai",
  "Nagpur",
  "Patna",
  "Pune",
  "Roorkee",
  "Surat",
  "Thiruvananthapuram",
  "Vadodara",
  "Visakhapatnam",
  "Other",
] as const;

const US_CITIES = [
  "Atlanta",
  "Boston",
  "Chicago",
  "Dallas",
  "Denver",
  "Detroit",
  "Houston",
  "Los Angeles",
  "Miami",
  "New York",
  "Philadelphia",
  "Phoenix",
  "San Diego",
  "San Francisco",
  "Seattle",
  "Washington, D.C.",
  "Other",
] as const;

const UK_CITIES = [
  "Birmingham",
  "Bristol",
  "Cambridge",
  "Edinburgh",
  "Glasgow",
  "Leeds",
  "Liverpool",
  "London",
  "Manchester",
  "Oxford",
  "Sheffield",
  "Other",
] as const;

const CA_CITIES = [
  "Calgary",
  "Edmonton",
  "Montreal",
  "Ottawa",
  "Toronto",
  "Vancouver",
  "Winnipeg",
  "Other",
] as const;

const AU_CITIES = ["Adelaide", "Brisbane", "Canberra", "Melbourne", "Perth", "Sydney", "Other"] as const;

const DE_CITIES = ["Berlin", "Cologne", "Frankfurt", "Hamburg", "Munich", "Stuttgart", "Other"] as const;

const AE_CITIES = ["Abu Dhabi", "Dubai", "Sharjah", "Other"] as const;

export const GENERIC_MAJOR_CITIES = [
  "Bangkok",
  "Dubai",
  "Hong Kong",
  "Istanbul",
  "Johannesburg",
  "Kuala Lumpur",
  "Lagos",
  "London",
  "Mexico City",
  "Mumbai",
  "Nairobi",
  "New York",
  "Paris",
  "Riyadh",
  "São Paulo",
  "Seoul",
  "Singapore",
  "Sydney",
  "Tokyo",
  "Toronto",
  "Other",
] as const;

const CITY_OPTIONS_BY_COUNTRY: Readonly<Record<string, readonly string[]>> = {
  India: INDIAN_CITIES,
  "United States": US_CITIES,
  "United Kingdom": UK_CITIES,
  Canada: CA_CITIES,
  Australia: AU_CITIES,
  Germany: DE_CITIES,
  "United Arab Emirates": AE_CITIES,
  Singapore: ["Singapore", "Other"],
};

export function citiesForCountry(country: string): string[] {
  const list = CITY_OPTIONS_BY_COUNTRY[country];
  if (list?.length) return [...list];
  return [...GENERIC_MAJOR_CITIES];
}
