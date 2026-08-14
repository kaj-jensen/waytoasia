import type {Locale} from '../i18n';
import {currencyForLocale,type PriceMap} from '../content/data';
const localeTags:Record<Locale,string>={en:'en-US',es:'es-ES',it:'it-IT',fr:'fr-FR',nl:'nl-NL',hu:'hu-HU',sv:'sv-SE',da:'da-DK',no:'nb-NO'};
export function formatPrice(locale:Locale,prices:PriceMap){const currency=currencyForLocale[locale];return new Intl.NumberFormat(localeTags[locale],{style:'currency',currency,maximumFractionDigits:0}).format(prices[currency])}
