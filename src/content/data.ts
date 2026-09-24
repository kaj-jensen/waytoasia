import type { Locale } from '../i18n';
export type CountrySlug='china'|'south-korea'|'thailand'|'vietnam'|'indonesia';
export type PriceMap={USD:number;EUR:number;DKK:number;SEK:number;NOK:number;HUF:number};
export interface Country {slug:CountrySlug; name:string; nativeName:string; code:string; hero:string; tile:string; alt:string; intro:string; regions:{name:string;copy:string}[]; practical:string[]; gallery:string[]}
export interface DailyItinerary {day:number;location:string;title:string;summary:string;activities:string[];overnight:string;meals:string;transport?:string}
export interface Tour {slug:string;country:CountrySlug;name:string;duration:number;styles:string[];prices:PriceMap;image:string;teaser:string;groupSize:string;departures:string[];includes:string[];excludes:string[];itinerary:{day:string;title:string;copy:string}[];dailyItinerary?:DailyItinerary[];tripCode?:string;journeyType?:string;route?:string[];highlights?:string[];accommodation?:{place:string;nights:string;style:string}[];transport?:string[];bestFor?:string;pace?:string;meals?:string;priceNote?:string}
export interface JourneyStyle {slug:string;label:string;eyebrow:string;description:string;image:string;idealFor:string;pace:string}
export interface Article {slug:string;country:CountrySlug;category:string;title:string;standfirst:string;image:string;published:string;readTime:string;body:string[]}

