import React, { useState } from 'react';
import { Search, MapPin, ShoppingBag, Loader2 } from 'lucide-react';

interface SearchFormProps {
  onSearch: (city: string, category: string) => void;
  isLoading: boolean;
  categories: string[];
}

// Only alphanumeric and hyphens — mirrors backend sanitiseSlug
const SLUG_RE = /^[a-zA-Z0-9\- ]+$/;

const popularCities = [
  'Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Hyderabad',
  'Kolkata', 'Pune', 'Ahmedabad', 'Jaipur', 'Lucknow'
];

const popularCategories: { label: string; slug: string }[] = [
  { label: 'Cashew Nuts',   slug: 'cashew-nuts'   },
  { label: 'Groundnut Oil', slug: 'groundnut-oil'  },
  { label: 'Papad',         slug: 'papad'          },
  { label: 'Rice',          slug: 'rice'           },
  { label: 'Spices',        slug: 'spices'         },
  { label: 'Dry Fruits',    slug: 'dry-fruits'     },
  { label: 'Coconut Oil',   slug: 'coconut-oil'    },
  { label: 'Turmeric',      slug: 'turmeric'       },
];

export function SearchForm({ onSearch, isLoading }: SearchFormProps) {
  const [city, setCity] = useState('');
  const [category, setCategory] = useState('');
  const [errors, setErrors] = useState<{ city?: string; category?: string }>({});

  const validate = (field: 'city' | 'category', value: string): string => {
    if (!value.trim()) return 'This field is required.';
    if (!SLUG_RE.test(value)) return 'Only letters, numbers, and hyphens allowed.';
    if (value.length > 100) return 'Maximum 100 characters.';
    return '';
  };

  const handleCityChange = (val: string) => {
    setCity(val);
    setErrors(prev => ({ ...prev, city: validate('city', val) }));
  };

  const handleCategoryChange = (val: string) => {
    setCategory(val);
    setErrors(prev => ({ ...prev, category: validate('category', val) }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cityErr     = validate('city', city);
    const categoryErr = validate('category', category);
    if (cityErr || categoryErr) {
      setErrors({ city: cityErr, category: categoryErr });
      return;
    }
    // Normalise to slug format before sending
    onSearch(
      city.trim().toLowerCase().replace(/\s+/g, '-'),
      category.trim().toLowerCase().replace(/\s+/g, '-'),
    );
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-8">
        <h2 className="text-2xl font-bold text-white mb-2">
          IndiaMART Supplier Scraper
        </h2>
        <p className="text-emerald-100 text-sm">
          Extract supplier data from IndiaMART directories and external websites
        </p>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <MapPin className="w-4 h-4 inline mr-2" />
              City
            </label>
            <input
              type="text"
              value={city}
              onChange={(e) => handleCityChange(e.target.value)}
              placeholder="e.g., Chennai, Mumbai, Delhi"
              maxLength={100}
              className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all outline-none ${errors.city ? 'border-red-400' : 'border-gray-200'}`}
            />
            {errors.city && (
              <p className="mt-1 text-xs text-red-600">{errors.city}</p>
            )}
            <div className="flex flex-wrap gap-2 mt-3">
              {popularCities.slice(0, 5).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => handleCityChange(c)}
                  className="px-3 py-1 text-xs font-medium bg-gray-100 hover:bg-emerald-50 text-gray-600 hover:text-emerald-700 rounded-full transition-colors"
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <ShoppingBag className="w-4 h-4 inline mr-2" />
              Category
            </label>
            <input
              type="text"
              value={category}
              onChange={(e) => handleCategoryChange(e.target.value)}
              placeholder="e.g., cashew-nuts, groundnut-oil"
              maxLength={100}
              className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all outline-none ${errors.category ? 'border-red-400' : 'border-gray-200'}`}
            />
            {errors.category && (
              <p className="mt-1 text-xs text-red-600">{errors.category}</p>
            )}
            <div className="flex flex-wrap gap-2 mt-3">
              {popularCategories.map(({ label, slug }) => (
                <button
                  key={slug}
                  type="button"
                  onClick={() => handleCategoryChange(slug)}
                  className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                    category === slug
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-100 hover:bg-emerald-50 text-gray-600 hover:text-emerald-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading || !city || !category || !!errors.city || !!errors.category}
          className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold rounded-xl transition-all shadow-lg hover:shadow-xl disabled:shadow-none disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Scraping in Progress...
            </>
          ) : (
            <>
              <Search className="w-5 h-5" />
              Start Scraping
            </>
          )}
        </button>
      </form>

      <div className="px-6 pb-6">
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <p className="text-sm text-amber-800">
            <span className="font-semibold">Note:</span> The scraper extracts supplier data from IndiaMART directory pages
            and follows external website links. Please ensure you comply with IndiaMART's terms of service.
          </p>
        </div>
      </div>
    </div>
  );
}
