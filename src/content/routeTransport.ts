export type RouteMode='rail'|'flight'|'road'|'boat';

const routeLegModes:Record<string,RouteMode[]>={
  'Beijing|Great Wall':['road'],'Great Wall|Dali':['flight'],'Dali|Shaxi':['road'],'Shaxi|Yunnan':['road'],'Shanghai|Hangzhou':['rail'],'Hangzhou|Huangshan':['rail'],'Xi’an|Chengdu':['rail'],'Chengdu|Lijiang':['flight'],'Guilin|Yangshuo':['road'],'Yangshuo|Longji':['road'],
  'Tokyo|Hakone':['rail'],'Hakone|Kyoto':['rail'],'Kyoto|Naoshima':['rail','boat'],'Naoshima|Teshima':['boat'],'Teshima|Osaka':['boat','rail'],'Sapporo|Biei':['rail'],'Biei|Furano':['road'],'Furano|Shiretoko':['road'],'Fukuoka|Aso':['rail'],'Aso|Kurokawa':['road'],'Kurokawa|Kagoshima':['road','rail'],'Kyoto|Koyasan':['rail'],'Koyasan|Kumano':['road'],'Kumano|Ise':['road'],
  'Bangkok|Chiang Mai':['flight'],'Chiang Mai|Southern islands':['flight','boat'],'Bangkok|Ayutthaya':['rail'],'Ayutthaya|Sukhothai':['road'],'Sukhothai|Chiang Mai':['road'],'Bangkok|Khao Sok':['flight','road'],'Khao Sok|Koh Yao Noi':['road','boat'],'Chiang Rai|Golden Triangle':['road'],'Golden Triangle|Chiang Mai':['road'],
  'Hanoi|Hue':['flight'],'Hue|Hoi An':['road'],'Hoi An|Saigon':['flight'],'Saigon|Mekong':['road','boat'],'Hanoi|Ninh Binh':['road'],'Ninh Binh|Ha Long':['road'],'Hoi An|Quy Nhon':['road'],'Hue|Quy Nhon':['rail'],'Quy Nhon|Nha Trang':['rail'],'Saigon|Can Tho':['road'],'Can Tho|Chau Doc':['boat'],
  'Yogyakarta|Borobudur':['road'],'Borobudur|Bali':['flight'],'Bali|Komodo':['flight','boat'],'Jakarta|Yogyakarta':['rail'],'Yogyakarta|Bromo':['rail','road'],'Bromo|Ijen':['road'],'Ubud|Sidemen':['road'],'Sidemen|Munduk':['road'],'Munduk|Sanur':['road'],'Labuan Bajo|Komodo':['boat'],'Komodo|Flores':['boat','road']
};

export function getRouteModes(from:string,to:string):RouteMode[]{
  const modes=routeLegModes[`${from}|${to}`];
  if(!modes)throw new Error(`Missing transport modes for journey leg: ${from} to ${to}`);
  return modes;
}
