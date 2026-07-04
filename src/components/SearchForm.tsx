import React, { useState, useRef, useEffect } from 'react';
import { Search, MapPin, ShoppingBag, Loader2, ChevronDown, ChevronUp } from 'lucide-react';

interface SearchFormProps {
  onSearch: (city: string, category: string) => void;
  isLoading: boolean;
  categories: string[];
}

const SLUG_RE = /^[a-zA-Z0-9\- ]+$/;

// ── All major Indian cities ────────────────────────────────────────────────────
const ALL_CITIES = [
  // Maharashtra
  'Mumbai','Pune','Nagpur','Nashik','Aurangabad','Thane','Navi Mumbai',
  'Pimpri-Chinchwad','Solapur','Kolhapur','Amravati','Sangli','Malegaon',
  'Akola','Latur','Dhule','Ahmadnagar','Chandrapur','Nanded','Jalgaon',
  'Bhiwandi','Ichalkaranji','Panvel','Kalyan','Ulhasnagar','Ratnagiri',
  // Delhi NCR
  'Delhi','Gurgaon','Noida','Ghaziabad','Faridabad','Greater Noida',
  // Karnataka
  'Bangalore','Mysore','Hubli','Mangalore','Belgaum','Davanagere',
  'Gulbarga','Bellary','Shimoga','Tumkur','Bijapur','Raichur',
  'Hassan','Mandya','Udupi','Dharwad','Hospet',
  // Tamil Nadu
  'Chennai','Coimbatore','Madurai','Tiruchirappalli','Salem','Tirunelveli',
  'Erode','Tiruppur','Vellore','Thanjavur','Thoothukudi','Dindigul',
  'Sivakasi','Namakkal','Kumbakonam','Karur',
  // Gujarat
  'Ahmedabad','Surat','Vadodara','Rajkot','Bhavnagar','Jamnagar',
  'Junagadh','Anand','Gandhinagar','Nadiad','Bharuch','Morbi',
  'Mehsana','Navsari','Valsad','Botad','Amreli','Porbandar',
  // Uttar Pradesh
  'Lucknow','Kanpur','Agra','Varanasi','Allahabad','Meerut','Bareilly',
  'Moradabad','Aligarh','Saharanpur','Gorakhpur','Firozabad','Mathura',
  'Muzaffarnagar','Shahjahanpur','Rampur','Jhansi','Hapur','Etawah',
  'Unnao','Hardoi','Sitapur','Bulandshahr','Sambhal',
  // West Bengal
  'Kolkata','Howrah','Durgapur','Asansol','Siliguri','Bardhaman',
  'Bally','Panihati','Bhatpara','Kamarhati','Kulti','Haldia',
  'Kharagpur','Raiganj','Balurghat','Krishnanagar','Kalyani',
  // Rajasthan
  'Jaipur','Jodhpur','Kota','Bikaner','Ajmer','Udaipur','Alwar',
  'Bhilwara','Bharatpur','Sikar','Pali','Sri Ganganagar','Beawar',
  'Chittorgarh','Nagaur','Tonk','Hanumangarh',
  // Andhra Pradesh
  'Visakhapatnam','Vijayawada','Guntur','Kakinada','Rajahmundry',
  'Tirupati','Kadapa','Kurnool','Nellore','Ongole','Anantapur',
  'Eluru','Nandyal','Machilipatnam',
  // Telangana
  'Hyderabad','Warangal','Nizamabad','Khammam','Karimnagar',
  'Ramagundam','Mahbubnagar','Secunderabad','Sangareddy',
  // Madhya Pradesh
  'Indore','Bhopal','Jabalpur','Gwalior','Ujjain','Ratlam','Satna',
  'Sagar','Dewas','Singrauli','Rewa','Vidisha','Chhindwara',
  // Punjab
  'Ludhiana','Amritsar','Jalandhar','Patiala','Batala','Pathankot',
  'Mohali','Hoshiarpur','Bathinda','Moga','Firozpur',
  // Haryana
  'Rohtak','Hisar','Karnal','Sonipat','Ambala','Yamunanagar',
  'Panchkula','Bhiwani','Sirsa','Panipat',
  // Bihar
  'Patna','Muzaffarpur','Gaya','Bhagalpur','Darbhanga','Bihar Sharif',
  'Arrah','Begusarai','Katihar','Munger','Chapra','Hajipur','Samastipur',
  // Jharkhand
  'Ranchi','Jamshedpur','Dhanbad','Bokaro','Hazaribagh','Deoghar',
  // Odisha
  'Bhubaneswar','Cuttack','Rourkela','Brahmapur','Sambalpur',
  'Puri','Balasore','Baripada','Jharsuguda',
  // Kerala
  'Kochi','Thiruvananthapuram','Kozhikode','Thrissur','Kollam',
  'Palakkad','Alappuzha','Malappuram','Kannur','Kasaragod','Kottayam',
  // Assam
  'Guwahati','Dibrugarh','Silchar','Jorhat','Nagaon','Tinsukia',
  // Chhattisgarh
  'Raipur','Bhilai','Bilaspur','Korba','Durg','Rajnandgaon',
  // Uttarakhand
  'Dehradun','Haridwar','Roorkee','Haldwani','Kashipur','Rudrapur',
  // Himachal Pradesh
  'Shimla','Solan','Mandi','Kangra',
  // Jammu & Kashmir
  'Srinagar','Jammu','Anantnag','Sopore',
  // Goa
  'Panaji','Vasco da Gama','Margao','Mapusa',
  // North East
  'Agartala','Imphal','Shillong','Gangtok','Aizawl','Kohima','Itanagar',
  // Union Territories
  'Chandigarh','Pondicherry','Port Blair','Daman','Silvassa',
].sort((a, b) => a.localeCompare(b));

