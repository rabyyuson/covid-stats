import fetch from 'cross-fetch'
import usStates from 'states-us'
import { format } from 'date-fns'
import React from 'react'

const CONFIG = {
  cdc_base_url: 'https://data.cdc.gov/resource/',
  app_token: '9UKsqjohDZQ5pRVegZbpkfSww',
  dataset_identifiers: {
    vaccine_allocation_distributions: {
      janssen: 'w9zu-fywh',
      moderna: 'b7pe-5nws',
      pfizer: 'saz5-9hgg',
    }
  }
}

interface vaccineAllocationDistribution {
  jurisdiction: string;
  week_of_allocations: string;
  _1st_dose_allocations: string;
  _2nd_dose_allocations: string;
}

async function getCdcData({
  datasetIdentifer,
  state,
}: {
  datasetIdentifer: string;
  state: string;
}) {
  const {
    cdc_base_url,
    app_token,
  } = CONFIG
  const requestUrl = `${cdc_base_url}${datasetIdentifer}.json?$$app_token=${app_token}&jurisdiction=${state}`

  return await fetch(requestUrl) 
    .then(response => {
      if (response.status >= 400) {
        throw new Error("Bad response from server")
      }
      return response.json()
    })
    .catch(error => {
      console.error(error)
    })
}

class App extends React.Component<{}, any> {
  constructor(props: any) {
    super(props)

    this.handleOnChange = this.handleOnChange.bind(this)

    this.state = {
      cdcData: {
        vaccineAllocationDistributions: {
          janssen: {},
          moderna: {},
          pfizer: {},
        }
      }
    }
  }

  handleOnChange(state: string) {
    const { dataset_identifiers } = CONFIG
    const { vaccine_allocation_distributions: distributions } = dataset_identifiers

    Promise.all([
      getCdcData({
        datasetIdentifer: distributions.janssen,
        state,
      }),
      getCdcData({
        datasetIdentifer: distributions.moderna,
        state,
      }),
      getCdcData({
        datasetIdentifer: distributions.pfizer,
        state,
      })
    ])
      .then(data => {
        this.setState({
          cdcData: {
            vaccineAllocationDistributions: {
              janssen: data[0],
              moderna: data[0],
              pfizer: data[0],
            }
          }
        })
      })
  }

  render() {
    const cdcData = this.state.cdcData
    const {
      vaccineAllocationDistributions: distributions
    } = cdcData
    const {
      janssen,
      moderna,
      pfizer,
    } = distributions

    return (
      <div className="App">
        <select
          onChange={(event) => this.handleOnChange(event.target.value)}
        >
          <option>- - Choose a state - -</option>
          {
            usStates.map((state, index) => {
              return (
                <option
                  key={index}
                  value={state.name}
                >
                  {state.name}
                </option>
              )
            })
          }
        </select>

        {janssen && (
          <>
            <h2>Janssen</h2>
            {this.renderDistributionData(janssen)}
          </>
        )}

        {pfizer && (
          <>
            <h2>Pfizer</h2>
            {this.renderDistributionData(pfizer)}
          </>
        )}

        {moderna && (
          <>
            <h2>Moderna</h2>
            {this.renderDistributionData(moderna)}
          </>
        )}
      </div>
    );
  }

  renderDistributionData(distribution: [vaccineAllocationDistribution]) {
    return Array.isArray(distribution) && distribution.map((data, index) => {
      const {
        week_of_allocations,
        _1st_dose_allocations,
      } = data
      const dateAllocated = format(new Date(week_of_allocations), 'MM/dd/yyyy')
      return (
        <div key={index}>
          <p>{dateAllocated}</p>
          <p>{_1st_dose_allocations}</p>
        </div>
      )
    })
  }
}

export default App;
