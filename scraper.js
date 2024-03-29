const puppeteer = require("puppeteer");
const fs = require("fs");

/* Async literal delay before next line */
function delay(time) {
  return new Promise(function (resolve) {
    setTimeout(resolve, time);
  });
}

/* Check the purchase button on the 14 and 16 inch macbooks
Returns false if can't buy, true if can buy */
const scrape = async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  await page.setViewport({
    width: 1920,
    height: 1080,
  });

  /* Check if a login session is already created */
  const cookiesFilePath = "cookies.json";
  const previousSession = fs.existsSync(cookiesFilePath);

  /* If previous session doesn't exist, proceed to login first */
  if (!previousSession) {
    await page.goto("https://www.linkedin.com/login?fromSignIn=true");
    await page.waitForSelector("#username");
    await page.type("#username", "test");
    await page.type("#password", "test");
    await page.keyboard.press("Enter");

    await delay(20000);
    // Save Session Cookies
    const cookiesObject = await page.cookies();
    // Write cookies to temp file to be used in other profile pages
    fs.writeFile(
      cookiesFilePath,
      JSON.stringify(cookiesObject),
      function (err) {
        if (err) {
          console.log("Session file failed to save.", err);
        }
        console.log("Session has been successfully saved");
      }
    );
    await browser.close();
    return;
  }

  const cookiesString = fs.readFileSync(cookiesFilePath);
  const parsedCookies = JSON.parse(cookiesString);
  if (parsedCookies.length !== 0) {
    for (let cookie of parsedCookies) {
      await page.setCookie(cookie);
    }
    console.log("Session has been loaded in the browser");
  }

  /* LinkedIn Profile to scrape */
  await page.goto("https://www.linkedin.com/in/sean-xin-jeat-tan-070559208/");
  await page.waitForSelector("#experience");
  await delay(3000);
  
  const topBar = await page.evaluate(() => {
    const elems = document.querySelector('.ph5').querySelector('.mt2');
    const leftElems = elems.querySelector('.pv-text-details__left-panel').innerText;
    const rightElems = elems.querySelector('.pv-text-details__right-panel').innerText;
    const desc = leftElems.split(/\r?\n/)[1];
    const workplace = rightElems.split(/\r?\n/)[0];
    return {
      desc: desc.toLowerCase().split(" "),
      workplace: workplace,
    }
  })

  const experience = await page.evaluate(() => {
    const blocks = document.querySelectorAll('.artdeco-card.ember-view.relative.break-words.pb3.mt2');
    let experienceBlock = null;

    // Check each block until we find the experience section
    blocks.forEach((block) => {
      if ( block.querySelector('#experience') != null) {
        experienceBlock = block;
      }
    })

    const rawExperienceText = experienceBlock.innerText.split(/\r?\n/);
    let allText = [];
    rawExperienceText.forEach((text) => {
      const splitText = text.split('·');
      console.log({txt: text, split: splitText})
      allText = allText.concat(splitText);
    });
    console.log({alltext: allText});
    return allText.map((t)=>t.toString().toLowerCase().replace(/^\s+|\s+$/gm,''));
  });

  // browser.close();
  return;
};

/* Sample to run locally */
scrape().then((result) => {
  console.log(result);
});

/* Export scraper function */
module.exports = scrape;