// ── Product categories grouped by industry ────────────────────────────────────
const CATEGORY_GROUPS: { group: string; items: { label: string; slug: string }[] }[] = [
  {
    group: 'Food & Agriculture',
    items: [
      { label: 'Rice', slug: 'rice' },
      { label: 'Wheat', slug: 'wheat' },
      { label: 'Pulses', slug: 'pulses' },
      { label: 'Sugar', slug: 'sugar' },
      { label: 'Jaggery', slug: 'jaggery' },
      { label: 'Flour', slug: 'flour' },
      { label: 'Maize', slug: 'maize' },
      { label: 'Vegetables', slug: 'vegetables' },
      { label: 'Fruits', slug: 'fruits' },
      { label: 'Honey', slug: 'honey' },
      { label: 'Papad', slug: 'papad' },
      { label: 'Pickles', slug: 'pickles' },
      { label: 'Namkeen', slug: 'namkeen' },
      { label: 'Biscuits', slug: 'biscuits' },
      { label: 'Noodles', slug: 'noodles' },
    ],
  },
  {
    group: 'Spices & Oils',
    items: [
      { label: 'Cashew Nuts', slug: 'cashew-nuts' },
      { label: 'Dry Fruits', slug: 'dry-fruits' },
      { label: 'Turmeric', slug: 'turmeric' },
      { label: 'Chilli', slug: 'chilli' },
      { label: 'Pepper', slug: 'pepper' },
      { label: 'Cumin', slug: 'cumin' },
      { label: 'Coriander', slug: 'coriander' },
      { label: 'Cardamom', slug: 'cardamom' },
      { label: 'Cloves', slug: 'cloves' },
      { label: 'Ginger', slug: 'ginger' },
      { label: 'Garlic', slug: 'garlic' },
      { label: 'Coconut Oil', slug: 'coconut-oil' },
      { label: 'Groundnut Oil', slug: 'groundnut-oil' },
      { label: 'Mustard Oil', slug: 'mustard-oil' },
      { label: 'Sesame Oil', slug: 'sesame-oil' },
      { label: 'Tea', slug: 'tea' },
      { label: 'Coffee', slug: 'coffee' },
    ],
  },
  {
    group: 'Textiles & Apparel',
    items: [
      { label: 'Cotton Fabric', slug: 'cotton-fabric' },
      { label: 'Silk Fabric', slug: 'silk-fabric' },
      { label: 'Polyester Fabric', slug: 'polyester-fabric' },
      { label: 'Sarees', slug: 'sarees' },
      { label: 'Kurtas', slug: 'kurtas' },
      { label: 'T-Shirts', slug: 't-shirts' },
      { label: 'Jeans', slug: 'jeans' },
      { label: 'Uniforms', slug: 'uniforms' },
      { label: 'Bedsheets', slug: 'bedsheets' },
      { label: 'Towels', slug: 'towels' },
      { label: 'Carpets', slug: 'carpets' },
      { label: 'Curtains', slug: 'curtains' },
    ],
  },
  {
    group: 'Machinery & Equipment',
    items: [
      { label: 'CNC Machines', slug: 'cnc-machines' },
      { label: 'Lathe Machines', slug: 'lathe-machines' },
      { label: 'Pumps', slug: 'pumps' },
      { label: 'Motors', slug: 'motors' },
      { label: 'Generators', slug: 'generators' },
      { label: 'Compressors', slug: 'compressors' },
      { label: 'Conveyors', slug: 'conveyors' },
      { label: 'Packaging Machines', slug: 'packaging-machines' },
      { label: 'Food Processing Machines', slug: 'food-processing-machines' },
      { label: 'Boilers', slug: 'boilers' },
      { label: 'Cranes', slug: 'cranes' },
    ],
  },
  {
    group: 'Chemicals & Pharma',
    items: [
      { label: 'Industrial Chemicals', slug: 'industrial-chemicals' },
      { label: 'Fertilizers', slug: 'fertilizers' },
      { label: 'Pesticides', slug: 'pesticides' },
      { label: 'Paints', slug: 'paints' },
      { label: 'Adhesives', slug: 'adhesives' },
      { label: 'Dyes', slug: 'dyes' },
      { label: 'Detergents', slug: 'detergents' },
      { label: 'Lubricants', slug: 'lubricants' },
      { label: 'Medicines', slug: 'medicines' },
      { label: 'Ayurvedic Products', slug: 'ayurvedic-products' },
      { label: 'Surgical Equipment', slug: 'surgical-equipment' },
    ],
  },
  {
    group: 'Electronics & Electrical',
    items: [
      { label: 'LED Lights', slug: 'led-lights' },
      { label: 'CCTV Cameras', slug: 'cctv-cameras' },
      { label: 'Solar Panels', slug: 'solar-panels' },
      { label: 'Inverters', slug: 'inverters' },
      { label: 'Batteries', slug: 'batteries' },
      { label: 'Cables & Wires', slug: 'cables-wires' },
      { label: 'Switches', slug: 'switches' },
      { label: 'Transformers', slug: 'transformers' },
      { label: 'Mobile Accessories', slug: 'mobile-accessories' },
    ],
  },
  {
    group: 'Construction & Building',
    items: [
      { label: 'Cement', slug: 'cement' },
      { label: 'Steel Bars', slug: 'steel-bars' },
      { label: 'TMT Bars', slug: 'tmt-bars' },
      { label: 'Bricks', slug: 'bricks' },
      { label: 'Tiles', slug: 'tiles' },
      { label: 'Marble', slug: 'marble' },
      { label: 'Granite', slug: 'granite' },
      { label: 'Plywood', slug: 'plywood' },
      { label: 'Doors', slug: 'doors' },
      { label: 'Pipes', slug: 'pipes' },
      { label: 'Waterproofing', slug: 'waterproofing' },
    ],
  },
  {
    group: 'Plastics & Rubber',
    items: [
      { label: 'PVC Pipes', slug: 'pvc-pipes' },
      { label: 'Plastic Bags', slug: 'plastic-bags' },
      { label: 'Rubber Products', slug: 'rubber-products' },
      { label: 'Gaskets', slug: 'gaskets' },
      { label: 'Plastic Granules', slug: 'plastic-granules' },
      { label: 'Polythene', slug: 'polythene' },
    ],
  },
  {
    group: 'Paper & Packaging',
    items: [
      { label: 'Corrugated Boxes', slug: 'corrugated-boxes' },
      { label: 'Paper Bags', slug: 'paper-bags' },
      { label: 'Jute Bags', slug: 'jute-bags' },
      { label: 'Labels & Stickers', slug: 'labels-stickers' },
      { label: 'Packaging Film', slug: 'packaging-film' },
      { label: 'Thermocol', slug: 'thermocol' },
    ],
  },
  {
    group: 'Hardware & Tools',
    items: [
      { label: 'Bolts & Nuts', slug: 'bolts-nuts' },
      { label: 'Hand Tools', slug: 'hand-tools' },
      { label: 'Power Tools', slug: 'power-tools' },
      { label: 'Locks', slug: 'locks' },
      { label: 'Bearings', slug: 'bearings' },
      { label: 'Fasteners', slug: 'fasteners' },
    ],
  },
  {
    group: 'Auto Parts',
    items: [
      { label: 'Engine Parts', slug: 'engine-parts' },
      { label: 'Brake Parts', slug: 'brake-parts' },
      { label: 'Car Accessories', slug: 'car-accessories' },
      { label: 'Tyres', slug: 'tyres' },
      { label: 'Auto Filters', slug: 'auto-filters' },
      { label: 'Auto Bearings', slug: 'auto-bearings' },
    ],
  },
  {
    group: 'Furniture & Interiors',
    items: [
      { label: 'Wooden Furniture', slug: 'wooden-furniture' },
      { label: 'Office Furniture', slug: 'office-furniture' },
      { label: 'Modular Kitchen', slug: 'modular-kitchen' },
      { label: 'Sofa', slug: 'sofa' },
      { label: 'Wardrobe', slug: 'wardrobe' },
    ],
  },
  {
    group: 'Agriculture Equipment',
    items: [
      { label: 'Tractor Parts', slug: 'tractor-parts' },
      { label: 'Irrigation Equipment', slug: 'irrigation-equipment' },
      { label: 'Drip Irrigation', slug: 'drip-irrigation' },
      { label: 'Storage Tanks', slug: 'storage-tanks' },
      { label: 'Sprayers', slug: 'sprayers' },
    ],
  },
];

