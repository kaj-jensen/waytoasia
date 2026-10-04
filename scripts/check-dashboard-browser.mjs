import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true});
try{
  const unauth=await browser.newContext();for(const path of ['/staff','/staff/api/enquiries','/staff/attachments/example']){const response=await unauth.request.get(`http://127.0.0.1:8788${path}`);assert.equal(response.status(),401)}await unauth.close();
  for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
    const context=await browser.newContext({viewport});const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://127.0.0.1:8788/preview-login');await page.locator('.enquiry').first().waitFor();assert.ok(await page.locator('.enquiry').count()>=3);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    const alex=page.locator('.enquiry').filter({hasText:'Awaiting client'}).first();await alex.click();await page.locator('#edit-form').waitFor();assert.equal(await page.locator('.proposal').count(),2);assert.ok(await page.locator('.timeline-item.note').first().textContent());assert.equal(await page.locator('#send-form button').isDisabled(),true);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await page.screenshot({path:`/tmp/waytoasia-dashboard-${viewport.width}.png`,fullPage:true});
    const note=`Browser verification note ${viewport.width} ${Date.now()}`;await page.locator('#note-form textarea').fill(note);await page.locator('#note-form button').click();await page.getByText(note,{exact:true}).waitFor();
    await page.locator('#show-queue').click();await page.locator('[data-assign]').waitFor();await page.locator('#show-team').click();await page.locator('#team-form').waitFor();assert.deepEqual(await page.locator('#team-form select option').allTextContents(),['Administrator','Sales','Back-Office','Finance','View only']);
    await page.locator('[data-edit-user]').first().click();assert.equal(await page.locator('#team-form [name=email]').getAttribute('readonly'),'');
    await page.locator('#team-form button[type=reset]').click();await page.locator('#team-form [name=email]').fill(`browser-${viewport.width}@example.invalid`);await page.locator('#team-form [name=name]').fill('Synthetic sales user');await page.locator('#team-form .primary').click();await page.locator('.user-row').filter({hasText:`browser-${viewport.width}@example.invalid`}).waitFor();
    await page.screenshot({path:`/tmp/waytoasia-users-${viewport.width}.png`,fullPage:true});
    await page.locator('#show-settings').click();await page.getByRole('heading',{name:'Settings',exact:true}).waitFor();assert.ok(await page.locator('#secondary-view').textContent().then(t=>t.includes('Disabled')));
    assert.deepEqual(errors,[]);await context.close();console.log(`Dashboard browser checks passed at ${viewport.width}px`);
  }
}finally{await browser.close()}
