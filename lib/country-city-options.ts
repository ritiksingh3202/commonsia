/**
 * Country + city suggestions for profile setup (`<datalist>` + free text).
 * {@link citiesForCountry} matches country case-insensitively and returns ONLY cities of that country.
 * Unknown countries get an empty list so users must pick "Other (not in list)" and type their city manually —
 * this prevents cities from the wrong country bleeding into the dropdown. The inline trailing "Other" entry
 * present in each per-country array is filtered out at read time (the UI already surfaces its own "Other
 * (not in list)" escape hatch below the list).
 */

const COUNTRIES_UNSORTED = [
  "Afghanistan",
  "Albania",
  "Algeria",
  "Argentina",
  "Armenia",
  "Australia",
  "Austria",
  "Azerbaijan",
  "Bahrain",
  "Bangladesh",
  "Belarus",
  "Belgium",
  "Bolivia",
  "Bosnia and Herzegovina",
  "Brazil",
  "Brunei",
  "Bulgaria",
  "Cambodia",
  "Cameroon",
  "Canada",
  "Chile",
  "China",
  "Colombia",
  "Costa Rica",
  "Croatia",
  "Cyprus",
  "Czech Republic",
  "Denmark",
  "Dominican Republic",
  "Ecuador",
  "Egypt",
  "El Salvador",
  "Estonia",
  "Ethiopia",
  "Finland",
  "France",
  "Georgia",
  "Germany",
  "Ghana",
  "Greece",
  "Guatemala",
  "Honduras",
  "Hong Kong SAR",
  "Hungary",
  "Iceland",
  "India",
  "Indonesia",
  "Iran",
  "Iraq",
  "Ireland",
  "Israel",
  "Italy",
  "Jamaica",
  "Japan",
  "Jordan",
  "Kazakhstan",
  "Kenya",
  "Kuwait",
  "Laos",
  "Latvia",
  "Lebanon",
  "Lithuania",
  "Luxembourg",
  "Macau SAR",
  "Malaysia",
  "Maldives",
  "Malta",
  "Mauritius",
  "Mexico",
  "Moldova",
  "Mongolia",
  "Montenegro",
  "Morocco",
  "Nepal",
  "Netherlands",
  "New Zealand",
  "Nicaragua",
  "Nigeria",
  "North Macedonia",
  "Norway",
  "Oman",
  "Pakistan",
  "Panama",
  "Paraguay",
  "Peru",
  "Philippines",
  "Poland",
  "Portugal",
  "Puerto Rico",
  "Qatar",
  "Romania",
  "Russia",
  "Rwanda",
  "Saudi Arabia",
  "Senegal",
  "Serbia",
  "Singapore",
  "Slovakia",
  "Slovenia",
  "South Africa",
  "South Korea",
  "Spain",
  "Sri Lanka",
  "Sweden",
  "Switzerland",
  "Taiwan",
  "Tanzania",
  "Thailand",
  "Trinidad and Tobago",
  "Tunisia",
  "Turkey",
  "Uganda",
  "Ukraine",
  "United Arab Emirates",
  "United Kingdom",
  "United States",
  "Uruguay",
  "Uzbekistan",
  "Venezuela",
  "Vietnam",
  "Zambia",
  "Zimbabwe",
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
  "Navi Mumbai",
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
  "Austin",
  "Baltimore",
  "Boston",
  "Charlotte",
  "Chicago",
  "Dallas",
  "Denver",
  "Detroit",
  "Houston",
  "Las Vegas",
  "Los Angeles",
  "Miami",
  "Minneapolis",
  "Nashville",
  "New York",
  "Orlando",
  "Philadelphia",
  "Phoenix",
  "Portland",
  "San Antonio",
  "San Diego",
  "San Francisco",
  "San Jose",
  "Seattle",
  "Tampa",
  "Washington, D.C.",
  "Other",
] as const;

const UK_CITIES = [
  "Birmingham",
  "Bristol",
  "Cambridge",
  "Cardiff",
  "Edinburgh",
  "Glasgow",
  "Leeds",
  "Liverpool",
  "London",
  "Manchester",
  "Newcastle",
  "Nottingham",
  "Oxford",
  "Sheffield",
  "Other",
] as const;

