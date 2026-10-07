import {test,expect} from '@playwright/test';
import {renderFlights,sampleFlight} from '../functions/_lib/duffel';
test('proposal flight table is styled under production-style CSP on desktop and mobile',async({page})=>{
 const flight=sampleFlight();const leg=flight.slices[0][0];flight.slices[0]=[{...leg,destination:'LHR',destinationTimeZone:'Europe/London',arrival:'2027-02-10T09:00:00',departure:'2027-02-10T08:00:00'},{...leg,origin:'LHR',originTimeZone:'Europe/London',destination:'HAN',departure:'2027-02-10T11:30:00',flightNumber:'DEMO 202'}];
 await page.route('**/flight-layout-test',route=>route.fulfill({contentType:'text/html',headers:{'Content-Security-Policy':"default-src 'self'; style-src 'self'; script-src 'none'"},body:`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/proposal.css"><link rel="stylesheet" href="/flights.css"></head><body class="proposal-view"><main>${renderFlights(flight)}</main></body></html>`}));
 for(const width of [1440,390]){
 await page.setViewportSize({width,height:900});await page.goto('/flight-layout-test');
 await expect(page.locator('.flight-connection')).toContainText('2h 30m');
 const cell=page.locator('.flight-table td').first();
 await expect(cell).toHaveCSS('padding-top','12px');
 await expect(page.locator('.flight-table strong').first()).toHaveCSS('display','block');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.locator('#flights').screenshot({path:`/tmp/waytoasia-proposal-flights-${width}.png`});
 }
});
