import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';

test('next steps saves show confirmation and unchanged fields stay disabled',async({page})=>{
 let writes=0;
 await page.route('**/dashboard',r=>r.fulfill({contentType:'text/html',body:readFileSync(new URL('./fixtures/dashboard-save.html',import.meta.url),'utf8')}));
 await page.route('**/dashboard/api/**',r=>{
 const path=new URL(r.request().url()).pathname;
 let body:unknown={};
 if(path.endsWith('/me'))body={staff:{role:'admin'},permissions:{edit:true,proposals:true},emailSending:false};
 else if(path.endsWith('/staff'))body=[];
 else if(path.endsWith('/edit')){writes++;body={ok:true};}
 else body={enquiry:{id:'test',reference:'TEST ONLY',name:'Test Traveller',email:'test@example.invalid',requirements_json:'{}',status:'New',assigned_to:null,follow_up:null},related:[],activities:[],attachments:[],proposals:[]};
 return r.fulfill({contentType:'application/json',body:JSON.stringify(body)});
 });
 await page.goto('/dashboard#test');
 const button=page.locator('#edit-form button');
 await expect(button).toBeDisabled();
 await page.locator('#edit-form [name="status"]').selectOption('In progress');await expect(button).toBeEnabled();
 await page.locator('#edit-form [name="status"]').selectOption('New');await expect(button).toBeDisabled();
 await page.locator('#edit-form [name="status"]').selectOption('In progress');await button.click();
 await expect(page.locator('.save-feedback')).toHaveText('✓ Changes saved');await expect(button).toBeDisabled();expect(writes).toBe(1);
 await page.locator('#edit-form').screenshot({path:'/tmp/waytoasia-save-confirmation.png'});
});