export function SearchForm({ onSearch, isLoading }: SearchFormProps) {
  const [city, setCity] = useState('');
  const [category, setCategory] = useState('');
  const [errors, setErrors] = useState<{ city?: string; category?: string }>({});
  const [citySuggestions, setCitySuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');
  const cityRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (cityRef.current && !cityRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const validate = (field: 'city' | 'category', value: string): string => {
    if (!value.trim()) return 'This field is required.';
    if (!SLUG_RE.test(value)) return 'Only letters, numbers, spaces and hyphens allowed.';
    if (value.length > 100) return 'Maximum 100 characters.';
    return '';
  };

  const handleCityChange = (val: string) => {
    setCity(val);
    setErrors(prev => ({ ...prev, city: validate('city', val) }));
    if (val.trim().length >= 1) {
      const q = val.trim().toLowerCase();
      const filtered = ALL_CITIES.filter(c => c.toLowerCase().startsWith(q)).slice(0, 10);
      setCitySuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setCitySuggestions([]);
      setShowSuggestions(false);
    }
  };

  const selectCity = (c: string) => {
    setCity(c);
    setErrors(prev => ({ ...prev, city: '' }));
    setCitySuggestions([]);
    setShowSuggestions(false);
  };

  const handleCategoryChange = (val: string) => {
    setCategory(val);
    setErrors(prev => ({ ...prev, category: validate('category', val) }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cityErr = validate('city', city);
    const categoryErr = validate('category', category);
    if (cityErr || categoryErr) {
      setErrors({ city: cityErr, category: categoryErr });
      return;
    }
    onSearch(
      city.trim().toLowerCase().replace(/\s+/g, '-'),
      category.trim().toLowerCase().replace(/\s+/g, '-'),
    );
  };

  const filteredGroups = categorySearch.trim()
    ? CATEGORY_GROUPS.map(g => ({
        ...g,
        items: g.items.filter(i =>
          i.label.toLowerCase().includes(categorySearch.toLowerCase())
        ),
      })).filter(g => g.items.length > 0)
    : CATEGORY_GROUPS;

  const visibleGroups = showAllCategories || categorySearch.trim()
    ? filteredGroups
    : filteredGroups.slice(0, 3);

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-8">
        <h2 className="text-2xl font-bold text-white mb-1">IndiaMART Supplier Scraper</h2>
        <p className="text-emerald-100 text-sm">
          Search suppliers from any city across India for any product
        </p>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* City autocomplete */}
          <div ref={cityRef} className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <MapPin className="w-4 h-4 inline mr-1" />
              City
            </label>
            <input
              type="text"
              value={city}
              onChange={e => handleCityChange(e.target.value)}
              onFocus={() => {
                if (city.trim() && citySuggestions.length > 0) setShowSuggestions(true);
              }}
              placeholder="Type any city in India…"
              maxLength={100}
              autoComplete="off"
              className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all outline-none ${errors.city ? 'border-red-400' : 'border-gray-200'}`}
            />
            {errors.city && <p className="mt-1 text-xs text-red-600">{errors.city}</p>}

            {showSuggestions && (
              <ul className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-52 overflow-y-auto">
                {citySuggestions.map(c => (
                  <li
                    key={c}
                    onMouseDown={() => selectCity(c)}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 cursor-pointer transition-colors first:rounded-t-xl last:rounded-b-xl"
                  >
                    <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    {c}
                  </li>
                ))}
              </ul>
            )}

            <div className="flex flex-wrap gap-1.5 mt-3">
              {['Mumbai','Delhi','Bangalore','Chennai','Hyderabad','Pune','Ahmedabad','Kolkata'].map(c => (
                <button
                  key={c} type="button"
                  onClick={() => selectCity(c)}
                  className="px-2.5 py-1 text-xs font-medium bg-gray-100 hover:bg-emerald-50 text-gray-600 hover:text-emerald-700 rounded-full transition-colors"
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Category free-text */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <ShoppingBag className="w-4 h-4 inline mr-1" />
              Product / Category
            </label>
            <input
              type="text"
              value={category}
              onChange={e => handleCategoryChange(e.target.value)}
              placeholder="Type any product or category…"
              maxLength={100}
              className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all outline-none ${errors.category ? 'border-red-400' : 'border-gray-200'}`}
            />
            {errors.category && <p className="mt-1 text-xs text-red-600">{errors.category}</p>}
            <p className="mt-2 text-xs text-gray-400">Or pick from the categories below</p>
          </div>
        </div>

        {/* Category browser */}
        <div className="border border-gray-100 rounded-xl p-4 bg-gray-50">
          <div className="flex items-center justify-between mb-3 gap-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide shrink-0">
              Browse Categories
            </p>
            <input
              type="text"
              value={categorySearch}
              onChange={e => setCategorySearch(e.target.value)}
              placeholder="Search categories…"
              className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg focus:ring-1 focus:ring-emerald-400 focus:border-transparent outline-none bg-white w-full max-w-xs"
            />
          </div>

          <div className="space-y-3">
            {visibleGroups.map(({ group, items }) => (
              <div key={group}>
                <p className="text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">{group}</p>
                <div className="flex flex-wrap gap-1.5">
                  {items.map(({ label, slug }) => (
                    <button
                      key={slug} type="button"
                      onClick={() => handleCategoryChange(slug)}
                      className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors ${
                        category === slug
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-white border border-gray-200 text-gray-600 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {filteredGroups.length === 0 && (
              <p className="text-sm text-gray-400 py-2">No categories match your search.</p>
            )}
          </div>

          {!categorySearch.trim() && (
            <button
              type="button"
              onClick={() => setShowAllCategories(v => !v)}
              className="mt-3 flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-800 font-medium transition-colors"
            >
              {showAllCategories ? (
                <><ChevronUp className="w-3.5 h-3.5" />Show less</>
              ) : (
                <><ChevronDown className="w-3.5 h-3.5" />Show all {CATEGORY_GROUPS.length} category groups</>
              )}
            </button>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading || !city || !category || !!errors.city || !!errors.category}
          className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold rounded-xl transition-all shadow-lg hover:shadow-xl disabled:shadow-none disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <><Loader2 className="w-5 h-5 animate-spin" />Scraping in Progress…</>
          ) : (
            <><Search className="w-5 h-5" />Start Scraping</>
          )}
        </button>
      </form>

      <div className="px-6 pb-6">
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <p className="text-sm text-amber-800">
            <span className="font-semibold">Note:</span> The scraper extracts supplier data from IndiaMART directory
            pages and follows external website links. Please ensure you comply with IndiaMART's terms of service.
          </p>
        </div>
      </div>
    </div>
  );
}