const CA_CITIES = [
  "Calgary",
  "Edmonton",
  "Halifax",
  "Montreal",
  "Ottawa",
  "Quebec City",
  "Toronto",
  "Vancouver",
  "Victoria",
  "Winnipeg",
  "Other",
] as const;

const AU_CITIES = [
  "Adelaide",
  "Brisbane",
  "Canberra",
  "Gold Coast",
  "Melbourne",
  "Perth",
  "Sydney",
  "Other",
] as const;

const DE_CITIES = [
  "Berlin",
  "Cologne",
  "Dortmund",
  "Dresden",
  "Frankfurt",
  "Hamburg",
  "Hanover",
  "Leipzig",
  "Munich",
  "Stuttgart",
  "Other",
] as const;

const AE_CITIES = ["Abu Dhabi", "Ajman", "Dubai", "Sharjah", "Other"] as const;

const FR_CITIES = [
  "Bordeaux",
  "Lille",
  "Lyon",
  "Marseille",
  "Nantes",
  "Nice",
  "Paris",
  "Strasbourg",
  "Toulouse",
  "Other",
] as const;

const ES_CITIES = [
  "Barcelona",
  "Bilbao",
  "Madrid",
  "Málaga",
  "Seville",
  "Valencia",
  "Zaragoza",
  "Other",
] as const;

const IT_CITIES = [
  "Bologna",
  "Florence",
  "Genoa",
  "Milan",
  "Naples",
  "Rome",
  "Turin",
  "Venice",
  "Other",
] as const;

const NL_CITIES = ["Amsterdam", "Eindhoven", "Rotterdam", "The Hague", "Utrecht", "Other"] as const;

const BE_CITIES = ["Antwerp", "Brussels", "Ghent", "Leuven", "Other"] as const;

const JP_CITIES = [
  "Fukuoka",
  "Hiroshima",
  "Kyoto",
  "Nagoya",
  "Osaka",
  "Sapporo",
  "Tokyo",
  "Yokohama",
  "Other",
] as const;

const KR_CITIES = ["Busan", "Daegu", "Incheon", "Seoul", "Other"] as const;

const CN_CITIES = [
  "Beijing",
  "Chengdu",
  "Guangzhou",
  "Hangzhou",
  "Nanjing",
  "Shanghai",
  "Shenzhen",
  "Wuhan",
  "Xi'an",
  "Other",
] as const;

const BR_CITIES = [
  "Belo Horizonte",
  "Brasília",
  "Curitiba",
  "Porto Alegre",
  "Recife",
  "Rio de Janeiro",
  "Salvador",
  "São Paulo",
  "Other",
] as const;

const MX_CITIES = [
  "Guadalajara",
  "Mexico City",
  "Monterrey",
  "Puebla",
  "Tijuana",
  "Other",
] as const;

const SG_CITIES = ["Singapore", "Jurong", "Other"] as const;

const MY_CITIES = [
  "George Town",
  "Ipoh",
  "Johor Bahru",
  "Kuala Lumpur",
  "Kuching",
  "Malacca City",
  "Other",
] as const;

const TH_CITIES = ["Bangkok", "Chiang Mai", "Phuket", "Other"] as const;

const ID_CITIES = ["Bandung", "Jakarta", "Medan", "Surabaya", "Other"] as const;

const PH_CITIES = ["Cebu City", "Davao City", "Manila", "Quezon City", "Other"] as const;

const VN_CITIES = ["Da Nang", "Hanoi", "Ho Chi Minh City", "Other"] as const;

const BD_CITIES = ["Chittagong", "Dhaka", "Khulna", "Sylhet", "Other"] as const;

const PK_CITIES = ["Faisalabad", "Islamabad", "Karachi", "Lahore", "Rawalpindi", "Other"] as const;

const NG_CITIES = ["Abuja", "Ibadan", "Kano", "Lagos", "Port Harcourt", "Other"] as const;

const ZA_CITIES = ["Cape Town", "Durban", "Johannesburg", "Pretoria", "Other"] as const;

const CH_CITIES = ["Basel", "Bern", "Geneva", "Lausanne", "Zurich", "Other"] as const;

const SE_CITIES = ["Gothenburg", "Malmö", "Stockholm", "Uppsala", "Other"] as const;

