import React, { useState } from 'react';
import {
  Compass,
  MapPin,
  Star,
  Flame,
  Waves,
  Bath,
  Calendar,
  Users,
  Search,
  CheckCircle2,
  TreePine,
  Sparkles
} from 'lucide-react';
import { formatPrice } from './lib/utils';
import type { GlampingCategory, GlampingItem } from './types';

const INITIAL_GLAMPINGS: GlampingItem[] = [
  {
    id: '1',
    title: 'A-frame «Скандинавия» с горячей купелью',
    tagline: 'Панорамные окна в сосновом бору',
    category: 'a-frame',
    categoryName: 'A-frame',
    location: 'Ленинградская область, берег оз. Вуокса',
    distance: '75 км от города',
    region: 'Ленинградская область',
    pricePerNight: 9500,
    rating: 4.96,
    reviewsCount: 128,
    isSuperhost: true,
    badges: ['Хит бронирования', 'Горячая купель'],
    features: ['Купель Фурако', 'Камин на дровах', 'Панорамная терраса'],
    images: ['https://images.unsplash.com/photo-1587061949409-02df41d5e562?auto=format&fit=crop&w=1200&q=80'],
    description: 'Уютный двухэтажный треугольный домик среди вековых сосен. Личная зона барбекю, банный чан под звездами.',
    capacity: {
      maxGuests: 4,
      bedrooms: 1,
      beds: 2,
      areaM2: 52,
    },
    amenities: [
      { id: '1', name: 'Купель на террасе', icon: 'bath' },
      { id: '2', name: 'Камин', icon: 'flame' },
      { id: '3', name: 'Wi-Fi 100 Мбит/с', icon: 'wifi' },
    ],
    addOns: [
      { id: '1', name: 'Растопка чана с травами и цитрусами', price: 4500, description: 'Горячая вода к вашему заезду' },
      { id: '2', name: 'Завтрак от шефа на двоих', price: 1800, description: 'Свежие круассаны и фермерский сыр' },
    ],
    hasHotTub: true,
    hasRiver: true,
    isDogFriendly: true,
    hasSauna: false,
  },
  {
    id: '2',
    title: 'Купольная сфера «Северное сияние»',
    tagline: 'Звездное небо прямо над кроватью',
    category: 'dome',
    categoryName: 'Купольные сферы',
    location: 'Карелия, Ладожские шхеры',
    distance: '180 км от города',
    region: 'Карелия',
    pricePerNight: 12000,
    rating: 4.98,
    reviewsCount: 84,
    isSuperhost: true,
    badges: ['Премиум', 'Вид на Ладогу'],
    features: ['Обзор 360°', 'Сауна на берегу', 'Теплые полы'],
    images: ['https://images.unsplash.com/photo-1510312305653-8ed496efae75?auto=format&fit=crop&w=1200&q=80'],
    description: 'Утепленный геокупол с климат-контролем и ванной комнатой внутри. Захватывающий вид на водную гладь Ладоги.',
    capacity: {
      maxGuests: 2,
      bedrooms: 1,
      beds: 1,
      areaM2: 45,
    },
    amenities: [
      { id: '4', name: 'Панорамный купол', icon: 'eye' },
      { id: '5', name: 'Финская сауна', icon: 'flame' },
    ],
    addOns: [
      { id: '3', name: 'Прогулка на катере по шхерам', price: 6000, description: 'Индивидуальный маршрут 2 часа' },
    ],
    hasHotTub: false,
    hasRiver: true,
    isDogFriendly: false,
    hasSauna: true,
  },
  {
    id: '3',
    title: 'Шале «Лесной родник» с русской баней',
    tagline: 'Просторный коттедж для семьи или компании',
    category: 'chalet',
    categoryName: 'Шале',
    location: 'Подмосковье, Истринский район',
    distance: '55 км от МКАД',
    region: 'Подмосковье',
    pricePerNight: 15500,
    rating: 4.92,
    reviewsCount: 95,
    isSuperhost: false,
    badges: ['Семейный отдых', 'Баня включена'],
    features: ['Собственная баня', 'Мангальная зона', 'Витражные окна'],
    images: ['https://images.unsplash.com/photo-1449158743715-0a90ebb6d2d8?auto=format&fit=crop&w=1200&q=80'],
    description: 'Деревянное шале из сибирского кедра с собственной баней на дровах, просторной кухней-гостиной и террасой.',
    capacity: {
      maxGuests: 6,
      bedrooms: 2,
      beds: 4,
      areaM2: 85,
    },
    amenities: [
      { id: '6', name: 'Баня на дровах', icon: 'flame' },
      { id: '7', name: 'Мангал и казан', icon: 'utensils' },
    ],
    addOns: [
      { id: '4', name: 'Березовые и дубовые веники', price: 1200, description: 'Комплект для парения' },
    ],
    hasHotTub: true,
    hasRiver: false,
    isDogFriendly: true,
    hasSauna: true,
  },
];

