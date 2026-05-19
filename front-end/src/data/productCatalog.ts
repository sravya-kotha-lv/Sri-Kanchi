export type CatalogProductSource = 'category' | 'collection' | 'new-arrivals' | 'offers';

export type CatalogProduct = {
  id?: string | number;
  categoryId?: number;
  slug: string;
  name: string;
  category: string;
  occasion?: string;
  shortDescription?: string;
  color: string;
  price: number;
  image: string;
  galleryImages?: string[];
  source: CatalogProductSource;
  originalPrice?: number;
  badge?: string;
  note?: string;
  offerTag?: string;
  rating?: number;
  reviewsCount?: number;
  stock?: number;
};

const legacyItemAliases: Record<string, string> = {
  'Banarasi Silk Royale': 'royal-silk-heirloom',
  'Kanjeevaram Wedding Gold': 'kanchipuram-peacock-weave',
  'Cotton Temple Weave': 'cotton-heritage-weave',
  'Chiffon Evening Drape': 'soft-pattu-sunset-glow',
  'Organza Bloom Saree': 'organza-mist-bloom',
  'Festive Tissue Glow': 'organza-evening-drape',
  'Premium Silk Drape': 'royal-silk-heirloom',
  'Wedding Gold Edit': 'temple-border-silk',
  'Festive Soft Organza': 'organza-mist-bloom',
  'Party Chiffon Luxe': 'organza-evening-drape'
};

export const normalizeCatalogItemId = (itemId: string) => legacyItemAliases[itemId] ?? itemId;
