import {defineConfig,devices} from '@playwright/test';
export default defineConfig({testDir:'./e2e',testMatch:'workspace.spec.js',fullyParallel:false,workers:1,timeout:45000,reporter:'list',use:{baseURL:'http://127.0.0.1:8790',trace:'retain-on-failure'},projects:[{name:'desktop',use:{...devices['Desktop Chrome']}},{name:'mobile',use:{...devices['iPhone 13'],browserName:'chromium'}}]});
