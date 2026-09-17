export type RouteMode='rail'|'flight'|'road'|'boat';

const routeLegModes:Record<string,RouteMode[]>={
  'Seoul|Andong':['rail'],'Andong|Gyeongju':['road'],'Gyeongju|Busan':['rail'],'Seoul|Jeonju':['rail'],'Jeonju|Gwangju':['road'],'Gwangju|Busan':['road'],'Seoul|Sokcho':['road'],'Sokcho|Seoraksan':['road'],'Seoraksan|Gangneung':['road'],'Seoul|Jeju City':['flight'],'Jeju City|Seogwipo':['road'],
  'Beijing|Great Wall':['road'],'Great Wall|Dali':['flight'],'Dali|Shaxi':['road'],'Shaxi|Yunnan':['road'],'Shanghai|Hangzhou':['rail'],'Hangzhou|Huangshan':['rail'],'Xi’an|Chengdu':['rail'],'Chengdu|Lijiang':['flight'],'Guilin|Yangshuo':['road'],'Yangshuo|Longji':['road'],
  'Bangkok|Chiang Mai':['flight'],'Chiang Mai|Southern islands':['flight','boat'],'Bangkok|Ayutthaya':['rail'],'Ayutthaya|Sukhothai':['road'],'Sukhothai|Chiang Mai':['road'],'Bangkok|Khao Sok':['flight','road'],'Khao Sok|Koh Yao Noi':['road','boat'],'Chiang Rai|Golden Triangle':['road'],'Golden Triangle|Chiang Mai':['road'],
  'Hanoi|Hue':['flight'],'Hue|Hoi An':['road'],'Hoi An|Saigon':['flight'],'Saigon|Mekong':['road','boat'],'Hanoi|Ninh Binh':['road'],'Ninh Binh|Ha Long':['road'],'Hoi An|Quy Nhon':['road'],'Hue|Quy Nhon':['rail'],'Quy Nhon|Nha Trang':['rail'],'Saigon|Can Tho':['road'],'Can Tho|Chau Doc':['boat'],
  'Yogyakarta|Borobudur':['road'],'Borobudur|Bali':['flight'],'Bali|Komodo':['flight','boat'],'Jakarta|Yogyakarta':['rail'],'Yogyakarta|Bromo':['rail','road'],'Bromo|Ijen':['road'],'Ubud|Sidemen':['road'],'Sidemen|Munduk':['road'],'Munduk|Sanur':['road'],'Labuan Bajo|Komodo':['boat'],'Komodo|Flores':['boat','road']
};

export function getRouteModes(from:string,to:string):RouteMode[]{
  const modes=routeLegModes[`${from}|${to}`];
  if(!modes)throw new Error(`Missing transport modes for journey leg: ${from} to ${to}`);
  return modes;
}