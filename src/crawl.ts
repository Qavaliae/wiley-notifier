import puppeteer, { Browser } from 'puppeteer'
import { State, Store } from './types'

/**
 * Retrieve current state
 */
export const crawl = async (store: Store): Promise<State> => {
  // Launch the browser and open a new blank page

  const browser = await puppeteer.launch()

  // Prepare pages

  const [page] = await browser.pages()
  const connectPage = await browser.newPage()

  await configureTimeout(browser)

  // Restore cookies

  await loadCookies(store, browser)

  // Science connect

  await connectPage.goto('https://wiley.scienceconnect.io/dashboard', {
    waitUntil: 'networkidle2',
  })

  await connectPage.waitForSelector(
    'xpath///h2[text()="Institutional Memberships"]',
  )

  // Go to entry

  await page.bringToFront()
  await page.goto(store.entry, { waitUntil: 'networkidle2' })
  await page.waitForSelector('xpath///h1[text()="My Submissions"]')

  // Persist cookies

  await persistCookies(store, browser)

  // Fetch data

  await page.goto(store.tracker, { waitUntil: 'networkidle2' })
  const handle = await page.locator('body pre').waitHandle()
  const response = await handle.evaluate((el) => el.textContent)

  // Close browser

  await browser.close()

  // Throw error if no response

  if (!response) {
    throw Error('Could not scrape data')
  }

  // Collect data

  const json = JSON.parse(response)
  const data = json.hits
    .map((e: any) => e.actualStage.data)
    .find((e: any) => e.registrySubmissionCode === store.submissionId)

  // Return state

  return {
    ref: store.submissionId,
    title: data.name,
    status: data.state,
    displayedStatus: data.workflowState,
    modified: new Date(data.modified),
  }
}

const configureTimeout = async (browser: Browser) => {
  for (const page of await browser.pages()) {
    page.setDefaultTimeout(20e3)
  }
}

const loadCookies = async (store: Store, browser: Browser) => {
  if (!Array.isArray(store.cookies)) {
    return
  }

  console.log(`${store._id}: loading cookies...`)

  for (const page of await browser.pages()) {
    await page.setCookie(...store.cookies)
  }

  console.log(`${store._id}: loaded cookies`)
}

const persistCookies = async (store: Store, browser: Browser) => {
  let cookies = []

  for (const page of await browser.pages()) {
    cookies.push(...(await page.cookies()))
  }

  store.cookies = cookies
}