const NO_CITIES = ["Bergen", "Oslo", "Stavanger", "Trondheim", "Other"] as const;

const PL_CITIES = ["Gdańsk", "Kraków", "Poznań", "Warsaw", "Wrocław", "Other"] as const;

const TR_CITIES = ["Ankara", "Antalya", "Istanbul", "İzmir", "Other"] as const;

const SA_CITIES = ["Dammam", "Jeddah", "Mecca", "Medina", "Riyadh", "Other"] as const;

const EG_CITIES = ["Alexandria", "Cairo", "Giza", "Other"] as const;

const AR_CITIES = ["Buenos Aires", "Córdoba", "Mendoza", "Rosario", "Other"] as const;

const CO_CITIES = ["Barranquilla", "Bogotá", "Cali", "Medellín", "Other"] as const;

const TW_CITIES = ["Kaohsiung", "New Taipei", "Taichung", "Tainan", "Taipei", "Other"] as const;

const NZ_CITIES = ["Auckland", "Christchurch", "Dunedin", "Wellington", "Other"] as const;

const IE_CITIES = ["Cork", "Dublin", "Galway", "Limerick", "Other"] as const;

export const GENERIC_MAJOR_CITIES = [
  "Amsterdam",
  "Bangkok",
  "Barcelona",
  "Beijing",
  "Berlin",
  "Buenos Aires",
  "Cairo",
  "Chicago",
  "Delhi NCR",
  "Dubai",
  "Dublin",
  "Hong Kong",
  "Istanbul",
  "Jakarta",
  "Johannesburg",
  "Karachi",
  "Kuala Lumpur",
  "Lagos",
  "London",
  "Los Angeles",
  "Mexico City",
  "Miami",
  "Milan",
  "Montreal",
  "Mumbai",
  "Munich",
  "Nairobi",
  "New York",
  "Paris",
  "Riyadh",
  "San Francisco",
  "Santiago",
  "São Paulo",
  "Seoul",
  "Shanghai",
  "Singapore",
  "Sydney",
  "Taipei",
  "Tokyo",
  "Toronto",
  "Vancouver",
  "Vienna",
  "Warsaw",
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
  Singapore: SG_CITIES,
  France: FR_CITIES,
  Spain: ES_CITIES,
  Italy: IT_CITIES,
  Netherlands: NL_CITIES,
  Belgium: BE_CITIES,
  Japan: JP_CITIES,
  "South Korea": KR_CITIES,
  China: CN_CITIES,
  Brazil: BR_CITIES,
  Mexico: MX_CITIES,
  Malaysia: MY_CITIES,
  Thailand: TH_CITIES,
  Indonesia: ID_CITIES,
  Philippines: PH_CITIES,
  Vietnam: VN_CITIES,
  Bangladesh: BD_CITIES,
  Pakistan: PK_CITIES,
  Nigeria: NG_CITIES,
  "South Africa": ZA_CITIES,
  Switzerland: CH_CITIES,
  Sweden: SE_CITIES,
  Norway: NO_CITIES,
  Poland: PL_CITIES,
  Turkey: TR_CITIES,
  "Saudi Arabia": SA_CITIES,
  Egypt: EG_CITIES,
  Argentina: AR_CITIES,
  Colombia: CO_CITIES,
  Taiwan: TW_CITIES,
  "New Zealand": NZ_CITIES,
  Ireland: IE_CITIES,
};

/**
 * Cities that belong to `country` ONLY. No generic/global fallback — picking "France" never surfaces
 * Mumbai or Tokyo. If the country has no curated list (or is blank), returns `[]`; the combobox then
 * shows its empty-state hint and the "Other (not in list)" button lets users type their own city.
 * The literal "Other" option embedded in each per-country array is dropped here — the UI owns that flow.
 */
export function citiesForCountry(country: string): string[] {
  const t = country.trim();
  if (!t) return [];
  const key = Object.keys(CITY_OPTIONS_BY_COUNTRY).find((k) => k.toLowerCase() === t.toLowerCase());
  const list = key ? CITY_OPTIONS_BY_COUNTRY[key] : undefined;
  if (!list?.length) return [];
  return list.filter((c) => c.toLowerCase() !== "other");
}
