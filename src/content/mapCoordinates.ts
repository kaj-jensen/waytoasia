/** WGS84 [longitude, latitude], rounded for itinerary-scale cartography.
 * City/landmark centres, not hotel or pickup locations. Regional stops use the
 * representative location in `note`; never treat these as precise bookings.
 * Reference gazetteers: https://www.geonames.org/ and https://www.wikidata.org/.
 */
export type CountryKey = 'china' | 'south-korea' | 'thailand' | 'vietnam' | 'indonesia';
export type MapPlace = {coordinates:[number,number]; note?:string};
const point=(longitude:number,latitude:number,note?:string):MapPlace=>({coordinates:[longitude,latitude],note});
export const mapCountries={
  china:{id:'156',label:'CHINA',native:'中国'},
  'south-korea':{id:'410',label:'SOUTH KOREA',native:'대한민국'},
  thailand:{id:'764',label:'THAILAND',native:'ประเทศไทย'},
  vietnam:{id:'704',label:'VIETNAM',native:'Việt Nam'},
  indonesia:{id:'360',label:'INDONESIA',native:'Indonesia'},
};
export const mapPlaces:Record<CountryKey,Record<string,MapPlace>>={
  thailand:{
    Bangkok:point(100.5014,13.7540),Ayutthaya:point(100.567,14.357),
    Sukhothai:point(99.704,17.007,'Historical park'),
    'Chiang Mai':point(98.985,18.7904),'Chiang Rai':point(99.833,19.910),
    'Golden Triangle':point(100.083,20.353,'Sop Ruak, Thailand'),
    'Khao Sok':point(98.529,8.915,'National park visitor centre'),
    'Koh Yao Noi':point(98.596,8.117),
    'Southern islands':point(98.596,8.117,'Representative location: Koh Yao Noi; island stay varies'),
  },
  'south-korea':{
    Seoul:point(126.978,37.5665),Andong:point(128.729,36.5684),
    Gyeongju:point(129.2247,35.8562),Busan:point(129.0756,35.1796),
    Jeonju:point(127.148,35.8242),Gwangju:point(126.8526,35.1595),
    Sokcho:point(128.5918,38.2070),Seoraksan:point(128.489,38.173,'Seoraksan visitor area; walks vary with conditions'),
    Gangneung:point(128.8761,37.7519),'Jeju City':point(126.5312,33.4996),Seogwipo:point(126.560,33.2541),
  },
  china:{
    Beijing:point(116.407,39.904),'Great Wall':point(117.242,40.684,'Representative section: Jinshanling'),
    Dali:point(100.165,25.696,'Dali old town'),Shaxi:point(99.849,26.320,'Shaxi old town, Yunnan'),
    Yunnan:point(100.233,26.872,'Representative tea-road location: Lijiang; village stays vary'),
    Shanghai:point(121.474,31.230),Hangzhou:point(120.155,30.274),
    Huangshan:point(118.166,30.133,'Huangshan scenic area'),
    'Xi’an':point(108.940,34.341),Chengdu:point(104.067,30.572),Lijiang:point(100.233,26.872),
    Guilin:point(110.290,25.274),Yangshuo:point(110.496,24.778),
    Longji:point(110.118,25.759,'Longji rice terraces, Ping’an'),
  },
  vietnam:{
    Hanoi:point(105.834,21.028),Hue:point(107.590,16.463),'Hoi An':point(108.338,15.880),
    Saigon:point(106.630,10.823),Mekong:point(105.746,10.045,'Representative delta location: Can Tho'),
    'Ninh Binh':point(105.975,20.250),'Ha Long':point(107.080,20.951),
    'Quy Nhon':point(109.219,13.783),'Nha Trang':point(109.197,12.239),
    'Can Tho':point(105.746,10.045),'Chau Doc':point(105.118,10.706),
  },
  indonesia:{
    Yogyakarta:point(110.370,-7.795),Borobudur:point(110.204,-7.608),
    Bali:point(115.262,-8.506,'Representative location: Ubud; stays vary'),
    Komodo:point(119.490,-8.550,'Komodo Island'),Jakarta:point(106.846,-6.208),
    Bromo:point(112.950,-7.942),Ijen:point(114.242,-8.058),
    Ubud:point(115.262,-8.506),Sidemen:point(115.446,-8.467),
    Munduk:point(115.079,-8.264),Sanur:point(115.263,-8.694),
    'Labuan Bajo':point(119.885,-8.496),
    Flores:point(120.464,-8.611,'Representative interior location: Ruteng'),
  },
};
