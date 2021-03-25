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

class App extends React.Component {
  constructor(props: any) {
    super(props)
    this.state = {
      cdcData: {
        jurisdiction: "",
        week_of_allocations: "",
        _1st_dose_allocations: "",
        _2nd_dose_allocations: "",
      }
    }
  }

  componentDidMount() {
    const cdcData = getCdcData()
    cdcData.then(data => console.log(data))
  }

  render() {
    return (
      <div className="App">
        Content here
      </div>
    );
  }
}

export default App;
