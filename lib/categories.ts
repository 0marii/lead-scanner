export interface CategoryMapping {
  tags: Record<string, string | string[]>;
  keywords: string[];
}

const CATEGORY_MAP: Record<string, CategoryMapping> = {
  plumber: {
    tags: { craft: "plumber", shop: "plumber" },
    keywords: ["plumb", "pipe", "drain"],
  },
  plumber_s: {
    tags: { craft: "plumber", shop: "plumber" },
    keywords: ["plumb", "pipe", "drain"],
  },
  plumbers: {
    tags: { craft: "plumber", shop: "plumber" },
    keywords: ["plumb", "pipe", "drain"],
  },
  dentist: {
    tags: { amenity: "dentist" },
    keywords: ["dental", "dentist"],
  },
  dentists: {
    tags: { amenity: "dentist" },
    keywords: ["dental", "dentist"],
  },
  restaurant: {
    tags: { amenity: "restaurant" },
    keywords: ["restaurant", "grill", "kitchen", "cafe"],
  },
  restaurants: {
    tags: { amenity: "restaurant" },
    keywords: ["restaurant", "grill", "kitchen", "cafe"],
  },
  salon: {
    tags: { shop: "hairdresser", amenity: "hairdresser" },
    keywords: ["salon", "hair", "barber"],
  },
  landscaper: {
    tags: { craft: "landscaper", shop: "garden_centre" },
    keywords: ["landscape", "lawn", "garden"],
  },
  landscapers: {
    tags: { craft: "landscaper", shop: "garden_centre" },
    keywords: ["landscape", "lawn", "garden"],
  },
  roofer: {
    tags: { craft: "roofer" },
    keywords: ["roof", "shingle"],
  },
  roofers: {
    tags: { craft: "roofer" },
    keywords: ["roof", "shingle"],
  },
  "auto repair": {
    tags: { shop: "car_repair" },
    keywords: ["auto", "repair", "mechanic"],
  },
  mechanic: {
    tags: { shop: "car_repair" },
    keywords: ["auto", "repair", "mechanic"],
  },
  electrician: {
    tags: { craft: "electrician" },
    keywords: ["electric", "wiring"],
  },
  electricians: {
    tags: { craft: "electrician" },
    keywords: ["electric", "wiring"],
  },
  hvac: {
    tags: { craft: "hvac" },
    keywords: ["hvac", "heating", "cooling", "air condition"],
  },
  lawyer: {
    tags: { office: "lawyer" },
    keywords: ["law", "attorney", "legal"],
  },
  lawyers: {
    tags: { office: "lawyer" },
    keywords: ["law", "attorney", "legal"],
  },
};

export function normalizeCategory(input: string): string {
  return input.trim().toLowerCase().replace(/\s+/g, " ");
}

export function getCategoryMapping(category: string): CategoryMapping {
  const normalized = normalizeCategory(category);
  if (CATEGORY_MAP[normalized]) return CATEGORY_MAP[normalized];

  const singular = normalized.endsWith("s") ? normalized.slice(0, -1) : normalized;
  if (CATEGORY_MAP[singular]) return CATEGORY_MAP[singular];

  return {
    tags: {},
    keywords: normalized.split(/\s+/).filter(Boolean),
  };
}

export function matchesCategory(
  tags: Record<string, string>,
  category: string,
): boolean {
  const mapping = getCategoryMapping(category);
  const tagEntries = Object.entries(mapping.tags);

  if (tagEntries.length > 0) {
    const tagMatch = tagEntries.some(([key, value]) => {
      const tagValue = tags[key];
      if (!tagValue) return false;
      if (Array.isArray(value)) return value.includes(tagValue);
      return tagValue === value;
    });
    if (tagMatch) return true;
  }

  const haystack = [
    tags.name,
    tags.brand,
    tags.operator,
    tags.amenity,
    tags.shop,
    tags.craft,
    tags.office,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (mapping.keywords.length === 0) {
    return haystack.includes(normalizeCategory(category));
  }

  return mapping.keywords.some((keyword) => haystack.includes(keyword));
}

export function buildOverpassTagFilters(category: string): string[] {
  const mapping = getCategoryMapping(category);
  const filters: string[] = [];

  for (const [key, value] of Object.entries(mapping.tags)) {
    if (Array.isArray(value)) {
      value.forEach((v) => filters.push(`["${key}"="${v}"]`));
    } else {
      filters.push(`["${key}"="${value}"]`);
    }
  }

  if (filters.length === 0 && mapping.keywords.length > 0) {
    const keyword = escapeOverpassRegex(mapping.keywords[0]);
    filters.push(`["name"~"${keyword}",i]`);
  }

  if (filters.length === 0) {
    filters.push(`["name"~"${escapeOverpassRegex(normalizeCategory(category))}",i]`);
  }

  return filters;
}

// Escape regex metacharacters first, then encode the Overpass string literal.
export function escapeOverpassRegex(value: string): string {
  return JSON.stringify(value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).slice(1, -1);
}
