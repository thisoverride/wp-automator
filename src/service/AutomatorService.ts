import puppeteer, { Browser, Page } from 'puppeteer';
import locateChrome from 'locate-chrome';

export default class AutomatorService {
  public async generateApiKey(host: string, wpcredentials : {wpUsr: string ,wpPsswd: string}) {
      const executable_path = await new Promise(resolve => locateChrome((arg) => resolve(arg))) || '';
      
      const log = console.log;
      log(wpcredentials)
      const browser: Browser = await puppeteer.launch({  executablePath : executable_path.toString()});
      const page: Page = await browser.newPage();
    
      log('Navigating to WordPress login page...');
      await page.goto(`http://${host}/wp-login.php`, { waitUntil: "networkidle2" });
    
      log('Waiting for login form...');
      await page.waitForSelector('#user_login');
      await page.waitForSelector('#user_pass');
      await page.waitForSelector('#wp-submit');
    
      log('Logging in to WordPress...');
      await page.type('#user_login', wpcredentials.wpUsr);
      await page.type('#user_pass', wpcredentials.wpPsswd);
      await page.click('#wp-submit'); 
     

      log('Waiting for dashboard after login...');
      await page.waitForNavigation({ waitUntil: "networkidle2" });
    
      log('Navigating to WooCommerce API key creation page...');
      await page.goto(`http://${host}/wp-admin/admin.php?page=wc-settings&tab=advanced&section=keys&create-key=1`, { waitUntil: "networkidle2" });
    
      log('Waiting for API key creation form...');
      await page.waitForSelector('#key_description');
      await page.waitForSelector('#key_permissions');
    
      log('Filling out API key creation form...');
      await page.type('#key_description', 'Description de ma clé API');
      await page.select('#key_permissions', 'read_write');
      await page.click('#update_api_key');
    
      log('Waiting for API key generation...');
      await page.waitForSelector('#key_consumer_key');
      await page.waitForSelector('#key_consumer_secret');
    
      const credentials = await page.evaluate(() => {
        const consumerKeyElement: any = document.querySelector('#key_consumer_key');
        const consumerSecretElement: any = document.querySelector('#key_consumer_secret');
        return {
          consumerKey: consumerKeyElement ? consumerKeyElement.value : 'Clé non trouvée',
          consumerSecret: consumerSecretElement ? consumerSecretElement.value : 'Secret non trouvé'
        };
      });
    
      log('API key generated successfully.');

      await browser.close();
    return {consumer_key: credentials.consumerKey , secret_key: credentials.consumerSecret}
  }
}
