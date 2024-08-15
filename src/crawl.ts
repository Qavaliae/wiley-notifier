import puppeteer, { Page } from 'puppeteer'
import { State, Store } from './types'

// Retrieve current state
export const crawl = async (store: Store): Promise<State> => {
  // Launch the browser and open a new blank page
  const browser = await puppeteer.launch()
  const page = await browser.newPage()
  page.setDefaultTimeout(0)

  // Restore cookies
  await loadCookies(store, page)

  // Go to entry
  await page.goto(store.entry, { waitUntil: 'networkidle2' })
  await page.waitForSelector('xpath///h1[text()="My Submissions"]')

  // Persist cookies
  await persistCookies(store, page)

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

const loadCookies = async (store: Store, page: Page) => {
  if (!Array.isArray(store.cookies)) {
    return
  }

  console.log(`${store._id}: loading cookies...`)
  await page.setCookie(...store.cookies)
  console.log(`${store._id}: loaded cookies`)
}

const persistCookies = async (store: Store, page: Page) => {
  store.cookies = await page.cookies()
}
