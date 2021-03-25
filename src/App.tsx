import fetch from 'cross-fetch'
import usStates from 'states-us'
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
    this.state = {
      cdcData: []
    }
  }

  componentDidMount() {
    
  }

  render() {
    const { cdcData } = this.state
    const { dataset_identifiers } = CONFIG
    const { vaccine_allocation_distributions } = dataset_identifiers
    const {
      janssen,
      moderna,
      pfizer,
    } = vaccine_allocation_distributions

    return (
      <div className="App">
        <select
          onChange={(event) => {
            const selectedState = event.target.value
            getCdcData({
              datasetIdentifer: pfizer,
              state: selectedState,
            })
              .then(cdcData => this.setState({ cdcData }))
          }}
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

        {cdcData.map((data: {
          jurisdiction: string;
          week_of_allocations: string;
          _1st_dose_allocations: string;
          _2nd_dose_allocations: string;
        }, index: number) => {
          const date = new Date(data.week_of_allocations)

          return (
            <div key={index}>
              <p>{data.jurisdiction}</p>
              <p>{`${date.getMonth()} ${date.getDay()}, ${date.getFullYear()}`}</p>
              <p>{data._1st_dose_allocations}</p>
              <p>{data._2nd_dose_allocations}</p>
            </div>
          )
        })}
      </div>
    );
  }
}

export default App;
