import {defineConfig,devices} from '@playwright/test';
export default defineConfig({testDir:'./tests',testMatch:'finance-ui.spec.ts',workers:1,use:{baseURL:'http://127.0.0.1:8788',...devices['Desktop Chrome']},webServer:{command:'npm run preview:dashboard',url:'http://127.0.0.1:8788/preview-login',reuseExistingServer:true},reporter:'list'});
