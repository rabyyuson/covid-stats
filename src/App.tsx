import fetch from 'cross-fetch'
import React from 'react'

const URL = 'https://data.cdc.gov/resource/saz5-9hgg.json?$$app_token=9UKsqjohDZQ5pRVegZbpkfSww'

async function getCdcData() {
  return await fetch(URL) 
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
    getCdcData()
      .then(cdcData => this.setState({ cdcData }))
  }

  render() {
    const { cdcData } = this.state

    return (
      <div className="App">
        {cdcData.map((data: {
          jurisdiction: string;
          week_of_allocations: string;
          _1st_dose_allocations: string;
          _2nd_dose_allocations: string;
        }, index: number) => {
          const date = new Date(data.week_of_allocations)
          console.log(date)

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
