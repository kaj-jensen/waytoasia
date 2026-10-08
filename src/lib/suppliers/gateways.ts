export const hbxGatewayIds=['beijing','seoul','bangkok','hanoi','bali'] as const;
export type HbxGatewayId=typeof hbxGatewayIds[number];

export interface HbxGateway {
  id:HbxGatewayId;
  name:string;
  country:string;
  destinationCode:string;
  airportCode:string;
  utcOffset:string;
}

export const hbxGateways:Record<HbxGatewayId,HbxGateway>={
  beijing:{id:'beijing',name:'Beijing',country:'china',destinationCode:'BJS',airportCode:'PEK',utcOffset:'+08:00'},
  seoul:{id:'seoul',name:'Seoul',country:'south-korea',destinationCode:'SEL',airportCode:'ICN',utcOffset:'+09:00'},
  bangkok:{id:'bangkok',name:'Bangkok',country:'thailand',destinationCode:'BKK',airportCode:'BKK',utcOffset:'+07:00'},
  hanoi:{id:'hanoi',name:'Hanoi',country:'vietnam',destinationCode:'HAN',airportCode:'HAN',utcOffset:'+07:00'},
  bali:{id:'bali',name:'Bali',country:'indonesia',destinationCode:'DPS',airportCode:'DPS',utcOffset:'+08:00'},
};

