import {test,expect} from '@playwright/test';
import {renderFlights,sampleFlight} from '../functions/_lib/duffel';
test('proposal flight table is styled under production-style CSP on desktop and mobile',async({page})=>{
 await page.route('**/flight-layout-test',route=>route.fulfill({contentType:'text/html',headers:{'Content-Security-Policy':"default-src 'self'; style-src 'self'; script-src 'none'"},body:`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/proposal.css"><link rel="stylesheet" href="/flights.css"></head><body class="proposal-view"><main>${renderFlights(sampleFlight())}</main></body></html>`}));
 for(const width of [1440,390]){
 await page.setViewportSize({width,height:900});await page.goto('/flight-layout-test');
 const cell=page.locator('.flight-table td').first();
 await expect(cell).toHaveCSS('padding-top','12px');
 await expect(page.locator('.flight-table strong').first()).toHaveCSS('display','block');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.locator('#flights').screenshot({path:`/tmp/waytoasia-proposal-flights-${width}.png`});
 }
});