export const countries:Country[]=[
  {
    "slug": "china",
    "name": "China",
    "nativeName": "中国",
    "code": "PEK",
    "hero": "https://images.unsplash.com/photo-1508804185872-d7badad00f7d?auto=format&fit=crop&w=1800&q=84",
    "tile": "https://images.unsplash.com/photo-1718027808460-7069cf0ca9ae?auto=format&fit=crop&w=1200&q=82",
    "alt": "The Great Wall winding through green mountains",
    "intro": "Ancient dynasties and restless megacities share the same horizon. China rewards time: a tea poured slowly, a courtyard at dawn, a mountain path beyond the crowds.",
    "regions": [
      {
        "name": "Beijing",
        "copy": "Imperial scale, neighbourhood intimacy and the northern table."
      },
      {
        "name": "Yunnan",
        "copy": "Highland cultures, old tea routes and dramatic valleys."
      },
      {
        "name": "Shanghai",
        "copy": "Art deco lanes and contemporary China at full velocity."
      }
    ],
    "practical": [
      "Spring and autumn offer the gentlest weather.",
      "High-speed rail makes longer routes remarkably fluid.",
      "Visa requirements vary; we advise for each passport."
    ],
    "gallery": [
      "https://images.unsplash.com/photo-1769931676214-17ad2fe24461?auto=format&fit=crop&w=1800&q=84",
      "https://images.unsplash.com/photo-1523731407965-2430cd12f5e4?auto=format&fit=crop&w=1800&q=84",
      "https://images.unsplash.com/photo-1547981609-4b6bfe67ca0b?auto=format&fit=crop&w=1800&q=84"
    ]
  },
  {
    "slug": "south-korea",
    "name": "South Korea",
    "nativeName": "대한민국",
    "code": "ICN",
    "hero": "/images/destinations/south-korea-hero-1600.webp",
    "tile": "/images/destinations/south-korea-hero-1600.webp",
    "alt": "Traditional palace pavilions reflected in Wolji Pond, Gyeongju",
    "intro": "South Korea brings royal palaces and contemporary neighbourhoods into the same day. Follow regional food traditions, discover ancient capitals and leave time for forested mountains or the volcanic shores of Jeju.",
    "regions": [
      {
        "name": "Seoul & the heartland",
        "copy": "Palaces, design districts and living traditions in the capital and Andong."
      },
      {
        "name": "Gyeongju & Busan",
        "copy": "Silla heritage, coastal neighbourhoods and the flavours of a port city."
      },
      {
        "name": "Mountains & Jeju",
        "copy": "Seoraksan walking trails, east-coast beaches and volcanic island landscapes."
      }
    ],
    "practical": [
      "Spring and autumn suit city exploration and walking; blossom and foliage dates vary.",
      "Rail connects major cities; private road transfers reach rural areas and domestic flights serve Jeju.",
      "Summer can be hot and wet. We adapt outdoor plans to the season and local conditions."
    ],
    "gallery": [
      "https://images.unsplash.com/photo-1717346255618-1fbc136cb8f9?auto=format&fit=crop&w=1400&q=82",
      "https://images.unsplash.com/photo-1700277841528-3bb0633675f1?auto=format&fit=crop&w=1400&q=82",
      "https://images.unsplash.com/photo-1778162346658-93f92fb7904f?auto=format&fit=crop&w=1400&q=82"
    ]
  },
  {
    "slug": "thailand",
    "name": "Thailand",
    "nativeName": "ประเทศไทย",
    "code": "BKK",
    "hero": "https://images.unsplash.com/photo-1528181304800-259b08848526?auto=format&fit=crop&w=1800&q=84",
    "tile": "/images/destinations/thailand-temple-2536.jpg",
    "alt": "Golden Thai temple beneath a dramatic blue sky",
    "intro": "Thailand’s warmth is more than climate. Markets, forest temples and island mornings come together through a culture of welcome and an extraordinary food tradition.",
    "regions": [
      {
        "name": "Bangkok",
        "copy": "River life, gilded temples and some of Asia’s most vivid cooking."
      },
      {
        "name": "Chiang Mai",
        "copy": "Northern craft, mountain landscapes and Lanna heritage."
      },
      {
        "name": "The South",
        "copy": "Limestone bays and quiet islands chosen for season and character."
      }
    ],
    "practical": [
      "November to February is dry in much of the country.",
      "Domestic flights pair well with selective road and boat travel.",
      "Shoulders and knees should be covered at temples."
    ],
    "gallery": [
      "https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?auto=format&fit=crop&w=1800&q=84",
      "https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1800&q=84",
      "https://images.unsplash.com/photo-1552550018-5253c1b171e1?auto=format&fit=crop&w=1800&q=84"
    ]
  },
  {
    "slug": "vietnam",
    "name": "Vietnam",
    "nativeName": "Việt Nam",
    "code": "SGN",
    "hero": "https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1800&q=84",
    "tile": "/images/destinations/vietnam-boat-1200.jpg",
    "alt": "Travellers crossing a river by boat beneath limestone cliffs in Vietnam",
    "intro": "A long, generous country of layered history, vivid street food and landscapes that change with every latitude. Vietnam is best experienced as a rhythm, not a checklist.",
    "regions": [
      {
        "name": "Hanoi & North",
        "copy": "Lake mornings, old quarters and mountains shaped by rice terraces."
      },
      {
        "name": "Central Coast",
        "copy": "Imperial Hue, lantern-lit Hoi An and long beaches."
      },
      {
        "name": "Saigon & Delta",
        "copy": "Energy, architecture and the waterways of the Mekong."
      }
    ],
    "practical": [
      "Weather differs sharply between north, centre and south.",
      "Short flights connect regions; trains reveal the landscape.",
      "E-visas are available to many nationalities."
    ],
    "gallery": [
      "https://images.unsplash.com/photo-1521993117367-b7f70ccd029d?auto=format&fit=crop&w=1800&q=84",
      "https://images.unsplash.com/photo-1509030450996-dd1a26dda07a?auto=format&fit=crop&w=1800&q=84",
      "https://images.unsplash.com/photo-1540611025311-01df3cef54b5?auto=format&fit=crop&w=1800&q=84"
    ]
  },
  {
    "slug": "indonesia",
    "name": "Indonesia",
    "nativeName": "Indonesia",
    "code": "DPS",
    "hero": "https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1800&q=84",
    "tile": "https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1800&q=84",
    "alt": "Rice terraces glowing in morning light in Indonesia",
    "intro": "Across thousands of islands, Indonesia offers volcanic landscapes, layered spiritual traditions and coastlines that invite a slower sense of time.",
    "regions": [
      {
        "name": "Bali",
        "copy": "Ritual, craft and landscapes beyond the familiar shoreline."
      },
      {
        "name": "Java",
        "copy": "Volcano dawns, royal cities and monumental Borobudur."
      },
      {
        "name": "Komodo & Flores",
        "copy": "Elemental islands, exceptional reefs and small-ship exploration."
      }
    ],
    "practical": [
      "Dry season generally runs from April to October.",
      "Island routes combine flights, boats and private road transfers.",
      "Temple and village visits call for respectful dress."
    ],
    "gallery": [
      "https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?auto=format&fit=crop&w=1800&q=84",
      "https://images.unsplash.com/photo-1539367628448-4bc5c9d171c8?auto=format&fit=crop&w=1800&q=84",
      "https://images.unsplash.com/photo-1577717903315-1691ae25ab3f?auto=format&fit=crop&w=1800&q=84"
    ]
  }
];
export const tours:Tour[]=[
  {
    "slug": "silk-and-courtyards",
    "country": "china",
    "name": "Silk & Courtyards",
    "duration": 12,
    "route": [
      "Beijing",
      "Great Wall",
      "Dali",
      "Shaxi",
      "Yunnan"
    ],
    "styles": [
      "first-time-asia",
      "food-and-culture"
    ],
    "prices": {
      "USD": 7200,
      "EUR": 6600,
      "DKK": 49200,
      "SEK": 73800,
      "NOK": 76800,
      "HUF": 2590000
    },
    "image": "https://images.unsplash.com/photo-1668333140118-84e827fe42ca?auto=format&fit=crop&w=1400&q=82",
    "teaser": "Beijing’s hidden lanes, the Great Wall at first light and Yunnan’s old tea road.",
    "groupSize": "Private · 2–8 guests",
    "departures": [
      "Mar–May",
      "Sep–Nov"
    ],
    "includes": [
      "Private guides",
      "Boutique accommodation",
      "Internal transport",
      "Daily breakfast"
    ],
    "excludes": [
      "International flights",
      "Travel insurance"
    ],
    "itinerary": [
      {
        "day": "01–03",
        "title": "Beijing, behind the walls",
        "copy": "Settle into a courtyard hotel and explore imperial Beijing through its quieter thresholds."
      },
      {
        "day": "04–05",
        "title": "The Great Wall",
        "copy": "Walk an unrestored section at an unhurried pace and stay in a mountain village."
      },
      {
        "day": "06–12",
        "title": "The Yunnan tea road",
        "copy": "Fly south for Dali, Shaxi and village stays beneath the Himalaya."
      }
    ]
  },
  {
    "slug": "seoul-and-ancient-kingdoms",
    "name": "Seoul & Ancient Kingdoms",
    "duration": 12,
    "route": [
      "Seoul",
      "Andong",
      "Gyeongju",
      "Busan"
    ],
    "styles": [
      "first-time-asia",
      "food-and-culture"
    ],
    "prices": {
      "USD": 6200,
      "EUR": 5700,
      "DKK": 42500,
      "SEK": 63700,
      "NOK": 66300,
      "HUF": 2230000
    },
    "teaser": "Royal Seoul, the village traditions of Andong and Silla heritage, with a coastal finale in Busan.",
    "tripCode": "WTA-KR12",
    "itinerary": [
      {
        "day": "01–04",
        "title": "Seoul, past and present",
        "copy": "Explore a royal palace with a private guide, walk traditional lanes and discover the capital through markets, galleries and neighbourhood restaurants."
      },
      {
        "day": "05–06",
        "title": "Andong and Hahoe Village",
        "copy": "Travel to Andong for village architecture, local food and a slower introduction to the cultural traditions of the heartland."
      },
      {
        "day": "07–09",
        "title": "Gyeongju, the ancient capital",
        "copy": "Connect Silla history with the royal burial mounds, Bulguksa Temple and the evening reflections at Donggung Palace and Wolji Pond."
      },
      {
        "day": "10–12",
        "title": "Busan by the sea",
        "copy": "Finish among harbour markets, hillside streets and coastal walks, balancing privately guided time with an open day before departure."
      }
    ],
    "country": "south-korea",
    "groupSize": "Private · 2–6 guests",
    "departures": [
      "Apr–May",
      "Sep–Oct"
    ],
    "journeyType": "Private tailor-made journey",
    "priceNote": "Illustrative price for this sample itinerary, per person sharing. Your personal proposal confirms availability, inclusions and final pricing.",
    "includes": [
      "Selected accommodation",
      "Private arrival transfer",
      "Intercity transport described in the itinerary",
      "Private guiding on selected days",
      "Daily breakfast",
      "24-hour on-trip assistance"
    ],
    "excludes": [
      "International flights",
      "Travel insurance",
      "Meals and activities not specifically included",
      "Personal expenses"
    ],
    "pace": "Balanced with time to explore",
    "meals": "Daily breakfast",
    "image": "https://images.unsplash.com/photo-1653632445006-0ed9bbe32672?auto=format&fit=crop&w=1400&q=82",
    "dailyItinerary": [
      {
        "day": 1,
        "location": "Seoul",
        "title": "Arrive in Seoul",
        "summary": "Meet your driver and settle into a central hotel. Keep the first evening relaxed, with dining suggestions close to your base.",
        "activities": [],
        "overnight": "Seoul",
        "meals": "Daily breakfast",
        "transport": "Private vehicle"
      },
      {
        "day": 2,
        "location": "Seoul",
        "title": "Palaces and old neighbourhoods",
        "summary": "Explore Gyeongbokgung with a private guide and walk the lanes around Bukchon and Insadong. The order of visits is adjusted to palace opening days.",
        "activities": [],
        "overnight": "Seoul",
        "meals": "Daily breakfast",
        "transport": "Private guide, local transport and walking"
      },
      {
        "day": 3,
        "location": "Seoul",
        "title": "Markets and contemporary Seoul",
        "summary": "Discover a traditional market, then contrast the older city with contemporary galleries and independent shops. Restaurant suggestions reflect your interests.",
        "activities": [],
        "overnight": "Seoul",
        "meals": "Daily breakfast",
        "transport": "Local transport and walking"
      },
      {
        "day": 4,
        "location": "Seoul",
        "title": "A day to follow your interests",
        "summary": "Enjoy a free day for museums, neighbourhood cafés or a specialist experience arranged on request. Optional activities are priced separately.",
        "activities": [],
        "overnight": "Seoul",
        "meals": "Daily breakfast",
        "transport": "Independent exploration"
      },
      {
        "day": 5,
        "location": "Andong",
        "title": "Into the heartland",
        "summary": "Travel by rail to Andong and meet your driver for the local transfer. Settle into your accommodation before an introduction to regional cooking.",
        "activities": [],
        "overnight": "Andong",
        "meals": "Daily breakfast",
        "transport": "Rail and private vehicle"
      },
      {
        "day": 6,
        "location": "Andong",
        "title": "Hahoe Village",
        "summary": "Explore Hahoe Village with a guide, taking time for its architecture and riverside setting. Learn about the traditions behind the homes and village landscape.",
        "activities": [],
        "overnight": "Andong",
        "meals": "Daily breakfast",
        "transport": "Private vehicle and walking"
      },
      {
        "day": 7,
        "location": "Gyeongju",
        "title": "From village life to Silla history",
        "summary": "Continue by private road to Gyeongju. A gentle afternoon walk among the royal burial mounds introduces the former Silla capital.",
        "activities": [],
        "overnight": "Gyeongju",
        "meals": "Daily breakfast",
        "transport": "Private vehicle"
      },
      {
        "day": 8,
        "location": "Gyeongju",
        "title": "Temples and the ancient capital",
        "summary": "Visit Bulguksa Temple with a private guide and explore the city’s historical collections. Leave the late afternoon free for cafés and the lanes of Hwangnidan-gil.",
        "activities": [],
        "overnight": "Gyeongju",
        "meals": "Daily breakfast",
        "transport": "Private vehicle and walking"
      },
      {
        "day": 9,
        "location": "Gyeongju",
        "title": "Gyeongju at your own pace",
        "summary": "Spend an unhurried day exploring independently, then visit Donggung Palace and Wolji Pond in the evening when opening hours allow.",
        "activities": [],
        "overnight": "Gyeongju",
        "meals": "Daily breakfast",
        "transport": "Local transport and walking"
      },
      {
        "day": 10,
        "location": "Busan",
        "title": "Down to the coast",
        "summary": "Travel to Busan by rail with station transfers. Settle into the port city and take an easy walk beside the sea.",
        "activities": [],
        "overnight": "Busan",
        "meals": "Daily breakfast",
        "transport": "Rail and private vehicle"
      },
      {
        "day": 11,
        "location": "Busan",
        "title": "Harbour life and hillside streets",
        "summary": "Explore Busan with a private guide, combining a seafood market with hillside neighbourhoods and a coastal viewpoint. The afternoon remains flexible.",
        "activities": [],
        "overnight": "Busan",
        "meals": "Daily breakfast",
        "transport": "Private guide, local transport and walking"
      },
      {
        "day": 12,
        "location": "Busan",
        "title": "Departure or stay a little longer",
        "summary": "Your sample journey ends in Busan. Arrange departure from the city or add a rail connection to Seoul and an extra night to suit your international flights.",
        "activities": [],
        "overnight": "Departure",
        "meals": "Daily breakfast",
        "transport": "Departure arrangements in your proposal"
      }
    ]
  },
  {
    "slug": "northern-table-southern-sea",
    "country": "thailand",
    "name": "Northern Table, Southern Sea",
    "duration": 11,
    "route": [
      "Bangkok",
      "Chiang Mai",
      "Southern islands"
    ],
    "styles": [
      "food-and-culture",
      "honeymoons"
    ],
    "prices": {
      "USD": 5400,
      "EUR": 4950,
      "DKK": 36900,
      "SEK": 55300,
      "NOK": 57600,
      "HUF": 1940000
    },
    "image": "https://images.unsplash.com/photo-1524189791114-9781ece3d3ed?auto=format&fit=crop&w=1400&q=82",
    "teaser": "Bangkok kitchens, Lanna craft and an island chosen for the season.",
    "groupSize": "Private · 2–10 guests",
    "departures": [
      "Nov–Mar"
    ],
    "includes": [
      "Private guides",
      "Boutique hotels",
      "Domestic flights",
      "Food experiences"
    ],
    "excludes": [
      "International flights",
      "Travel insurance"
    ],
    "itinerary": [
      {
        "day": "01–03",
        "title": "Bangkok by river",
        "copy": "Begin on the Chao Phraya, then taste the city with a chef."
      },
      {
        "day": "04–07",
        "title": "The northern table",
        "copy": "Meet growers and makers outside Chiang Mai."
      },
      {
        "day": "08–11",
        "title": "A quieter island",
        "copy": "Fly south for a low-key beach hideaway matched to the season."
      }
    ]
  },
  {
    "slug": "vietnam-long-table",
    "country": "vietnam",
    "name": "Vietnam, Long Table",
    "duration": 13,
    "route": [
      "Hanoi",
      "Hue",
      "Hoi An",
      "Saigon",
      "Mekong"
    ],
    "styles": [
      "first-time-asia",
      "food-and-culture"
    ],
    "prices": {
      "USD": 6100,
      "EUR": 5600,
      "DKK": 41800,
      "SEK": 62500,
      "NOK": 65100,
      "HUF": 2200000
    },
    "image": "https://images.unsplash.com/photo-1750900142272-b2c6f4867c79?auto=format&fit=crop&w=1400&q=82",
    "teaser": "A culinary thread from Hanoi’s alleys to the gardens of the Mekong.",
    "groupSize": "Small group · 6–12 guests",
    "departures": [
      "Feb",
      "Mar",
      "Nov"
    ],
    "includes": [
      "Tour leader",
      "Character hotels",
      "Domestic transport",
      "Most meals"
    ],
    "excludes": [
      "International flights",
      "Travel insurance"
    ],
    "itinerary": [
      {
        "day": "01–04",
        "title": "Hanoi appetites",
        "copy": "Markets, family kitchens and a private table with a young chef."
      },
      {
        "day": "05–08",
        "title": "The central coast",
        "copy": "Hue gardens and Hoi An’s fishing villages."
      },
      {
        "day": "09–13",
        "title": "Saigon & Mekong",
        "copy": "Contemporary Saigon followed by two nights on the delta."
      }
    ]
  },
  {
    "slug": "islands-of-fire-and-water",
    "country": "indonesia",
    "name": "Islands of Fire & Water",
    "duration": 15,
    "route": [
      "Yogyakarta",
      "Borobudur",
      "Bali",
      "Komodo"
    ],
    "styles": [
      "nature-and-wildlife",
      "honeymoons"
    ],
    "prices": {
      "USD": 7900,
      "EUR": 7250,
      "DKK": 54100,
      "SEK": 80900,
      "NOK": 84400,
      "HUF": 2850000
    },
    "image": "https://images.unsplash.com/photo-1596402184320-417e7178b2cd?auto=format&fit=crop&w=1400&q=82",
    "teaser": "Temple dawns in Java, ritual Bali and a private boat through Komodo.",
    "groupSize": "Private · 2–8 guests",
    "departures": [
      "Apr–Oct"
    ],
    "includes": [
      "Private guides",
      "Boutique stays",
      "Private Komodo boat",
      "Domestic transport"
    ],
    "excludes": [
      "International flights",
      "Travel insurance"
    ],
    "itinerary": [
      {
        "day": "01–05",
        "title": "Java, monumental",
        "copy": "Yogyakarta’s arts and sunrise at Borobudur."
      },
      {
        "day": "06–10",
        "title": "Bali beyond the coast",
        "copy": "Walk water temples, valleys and artist villages."
      },
      {
        "day": "11–15",
        "title": "Komodo by sea",
        "copy": "Three nights aboard a private phinisi among wild islands."
      }
    ]
  },
  {
    "slug": "cities-gardens-and-yellow-mountains",
    "country": "china",
    "name": "Cities, Gardens & Yellow Mountains",
    "duration": 10,
    "route": [
      "Shanghai",
      "Hangzhou",
      "Huangshan"
    ],
    "styles": [
      "first-time-asia",
      "nature-and-wildlife"
    ],
    "prices": {
      "USD": 6400,
      "EUR": 5900,
      "DKK": 44000,
      "SEK": 65900,
      "NOK": 68500,
      "HUF": 2300000
    },
    "image": "https://images.unsplash.com/photo-1516608977595-3c49f7039912?auto=format&fit=crop&w=1400&q=82",
    "teaser": "Shanghai energy, Hangzhou tea country and granite peaks wrapped in cloud.",
    "departures": [
      "Mar–May",
      "Sep–Nov"
    ],
    "itinerary": [
      {
        "day": "01–03",
        "title": "Shanghai, old and new",
        "copy": "Art deco lanes, private collections and the city’s contemporary edge."
      },
      {
        "day": "04–05",
        "title": "Hangzhou tea country",
        "copy": "Walk lakeside gardens and meet growers among Longjing terraces."
      },
      {
        "day": "06–10",
        "title": "Huangshan in the clouds",
        "copy": "Travel by fast train to villages and mountain paths shaped by Chinese painting."
      }
    ],
    "groupSize": "Private · 2–8 guests",
    "includes": [
      "Personally selected accommodation",
      "Private guiding at key locations",
      "All internal transport described",
      "Daily breakfast",
      "24-hour on-trip assistance"
    ],
    "excludes": [
      "International flights",
      "Travel insurance",
      "Meals and activities not specifically stated"
    ],
    "transport": [
      "Private arrival transfer",
      "Reserved intercity transport",
      "Locally arranged transfers"
    ],
    "bestFor": "Curious travellers seeking depth",
    "pace": "Balanced with time to explore",
    "priceNote": "Per person, based on two guests sharing. Each currency is managed separately."
  },
  {
    "slug": "dynasties-and-pandas",
    "country": "china",
    "name": "Dynasties & Pandas",
    "duration": 11,
    "route": [
      "Xi’an",
      "Chengdu",
      "Lijiang"
    ],
    "styles": [
      "food-and-culture",
      "first-time-asia"
    ],
    "prices": {
      "USD": 6800,
      "EUR": 6250,
      "DKK": 46600,
      "SEK": 69800,
      "NOK": 72600,
      "HUF": 2440000
    },
    "image": "https://images.unsplash.com/photo-1617470464957-55fc5a6f2894?auto=format&fit=crop&w=1400&q=82",
    "teaser": "Imperial Xi’an, Chengdu’s teahouses and the highland lanes of Lijiang.",
    "departures": [
      "Apr–Jun",
      "Sep–Oct"
    ],
    "itinerary": [
      {
        "day": "01–03",
        "title": "Xi’an and the old capital",
        "copy": "Cycle the city walls and place the Terracotta Army in its wider landscape."
      },
      {
        "day": "04–07",
        "title": "Chengdu at table",
        "copy": "Panda conservation, neighbourhood teahouses and a private Sichuan kitchen."
      },
      {
        "day": "08–11",
        "title": "Lijiang highlands",
        "copy": "Stone villages, Naxi culture and mountain horizons in northwest Yunnan."
      }
    ],
    "groupSize": "Private · 2–8 guests",
    "includes": [
      "Personally selected accommodation",
      "Private guiding at key locations",
      "All internal transport described",
      "Daily breakfast",
      "24-hour on-trip assistance"
    ],
    "excludes": [
      "International flights",
      "Travel insurance",
      "Meals and activities not specifically stated"
    ],
    "transport": [
      "Private arrival transfer",
      "Reserved intercity transport",
      "Locally arranged transfers"
    ],
    "bestFor": "Curious travellers seeking depth",
    "pace": "Balanced with time to explore",
    "priceNote": "Per person, based on two guests sharing. Each currency is managed separately."
  },
  {
    "slug": "rivers-and-rice-terraces",
    "country": "china",
    "name": "Rivers & Rice Terraces",
    "duration": 9,
    "route": [
      "Guilin",
      "Yangshuo",
      "Longji"
    ],
    "styles": [
      "nature-and-wildlife",
      "food-and-culture"
    ],
    "prices": {
      "USD": 5100,
      "EUR": 4700,
      "DKK": 35000,
      "SEK": 52300,
      "NOK": 54400,
      "HUF": 1830000
    },
    "image": "/images/tours/china-rivers-river-woman-2400.jpg",
    "teaser": "Karst rivers, village kitchens and the sculpted hillsides of Longji.",
    "departures": [
      "Apr–Jun",
      "Sep–Nov"
    ],
    "itinerary": [
      {
        "day": "01–02",
        "title": "Guilin’s waterways",
        "copy": "Arrive among limestone silhouettes and explore quiet city lakes."
      },
      {
        "day": "03–06",
        "title": "Yangshuo by river",
        "copy": "Cycle country lanes and take a private boat beyond the busiest reaches."
      },
      {
        "day": "07–09",
        "title": "Longji terraces",
        "copy": "Stay above the rice fields and walk between mountain communities."
      }
    ],
    "groupSize": "Private · 2–8 guests",
    "includes": [
      "Personally selected accommodation",
      "Private guiding at key locations",
      "All internal transport described",
      "Daily breakfast",
      "24-hour on-trip assistance"
    ],
    "excludes": [
      "International flights",
      "Travel insurance",
      "Meals and activities not specifically stated"
    ],
    "transport": [
      "Private arrival transfer",
      "Reserved intercity transport",
      "Locally arranged transfers"
    ],
    "bestFor": "Curious travellers seeking depth",
    "pace": "Balanced with time to explore",
    "priceNote": "Per person, based on two guests sharing. Each currency is managed separately."
  },
  {
    "slug": "korea-at-the-table",
    "name": "Korea at the Table",
    "duration": 10,
    "route": [
      "Seoul",
      "Jeonju",
      "Gwangju",
      "Busan"
    ],
    "styles": [
      "food-and-culture"
    ],
    "prices": {
      "USD": 5400,
      "EUR": 4950,
      "DKK": 36900,
      "SEK": 55300,
      "NOK": 57600,
      "HUF": 1940000
    },
    "teaser": "From Seoul market kitchens to Jeonju bibimbap, the flavours of Jeolla and Busan seafood.",
    "tripCode": "WTA-KR10F",
    "itinerary": [
      {
        "day": "01–03",
        "title": "Seoul through its kitchens",
        "copy": "Taste your way through a traditional market with a local guide, then explore neighbourhood dining and contemporary food culture."
      },
      {
        "day": "04–05",
        "title": "Jeonju, food and hanok lanes",
        "copy": "Travel by rail to Jeonju for bibimbap, traditional architecture and a guided introduction to the ingredients and customs behind the meal."
      },
      {
        "day": "06–07",
        "title": "Gwangju and the Jeolla table",
        "copy": "Continue south by private road for regional cooking and the art, architecture and small businesses of Yangnim-dong."
      },
      {
        "day": "08–10",
        "title": "Busan, a port at the table",
        "copy": "Cross to Busan by private road. Explore the seafood markets with a guide and leave room for a coastal walk and independent dining."
      }
    ],
    "country": "south-korea",
    "groupSize": "Private · 2–6 guests",
    "departures": [
      "Apr–May",
      "Sep–Oct"
    ],
    "journeyType": "Private tailor-made journey",
    "priceNote": "Illustrative price for this sample itinerary, per person sharing. Your personal proposal confirms availability, inclusions and final pricing.",
    "includes": [
      "Selected accommodation",
      "Private arrival transfer",
      "Intercity transport described in the itinerary",
      "Private guiding on selected days",
      "Daily breakfast",
      "24-hour on-trip assistance"
    ],
    "excludes": [
      "International flights",
      "Travel insurance",
      "Meals and activities not specifically included",
      "Personal expenses"
    ],
    "pace": "Balanced with time to explore",
    "meals": "Daily breakfast",
    "image": "https://images.unsplash.com/photo-1661366394743-fe30fe478ef7?auto=format&fit=crop&w=1400&q=82"
  },
  {
    "slug": "mountains-and-east-sea",
    "name": "Mountains & the East Sea",
    "duration": 9,
    "route": [
      "Seoul",
      "Sokcho",
      "Seoraksan",
      "Gangneung"
    ],
    "styles": [
      "nature-and-wildlife",
      "food-and-culture"
    ],
    "prices": {
      "USD": 4800,
      "EUR": 4400,
      "DKK": 32800,
      "SEK": 49200,
      "NOK": 51100,
      "HUF": 1720000
    },
    "teaser": "A short Seoul introduction, forest trails beneath Seoraksan and unhurried days on the east coast.",
    "tripCode": "WTA-KR09N",
    "itinerary": [
      {
        "day": "01–02",
        "title": "Seoul at an easy pace",
        "copy": "Settle into the capital with a privately guided neighbourhood walk and time to recover from the flight."
      },
      {
        "day": "03–06",
        "title": "Sokcho and Seoraksan",
        "copy": "Travel by private road to a Sokcho base. Spend two days exploring Seoraksan on trails chosen for your fitness and the conditions, with market visits between walks."
      },
      {
        "day": "07–09",
        "title": "Gangneung and the coast",
        "copy": "Continue along the coast for beaches, pine-fringed paths and coffee culture. Return to Seoul by rail on the final day; an extra airport night can be arranged."
      }
    ],
    "country": "south-korea",
    "groupSize": "Private · 2–6 guests",
    "departures": [
      "Apr–May",
      "Sep–Oct"
    ],
    "journeyType": "Private tailor-made journey",
    "priceNote": "Illustrative price for this sample itinerary, per person sharing. Your personal proposal confirms availability, inclusions and final pricing.",
    "includes": [
      "Selected accommodation",
      "Private arrival transfer",
      "Intercity transport described in the itinerary",
      "Private guiding on selected days",
      "Daily breakfast",
      "24-hour on-trip assistance"
    ],
    "excludes": [
      "International flights",
      "Travel insurance",
      "Meals and activities not specifically included",
      "Personal expenses"
    ],
    "pace": "Balanced with time to explore",
    "meals": "Daily breakfast",
    "image": "https://images.unsplash.com/photo-1700061291361-b8aa1f40abb8?auto=format&fit=crop&w=1400&q=82"
  },
  {
    "slug": "seoul-and-jeju-slowly",
    "name": "Seoul & Jeju, Slowly",
    "duration": 10,
    "route": [
      "Seoul",
      "Jeju City",
      "Seogwipo"
    ],
    "styles": [
      "honeymoons",
      "nature-and-wildlife"
    ],
    "prices": {
      "USD": 5900,
      "EUR": 5400,
      "DKK": 40300,
      "SEK": 60400,
      "NOK": 62800,
      "HUF": 2110000
    },
    "teaser": "Seoul neighbourhoods and design, followed by volcanic landscapes and coastal breathing space on Jeju.",
    "tripCode": "WTA-KR10J",
    "itinerary": [
      {
        "day": "01–03",
        "title": "Seoul, design and discovery",
        "copy": "Pair a privately guided palace and neighbourhood day with independent time for galleries, shops and restaurants."
      },
      {
        "day": "04–06",
        "title": "Northern Jeju and island life",
        "copy": "Fly to Jeju and settle into the northern side of the island. Explore volcanic shores and learn about island life, with private transport for selected visits."
      },
      {
        "day": "07–10",
        "title": "Seogwipo and the southern coast",
        "copy": "Move south for coastal walks, waterfalls and a flexible day to relax. An eastern island excursion can include Seongsan, weather permitting. Fly back to Seoul on the final day; onward flights are planned with a suitable buffer."
      }
    ],
    "country": "south-korea",
    "groupSize": "Private · 2–6 guests",
    "departures": [
      "Apr–May",
      "Sep–Oct"
    ],
    "journeyType": "Private tailor-made journey",
    "priceNote": "Illustrative price for this sample itinerary, per person sharing. Your personal proposal confirms availability, inclusions and final pricing.",
    "includes": [
      "Selected accommodation",
      "Private arrival transfer",
      "Intercity transport described in the itinerary",
      "Private guiding on selected days",
      "Daily breakfast",
      "24-hour on-trip assistance"
    ],
    "excludes": [
      "International flights",
      "Travel insurance",
      "Meals and activities not specifically included",
      "Personal expenses"
    ],
    "pace": "Balanced with time to explore",
    "meals": "Daily breakfast",
    "image": "https://images.unsplash.com/photo-1622209018972-097984086b0b?auto=format&fit=crop&w=1400&q=82"
  },
  {
    "slug": "kingdoms-of-siam",
    "country": "thailand",
    "name": "Kingdoms of Siam",
    "duration": 10,
    "route": [
      "Bangkok",
      "Ayutthaya",
      "Sukhothai",
      "Chiang Mai"
    ],
    "styles": [
      "first-time-asia",
      "food-and-culture"
    ],
    "prices": {
      "USD": 4900,
      "EUR": 4500,
      "DKK": 33600,
      "SEK": 50400,
      "NOK": 52400,
      "HUF": 1760000
    },
    "image": "https://images.unsplash.com/photo-1576311510484-ab9fbdb2a47e?auto=format&fit=crop&w=1400&q=82",
    "teaser": "Follow Thailand’s former capitals north from Bangkok to Chiang Mai.",
    "departures": [
      "Nov–Feb"
    ],
    "itinerary": [
      {
        "day": "01–03",
        "title": "Bangkok by river",
        "copy": "Canals, kitchens and royal history introduced with a private guide."
      },
      {
        "day": "04–06",
        "title": "Ayutthaya & Sukhothai",
        "copy": "Travel north through two former capitals with evenings after day visitors leave."
      },
      {
        "day": "07–10",
        "title": "Chiang Mai",
        "copy": "Lanna craft, forest temples and a day with growers outside the city."
      }
    ],
    "groupSize": "Private · 2–8 guests",
    "includes": [
      "Personally selected accommodation",
      "Private guiding at key locations",
      "All internal transport described",
      "Daily breakfast",
      "24-hour on-trip assistance"
    ],
    "excludes": [
      "International flights",
      "Travel insurance",
      "Meals and activities not specifically stated"
    ],
    "transport": [
      "Private arrival transfer",
      "Reserved intercity transport",
      "Locally arranged transfers"
    ],
    "bestFor": "Curious travellers seeking depth",
    "pace": "Balanced with time to explore",
    "priceNote": "Per person, based on two guests sharing. Each currency is managed separately."
  },
  {
    "slug": "jungle-to-andaman",
    "country": "thailand",
    "name": "Jungle to Andaman",
    "duration": 9,
    "route": [
      "Bangkok",
      "Khao Sok",
      "Koh Yao Noi"
    ],
    "styles": [
      "nature-and-wildlife",
      "honeymoons"
    ],
    "prices": {
      "USD": 5600,
      "EUR": 5150,
      "DKK": 38400,
      "SEK": 57500,
      "NOK": 59900,
      "HUF": 2010000
    },
    "image": "https://images.unsplash.com/photo-1578157693553-69118df519ed?auto=format&fit=crop&w=1400&q=82",
    "teaser": "City energy, rainforest stillness and a low-key island in Phang Nga Bay.",
    "departures": [
      "Dec–Apr"
    ],
    "itinerary": [
      {
        "day": "01–02",
        "title": "Bangkok arrival",
        "copy": "A soft landing with a riverside base and one privately guided evening."
      },
      {
        "day": "03–05",
        "title": "Khao Sok rainforest",
        "copy": "Stay beside the forest and travel onto Cheow Lan Lake with a naturalist."
      },
      {
        "day": "06–09",
        "title": "Koh Yao Noi",
        "copy": "Finish among fishing villages, limestone horizons and quiet beaches."
      }
    ],
    "groupSize": "Private · 2–8 guests",
    "includes": [
      "Personally selected accommodation",
      "Private guiding at key locations",
      "All internal transport described",
      "Daily breakfast",
      "24-hour on-trip assistance"
    ],
    "excludes": [
      "International flights",
      "Travel insurance",
      "Meals and activities not specifically stated"
    ],
    "transport": [
      "Private arrival transfer",
      "Reserved intercity transport",
      "Locally arranged transfers"
    ],
    "bestFor": "Curious travellers seeking depth",
    "pace": "Balanced with time to explore",
    "priceNote": "Per person, based on two guests sharing. Each currency is managed separately."
  },
  {
    "slug": "northern-thailand-slowly",
    "country": "thailand",
    "name": "Northern Thailand, Slowly",
    "duration": 8,
    "route": [
      "Chiang Rai",
      "Golden Triangle",
      "Chiang Mai"
    ],
    "styles": [
      "food-and-culture",
      "nature-and-wildlife"
    ],
    "prices": {
      "USD": 4300,
      "EUR": 3950,
      "DKK": 29500,
      "SEK": 44200,
      "NOK": 46000,
      "HUF": 1540000
    },
    "image": "https://images.unsplash.com/photo-1671188893377-ee825a53d27f?auto=format&fit=crop&w=1400&q=82",
    "teaser": "Mountain roads, tea gardens and the living craft traditions of the north.",
    "departures": [
      "Nov–Feb"
    ],
    "itinerary": [
      {
        "day": "01–02",
        "title": "Chiang Rai",
        "copy": "Contemporary art, local markets and a countryside base."
      },
      {
        "day": "03–04",
        "title": "Golden Triangle highlands",
        "copy": "Meet tea growers and explore border landscapes with careful local context."
      },
      {
        "day": "05–08",
        "title": "Chiang Mai workshops",
        "copy": "Travel overland to makers, cooks and forest communities around Chiang Mai."
      }
    ],
    "groupSize": "Private · 2–8 guests",
    "includes": [
      "Personally selected accommodation",
      "Private guiding at key locations",
      "All internal transport described",
      "Daily breakfast",
      "24-hour on-trip assistance"
    ],
    "excludes": [
      "International flights",
      "Travel insurance",
      "Meals and activities not specifically stated"
    ],
    "transport": [
      "Private arrival transfer",
      "Reserved intercity transport",
      "Locally arranged transfers"
    ],
    "bestFor": "Curious travellers seeking depth",
    "pace": "Balanced with time to explore",
    "priceNote": "Per person, based on two guests sharing. Each currency is managed separately."
  },
  {
    "slug": "northern-vietnam-unfolded",
    "country": "vietnam",
    "name": "Northern Vietnam Unfolded",
    "duration": 9,
    "route": [
      "Hanoi",
      "Ninh Binh",
      "Ha Long"
    ],
    "styles": [
      "first-time-asia",
      "nature-and-wildlife"
    ],
    "prices": {
      "USD": 4700,
      "EUR": 4300,
      "DKK": 32100,
      "SEK": 48100,
      "NOK": 50100,
      "HUF": 1680000
    },
    "image": "https://images.unsplash.com/photo-1557750255-c76072a7aad1?auto=format&fit=crop&w=1400&q=82",
    "teaser": "Hanoi street life, limestone valleys and an intimate sailing on Lan Ha Bay.",
    "departures": [
      "Feb–Apr",
      "Oct–Nov"
    ],
    "itinerary": [
      {
        "day": "01–03",
        "title": "Hanoi in detail",
        "copy": "Walk the old quarter with specialists in food, craft and modern history."
      },
      {
        "day": "04–06",
        "title": "Ninh Binh valleys",
        "copy": "Cycle between karst peaks and stay beside the rice fields."
      },
      {
        "day": "07–09",
        "title": "Lan Ha Bay",
        "copy": "Board a small vessel for quieter coves, kayaking and a night on the water."
      }
    ],
    "groupSize": "Private · 2–8 guests",
    "includes": [
      "Personally selected accommodation",
      "Private guiding at key locations",
      "All internal transport described",
      "Daily breakfast",
      "24-hour on-trip assistance"
    ],
    "excludes": [
      "International flights",
      "Travel insurance",
      "Meals and activities not specifically stated"
    ],
    "transport": [
      "Private arrival transfer",
      "Reserved intercity transport",
      "Locally arranged transfers"
    ],
    "bestFor": "Curious travellers seeking depth",
    "pace": "Balanced with time to explore",
    "priceNote": "Per person, based on two guests sharing. Each currency is managed separately."
  },
  {
    "slug": "central-coast-by-rail",
    "country": "vietnam",
    "name": "Central Coast by Rail",
    "duration": 10,
    "route": [
      "Hue",
      "Hoi An",
      "Quy Nhon",
      "Nha Trang"
    ],
    "styles": [
      "food-and-culture",
      "honeymoons"
    ],
    "prices": {
      "USD": 5200,
      "EUR": 4800,
      "DKK": 35800,
      "SEK": 53600,
      "NOK": 55800,
      "HUF": 1870000
    },
    "image": "https://images.unsplash.com/photo-1728012046416-a04bcd94b832?auto=format&fit=crop&w=1400&q=82",
    "teaser": "Imperial gardens, fishing villages and a graceful rail journey down the coast.",
    "departures": [
      "Feb–Aug"
    ],
    "itinerary": [
      {
        "day": "01–03",
        "title": "Hue gardens",
        "copy": "Explore imperial history through private homes, garden houses and regional cooking."
      },
      {
        "day": "04–06",
        "title": "Hoi An hinterland",
        "copy": "Balance the old town with farms, waterways and a quiet coastal stay."
      },
      {
        "day": "07–10",
        "title": "Quy Nhon to Nha Trang",
        "copy": "Ride one of Vietnam’s most scenic rail sections with carefully chosen beach stops."
      }
    ],
    "groupSize": "Private · 2–8 guests",
    "includes": [
      "Personally selected accommodation",
      "Private guiding at key locations",
      "All internal transport described",
      "Daily breakfast",
      "24-hour on-trip assistance"
    ],
    "excludes": [
      "International flights",
      "Travel insurance",
      "Meals and activities not specifically stated"
    ],
    "transport": [
      "Private arrival transfer",
      "Reserved intercity transport",
      "Locally arranged transfers"
    ],
    "bestFor": "Curious travellers seeking depth",
    "pace": "Balanced with time to explore",
    "priceNote": "Per person, based on two guests sharing. Each currency is managed separately."
  },
  {
    "slug": "mekong-deep-south",
    "country": "vietnam",
    "name": "Mekong, Deep South",
    "duration": 8,
    "route": [
      "Saigon",
      "Can Tho",
      "Chau Doc"
    ],
    "styles": [
      "food-and-culture",
      "first-time-asia"
    ],
    "prices": {
      "USD": 4200,
      "EUR": 3850,
      "DKK": 28700,
      "SEK": 43100,
      "NOK": 44900,
      "HUF": 1500000
    },
    "image": "https://images.unsplash.com/photo-1624937195771-358add2e0d9d?auto=format&fit=crop&w=1400&q=82",
    "teaser": "Contemporary Saigon gives way to orchards, river towns and borderland stories.",
    "departures": [
      "Dec–Apr"
    ],
    "itinerary": [
      {
        "day": "01–03",
        "title": "Saigon perspectives",
        "copy": "Architecture, independent galleries and an evening with a local food specialist."
      },
      {
        "day": "04–06",
        "title": "Can Tho waterways",
        "copy": "Travel by private road and boat to gardens, workshops and family tables."
      },
      {
        "day": "07–08",
        "title": "Chau Doc borderlands",
        "copy": "Explore floating communities and sacred sites beneath Sam Mountain."
      }
    ],
    "groupSize": "Private · 2–8 guests",
    "includes": [
      "Personally selected accommodation",
      "Private guiding at key locations",
      "All internal transport described",
      "Daily breakfast",
      "24-hour on-trip assistance"
    ],
    "excludes": [
      "International flights",
      "Travel insurance",
      "Meals and activities not specifically stated"
    ],
    "transport": [
      "Private arrival transfer",
      "Reserved intercity transport",
      "Locally arranged transfers"
    ],
    "bestFor": "Curious travellers seeking depth",
    "pace": "Balanced with time to explore",
    "priceNote": "Per person, based on two guests sharing. Each currency is managed separately."
  },
  {
    "slug": "java-volcano-line",
    "country": "indonesia",
    "name": "Java’s Volcano Line",
    "duration": 12,
    "route": [
      "Jakarta",
      "Yogyakarta",
      "Bromo",
      "Ijen"
    ],
    "styles": [
      "nature-and-wildlife",
      "food-and-culture"
    ],
    "prices": {
      "USD": 6300,
      "EUR": 5800,
      "DKK": 43300,
      "SEK": 64800,
      "NOK": 67400,
      "HUF": 2260000
    },
    "image": "https://images.unsplash.com/photo-1661129569909-cb5a1612542a?auto=format&fit=crop&w=1400&q=82",
    "teaser": "Railways, royal cities and a dramatic overland route between Java’s volcanoes.",
    "departures": [
      "Apr–Oct"
    ],
    "itinerary": [
      {
        "day": "01–02",
        "title": "Jakarta layers",
        "copy": "Colonial traces, contemporary culture and an introduction to Javanese food."
      },
      {
        "day": "03–06",
        "title": "Yogyakarta & Borobudur",
        "copy": "Royal arts, village workshops and monument visits at considered times."
      },
      {
        "day": "07–12",
        "title": "Bromo to Ijen",
        "copy": "Cross East Java by rail and private road for two distinct volcanic landscapes."
      }
    ],
    "groupSize": "Private · 2–8 guests",
    "includes": [
      "Personally selected accommodation",
      "Private guiding at key locations",
      "All internal transport described",
      "Daily breakfast",
      "24-hour on-trip assistance"
    ],
    "excludes": [
      "International flights",
      "Travel insurance",
      "Meals and activities not specifically stated"
    ],
    "transport": [
      "Private arrival transfer",
      "Reserved intercity transport",
      "Locally arranged transfers"
    ],
    "bestFor": "Curious travellers seeking depth",
    "pace": "Balanced with time to explore",
    "priceNote": "Per person, based on two guests sharing. Each currency is managed separately."
  },
  {
    "slug": "bali-beyond-the-obvious",
    "country": "indonesia",
    "name": "Bali Beyond the Obvious",
    "duration": 10,
    "route": [
      "Ubud",
      "Sidemen",
      "Munduk",
      "Sanur"
    ],
    "styles": [
      "food-and-culture",
      "honeymoons"
    ],
    "prices": {
      "USD": 5500,
      "EUR": 5050,
      "DKK": 37700,
      "SEK": 56500,
      "NOK": 58800,
      "HUF": 1970000
    },
    "image": "https://images.unsplash.com/photo-1682406187130-84561b4e0e78?auto=format&fit=crop&w=1400&q=82",
    "teaser": "Artist-led Ubud, Sidemen rice country and the cooler landscapes of Munduk.",
    "departures": [
      "Apr–Oct"
    ],
    "itinerary": [
      {
        "day": "01–03",
        "title": "Ubud with context",
        "copy": "Meet working artists and explore temple landscapes beyond the centre."
      },
      {
        "day": "04–07",
        "title": "Sidemen & Munduk",
        "copy": "Walk rice terraces, visit growers and stay in two quieter hill regions."
      },
      {
        "day": "08–10",
        "title": "Sanur exhale",
        "copy": "Finish beside the sea with flexible days and thoughtful dining suggestions."
      }
    ],
    "groupSize": "Private · 2–8 guests",
    "includes": [
      "Personally selected accommodation",
      "Private guiding at key locations",
      "All internal transport described",
      "Daily breakfast",
      "24-hour on-trip assistance"
    ],
    "excludes": [
      "International flights",
      "Travel insurance",
      "Meals and activities not specifically stated"
    ],
    "transport": [
      "Private arrival transfer",
      "Reserved intercity transport",
      "Locally arranged transfers"
    ],
    "bestFor": "Curious travellers seeking depth",
    "pace": "Balanced with time to explore",
    "priceNote": "Per person, based on two guests sharing. Each currency is managed separately."
  },
  {
    "slug": "flores-komodo-expedition",
    "country": "indonesia",
    "name": "Flores & Komodo Expedition",
    "duration": 9,
    "route": [
      "Labuan Bajo",
      "Komodo",
      "Flores"
    ],
    "styles": [
      "nature-and-wildlife",
      "honeymoons"
    ],
    "prices": {
      "USD": 6900,
      "EUR": 6350,
      "DKK": 47400,
      "SEK": 70900,
      "NOK": 73800,
      "HUF": 2490000
    },
    "image": "https://images.unsplash.com/photo-1736523076168-fdda4640f1d8?auto=format&fit=crop&w=1400&q=82",
    "teaser": "A private phinisi, dragon country and an overland finale across Flores.",
    "departures": [
      "May–Oct"
    ],
    "itinerary": [
      {
        "day": "01–02",
        "title": "Labuan Bajo",
        "copy": "Settle into the harbour town and prepare for the voyage with your expedition team."
      },
      {
        "day": "03–06",
        "title": "Komodo by private boat",
        "copy": "Sail between ranger-led walks, reefs and anchorages chosen for conditions."
      },
      {
        "day": "07–09",
        "title": "Flores interior",
        "copy": "Continue overland to highland villages and volcanic lakes."
      }
    ],
    "groupSize": "Private · 2–8 guests",
    "includes": [
      "Personally selected accommodation",
      "Private guiding at key locations",
      "All internal transport described",
      "Daily breakfast",
      "24-hour on-trip assistance"
    ],
    "excludes": [
      "International flights",
      "Travel insurance",
      "Meals and activities not specifically stated"
    ],
    "transport": [
      "Private arrival transfer",
      "Reserved intercity transport",
      "Locally arranged transfers"
    ],
    "bestFor": "Curious travellers seeking depth",
    "pace": "Balanced with time to explore",
    "priceNote": "Per person, based on two guests sharing. Each currency is managed separately."
  }
];
export const journeyStyles:JourneyStyle[]=[
  {
    "slug": "first-time-asia",
    "label": "First journeys",
    "eyebrow": "A confident beginning",
    "description": "Landmark places balanced with quieter encounters, designed for travellers discovering Asia for the first time.",
    "image": "https://images.unsplash.com/photo-1652172176427-b1f9ae5153f9?auto=format&fit=crop&w=1400&q=82",
    "idealFor": "First-time visitors",
    "pace": "Balanced"
  },
  {
    "slug": "food-and-culture",
    "label": "Food & culture",
    "eyebrow": "Follow the table",
    "description": "Market mornings, family kitchens, design studios and traditions understood through the people keeping them alive.",
    "image": "https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?auto=format&fit=crop&w=1200&q=84",
    "idealFor": "Curious eaters",
    "pace": "Immersive"
  },
  {
    "slug": "nature-and-wildlife",
    "label": "Nature & wild places",
    "eyebrow": "Beyond the cities",
    "description": "Volcanic islands, highland trails, forest lodges and coastlines selected for season, access and conservation.",
    "image": "https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?auto=format&fit=crop&w=1200&q=84",
    "idealFor": "Active travellers",
    "pace": "Adventurous"
  },
  {
    "slug": "honeymoons",
    "label": "Private celebrations",
    "eyebrow": "A journey with meaning",
    "description": "Beautiful stays, private access and unhurried days composed around honeymoons, anniversaries and family milestones.",
    "image": "https://images.unsplash.com/photo-1539367628448-4bc5c9d171c8?auto=format&fit=crop&w=1200&q=84",
    "idealFor": "Couples & families",
    "pace": "Unhurried"
  }
];
export const articles:Article[]=[
  {
    "slug": "when-to-travel-south-korea",
    "country": "south-korea",
    "category": "Seasons",
    "title": "South Korea, season by season",
    "standfirst": "Plan around the route: city walks, mountain colour and Jeju’s coastal landscapes each have their own rhythm.",
    "image": "https://images.unsplash.com/photo-1741311961567-da87b811faae?auto=format&fit=crop&w=1400&q=82",
    "published": "2026-09-17",
    "readTime": "3 min",
    "body": [
      "Spring and autumn are appealing starting points for a first journey through South Korea. Comfortable walking weather often suits the cities, while blossom and autumn colour bring extra interest. Exact timing changes by region and year.",
      "Summer can be hot, humid and rainy, so outdoor plans need flexibility. Winter brings a different atmosphere, with cold mainland weather and generally milder conditions on Jeju. Mountain access and walking plans should always reflect local conditions.",
      "Choose your dates around the experiences that matter most, then leave room for weather and public holidays. We build the itinerary around the season rather than promising blossom, clear skies or a particular trail."
    ]
  },
  {
    "slug": "hanok-stays-with-confidence",
    "country": "south-korea",
    "category": "Culture",
    "title": "Staying in a hanok",
    "standfirst": "Traditional Korean architecture can be a memorable part of the journey. Choose the room and comfort level as carefully as the setting.",
    "image": "https://images.unsplash.com/photo-1653230675261-fe00bde32c8e?auto=format&fit=crop&w=1400&q=82",
    "published": "2026-09-17",
    "readTime": "3 min",
    "body": [
      "A hanok is a traditional Korean house. Some have been adapted as guest accommodation, offering a closer experience of timber architecture, tiled roofs and enclosed courtyards. The style and facilities vary considerably.",
      "Ask about the sleeping arrangement before booking: some rooms use floor bedding, while others have beds. Private bathrooms, steps and luggage access also deserve attention, particularly if mobility or comfort is a priority.",
      "A well-chosen hanok stay can complement city hotels without turning every night into an experiment. Your proposal confirms the named property, room type and facilities before you commit."
    ]
  },
  {
    "slug": "slow-route-northern-vietnam",
    "country": "vietnam",
    "category": "Routes",
    "title": "A slower route through northern Vietnam",
    "standfirst": "Beyond Hanoi, limestone valleys, village markets and mountain roads make a compelling case for travelling overland.",
    "image": "https://images.unsplash.com/photo-1509030450996-dd1a26dda07a?auto=format&fit=crop&w=1500&q=84",
    "published": "2026-08-04",
    "readTime": "8 min",
    "body": [
      "Northern Vietnam is best understood as a gradual change of scale. Hanoi gives way to river plains, karst valleys and roads that climb toward cooler highlands.",
      "Private road travel creates room for unscheduled stops and smaller stays. We balance the visual drama of the landscape with time in villages where tourism supports local enterprise without turning daily life into a performance.",
      "Four or five nights beyond Hanoi allow the route to breathe. Add more if walking, photography or market days are central to the journey."
    ]
  }
];
export function getCountry(slug:string){return countries.find(c=>c.slug===slug)}
export function getTour(country:string,slug:string){return tours.find(t=>t.country===country&&t.slug===slug)}
export const currencyForLocale:Record<Locale,keyof PriceMap>={en:'USD',es:'EUR',it:'EUR',fr:'EUR',nl:'EUR',hu:'HUF',sv:'SEK',da:'DKK',no:'NOK'};