const CATEGORIES: { id: GlampingCategory; label: string }[] = [
  { id: 'all', label: 'Все варианты' },
  { id: 'a-frame', label: 'A-frame домики' },
  { id: 'dome', label: 'Купольные сферы' },
  { id: 'chalet', label: 'Шале и коттеджи' },
  { id: 'hot-tub', label: 'С купелью / чаном' },
  { id: 'water', label: 'У воды' },
];

export const App: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<GlampingCategory>('all');
  const [searchLocation, setSearchLocation] = useState('');

  const filteredGlampings = INITIAL_GLAMPINGS.filter((item) => {
    if (selectedCategory === 'hot-tub' && !item.hasHotTub) return false;
    if (selectedCategory === 'water' && !item.hasRiver) return false;
    if (selectedCategory !== 'all' && selectedCategory !== 'hot-tub' && selectedCategory !== 'water' && item.category !== selectedCategory) {
      return false;
    }
    if (searchLocation && !item.location.toLowerCase().includes(searchLocation.toLowerCase()) && !item.title.toLowerCase().includes(searchLocation.toLowerCase())) {
      return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-sand-100 text-graphite flex flex-col font-sans">
      {/* Header */}
      <header className="border-b border-sand-300 bg-sand-50/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-forest-700 flex items-center justify-center text-white shadow-soft">
              <TreePine className="w-6 h-6" />
            </div>
            <div>
              <span className="font-serif text-2xl font-bold tracking-tight text-forest-900 block leading-tight">
                Хвоя Stay
              </span>
              <span className="text-xs text-forest-600 font-medium tracking-wide">
                Глэмпинги & Эко-отели
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-forest-800">
            <a href="#catalog" className="hover:text-forest-600 transition-colors">Локации</a>
            <a href="#about" className="hover:text-forest-600 transition-colors">О сервисе</a>
            <a href="#reviews" className="hover:text-forest-600 transition-colors">Отзывы</a>
            <a href="#contact" className="hover:text-forest-600 transition-colors">Контакты</a>
          </nav>

          <div className="flex items-center gap-3">
            <button className="px-5 py-2.5 rounded-2xl bg-forest-700 hover:bg-forest-800 text-white font-medium text-sm transition-all shadow-soft hover:shadow-card">
              Сдать свой глэмпинг
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-16 md:py-24 overflow-hidden bg-gradient-to-b from-forest-50/50 to-sand-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-forest-100 text-forest-700 text-xs font-semibold uppercase tracking-wider mb-5">
              <Sparkles className="w-4 h-4" />
              Отдых в гармонии с природой
            </div>
            <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-bold text-forest-950 tracking-tight leading-[1.15] mb-6">
              Найдите идеальный глэмпинг для перезагрузки
            </h1>
            <p className="text-lg text-forest-700 leading-relaxed">
              Уютные A-frame дома, панорамные сферы, чаны под звёздами и бани на дровах в самых живописных уголках.
            </p>
          </div>

          {/* Quick Search Bar */}
          <div className="bg-sand-50 p-4 sm:p-5 rounded-3xl shadow-card max-w-4xl mx-auto border border-sand-300">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-sand-100 border border-sand-200">
                <Compass className="w-5 h-5 text-forest-600" />
                <input
                  type="text"
                  placeholder="Куда отправимся? (регион, озеро)"
                  value={searchLocation}
                  onChange={(e) => setSearchLocation(e.target.value)}
                  className="bg-transparent text-sm text-graphite focus:outline-none w-full placeholder:text-forest-500/70"
                />
              </div>

              <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-sand-100 border border-sand-200">
                <Calendar className="w-5 h-5 text-forest-600" />
                <span className="text-sm text-forest-700">Даты заезда и выезда</span>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1 flex items-center gap-3 px-4 py-3 rounded-2xl bg-sand-100 border border-sand-200">
                  <Users className="w-5 h-5 text-forest-600" />
                  <span className="text-sm text-forest-700">2 гостя</span>
                </div>
                <button className="px-6 py-3.5 rounded-2xl bg-forest-700 hover:bg-forest-800 text-white font-semibold text-sm transition-all flex items-center gap-2 shadow-soft">
                  <Search className="w-4 h-4" />
                  Найти
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Catalog & Filter Section */}
      <section id="catalog" className="py-12 flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        {/* Categories Pills */}
        <div className="flex items-center gap-2.5 overflow-x-auto pb-4 scrollbar-none mb-8">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-5 py-2.5 rounded-2xl text-sm font-semibold transition-all whitespace-nowrap ${
                selectedCategory === cat.id
                  ? 'bg-forest-700 text-white shadow-soft'
                  : 'bg-sand-200/70 hover:bg-sand-300 text-forest-800'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Glamping Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredGlampings.map((item) => (
            <article
              key={item.id}
              className="bg-sand-50 rounded-3xl overflow-hidden border border-sand-300 shadow-soft hover:shadow-card-hover transition-all duration-300 flex flex-col group"
            >
              <div className="relative aspect-[16/10] overflow-hidden bg-sand-200">
                <img
                  src={item.images[0]}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                  {item.badges.map((badge, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 rounded-full text-xs font-semibold bg-forest-900/80 backdrop-blur text-white"
                    >
                      {badge}
                    </span>
                  ))}
                </div>
                <div className="absolute top-4 right-4 bg-sand-50/90 backdrop-blur px-2.5 py-1 rounded-xl flex items-center gap-1 text-xs font-bold text-forest-900 shadow-soft">
                  <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                  {item.rating}
                  <span className="text-forest-600 font-normal">({item.reviewsCount})</span>
                </div>
              </div>

              <div className="p-6 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1 text-xs text-forest-600 mb-2">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{item.location} • {item.distance}</span>
                  </div>
                  <h3 className="font-serif text-xl font-bold text-forest-950 mb-2 group-hover:text-forest-700 transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-sm text-forest-700 mb-4 line-clamp-2">
                    {item.description}
                  </p>

                  <div className="flex flex-wrap gap-2 mb-6">
                    {item.hasHotTub && (
                      <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-forest-50 text-forest-700 font-medium">
                        <Bath className="w-3 h-3" /> Купель
                      </span>
                    )}
                    {item.hasSauna && (
                      <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-forest-50 text-forest-700 font-medium">
                        <Flame className="w-3 h-3" /> Баня
                      </span>
                    )}
                    {item.hasRiver && (
                      <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-forest-50 text-forest-700 font-medium">
                        <Waves className="w-3 h-3" /> У воды
                      </span>
                    )}
                    {item.isDogFriendly && (
                      <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-forest-50 text-forest-700 font-medium">
                        🐕 Pet-friendly
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-sand-200 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-forest-500 block">Цена за 1 ночь</span>
                    <span className="text-xl font-bold text-forest-900 font-serif">
                      {formatPrice(item.pricePerNight)}
                    </span>
                  </div>
                  <button className="px-4 py-2.5 rounded-xl bg-forest-700 hover:bg-forest-800 text-white font-medium text-xs transition-colors flex items-center gap-1.5 shadow-soft">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Забронировать
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-16 bg-forest-950 text-sand-300 py-12 border-t border-forest-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-forest-800 flex items-center justify-center text-forest-100">
              <TreePine className="w-5 h-5" />
            </div>
            <span className="font-serif text-xl font-bold text-sand-50">
              Хвоя Stay
            </span>
          </div>
          <p className="text-xs text-forest-400 text-center md:text-right">
            © 2026 Хвоя Stay. Сервис бронирования загородного эко-отдыха и глэмпингов. Все права защищены.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;
