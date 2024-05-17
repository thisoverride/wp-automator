import puppeteer from 'puppeteer';
import winston from 'winston';
import fs from 'node:fs';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `${timestamp} [${level}]: ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'log/combined.log' })
  ]
});

(async () => {
  try {
    logger.info('Launching the browser...');
    const browser = await puppeteer.launch({ headless: true   });
    const page = await browser.newPage();
    logger.info('Setting screen size...');

    page.on('dialog', async dialog => {
      await dialog.dismiss(); // Ignorer le dialogue
    });


    logger.info('Navigating to the WordPress installation page...');
    await page.goto('http://localhost:8000/wp-admin/install.php', { waitUntil: 'load' });

    logger.info('Language Configuration...');
    await page.click('[value="fr_FR"]')
    await page.click('#language-continue')

    logger.info('Filling in site information...');
    await page.waitForSelector('#weblog_title');
    const noIndexSite = await page.$('#blog_public');

    await page.type('#weblog_title', 'exemple');
    await page.type('#user_login', 'exemple_username');
    await page.type('#pass1', 'exemple_password');
    await page.type('#admin_email', 'exemple@admin.com');
    await noIndexSite.click();
    let btnNext = (await page.$$('input[type="submit"]'))[0];
    await btnNext.click();

    logger.info('Waiting for installation to complete...');
    await page.waitForSelector('a');
    await page.click('a');

    logger.info('Logging in...');
    await page.waitForSelector('#loginform');
    await page.type('#user_login', 'exemple_username');
    await page.waitForSelector('#user_pass');
    await page.type('#user_pass', 'exemple_password');
    await new Promise(resolve => setTimeout(resolve, 1000));
    await page.click('#wp-submit');

    logger.info('Navigating to plugin installation page...');
    await page.waitForNavigation();
    await page.goto('http://localhost:8000/wp-admin/plugin-install.php?s=WooCommerce&tab=search&type=term');
    
    logger.info('Waiting for WooCommerce plugin to appear...');
    await page.waitForSelector('.plugin-card.plugin-card-woocommerce');
    const item = await page.$('.plugin-card.plugin-card-woocommerce');
    const btnInstall = await item.$('[data-slug]');
    await btnInstall.click();

    const waiter = async () => {
      try {
        await page.waitForSelector('.button.activate-now.button-primary').catch(async (e)=> {
          console.log('timeout')
          await test()
        })
      } catch (error) {
        logger.warn(error)
        await test()
      }

    }
 
    await waiter()
    logger.info('Activating WooCommerce plugin...');
    const activatePlugin = await item.$('.button.activate-now.button-primary');
    await activatePlugin.click();

    logger.info('Done. WooCommerce extension installed successfully.');
    await new Promise(resolve => setTimeout(resolve, 2000));
    await page.goto('http://localhost:8000/wp-admin/admin.php?page=wc-admin&path=%2Fsetup-wizard');
    
    logger.info('Initizilzation of WooCommerce API');
    await page.waitForSelector('.woocommerce-profiler-navigation-skip-link');
    await page.click('.woocommerce-profiler-navigation-skip-link')
    
    await page.waitForSelector('.woocommerce-select-control__control-input');
    await page.type('.woocommerce-select-control__control-input','France');
    await page.click('#woocommerce-select-control__option-0-FR');

   await page.waitForSelector('.woocommerce-profiler-button');
   await page.click('.woocommerce-profiler-button');

   await page.goto('http://localhost:8000/wp-admin/admin.php?page=wc-settings&tab=advanced&section=keys&create-key=1')
   logger.info('Define API rule to app');
    await page.waitForSelector('#key_description')
    await page.type('#key_description','app_user')


    const optionValue = 'write';
    await page.select('#key_permissions', optionValue);
    await page.click('#update_api_key')
    await page.waitForSelector('#key_consumer_key');

    const credentials = await page.evaluate(() => {
     return  {
      grant : 'write',
      consumerKey : document.getElementById('key_consumer_key').value,
      consumerSecret:  document.getElementById('key_consumer_secret').value
    }
    });

    // await page.waitForSelector('.updated')
    logger.info('API rule defined successfully');
    logger.info('Initialization of permalink');

    await page.goto('http://localhost:8000/wp-admin/options-permalink.php');
    await page.waitForSelector('#permalink-post-name');
    await page.click('#permalink-input-post-name');
    await new Promise(resolve => setTimeout(resolve, 1000));
    await page.click('input[type="submit"]');
    await new Promise(resolve => setTimeout(resolve, 1000));
    await page.reload();
    

    const key = JSON.stringify(credentials);
    fs.writeFileSync('./credentials.json',key);
    logger.info('Configuration successfully !');
      await browser.close();
    
  } catch (error) {
    logger.error('Error occurred: ' + error.message);
  } 
})()



{/* <option value="read">Lecture</option>
<option value="write">Écriture</option>
<option value="read_write">Lecture/ */}