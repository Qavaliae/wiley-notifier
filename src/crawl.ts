import axios from 'axios'
import { State, Store } from './types'

// Retrieve current state
export const crawl = async (store: Store): Promise<State> => {
  // Fetch data
  const data = await axios
    .get(store.tracker, {
      headers: {
        Cookie: store.cookie,
      },
    })
    .then((response) =>
      response.data.hits
        .map((e: any) => e.actualStage.data)
        .find((e: any) => e.registrySubmissionCode === store.submissionId),
    )

  // Return state
  return {
    ref: store.submissionId,
    title: data.name,
    status: data.state,
    displayedStatus: data.workflowState,
    modified: new Date(data.modified),
  }
}
