import fetch from 'cross-fetch'
import usStates from 'states-us'
import { format } from 'date-fns'
import React from 'react'
import Chart from 'chart.js'
import './App.css';

const CONFIG = {
  cdc_base_url: 'https://data.cdc.gov/resource/',
  app_token: '9UKsqjohDZQ5pRVegZbpkfSww',
  dataset_identifiers: {
    cases_and_deaths_by_state_over_time: '9mfq-cb36',
  }
}

interface caseAndDeath {
  [string: string]: string;
}

async function getCdcData({
  datasetIdentifier,
  filters,
}: {
  datasetIdentifier: string;
  filters: string;
}) {
  const {
    cdc_base_url,
    app_token,
  } = CONFIG
  const requestUrl = `${cdc_base_url}${datasetIdentifier}.json?$$app_token=${app_token}${filters}`

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
  confirmedCasesRef: React.RefObject<HTMLCanvasElement>
  confirmedCasesChart: Chart | undefined

  newCasesRef: React.RefObject<HTMLCanvasElement>
  newCasesChart: Chart | undefined

  constructor(props: any) {
    super(props)

    this.confirmedCasesRef = React.createRef()
    this.newCasesRef = React.createRef()

    this.handleOnChange = this.handleOnChange.bind(this)
    this.fetchCdcData = this.fetchCdcData.bind(this)
    this.setChart = this.setChart.bind(this)

    this.state = {
      cdcData: {
        casesAndDeathsByStateOverTime: [],
      }
    }
  }

  setChart({
    filter,
    ref,
    label,
    chart,
    chartType,
  }:
  {
    filter: string;
    ref: React.RefObject<HTMLCanvasElement>;
    label: string;
    chart: Chart | undefined,
    chartType: string;
  }) {
    const { cdcData } = this.state
    const { casesAndDeathsByStateOverTime } = cdcData
    if (!filter || !casesAndDeathsByStateOverTime.length || !ref) {
      return
    }

    if (chart) {
      chart.destroy()
    }

    const recentCases = casesAndDeathsByStateOverTime.slice(-7)
    const cases = recentCases.map((
      caseItem: caseAndDeath
    ) => ({
      submissionDate: caseItem.submission_date,
      [filter]: caseItem[filter],
    }))

    const canvasElement = ref.current || ''
    chart = new Chart(canvasElement, {
      type: chartType,
      data: {
        labels: cases.map((
          caseItem: caseAndDeath
        ) => format(new Date(caseItem.submissionDate), 'MM/dd')),
        datasets: [
          {
            label,
            backgroundColor: '#f23939',
            borderColor: '#f23939',
            data: cases.map((
              caseItem: caseAndDeath
            ) => caseItem[filter]),
            fill: false
          }
        ]
      },
      options: {
        maintainAspectRatio: false,
      }
    })
  }

  handleOnChange(state: string) {
    this.fetchCdcData(state)
  }

  fetchCdcData(state: string) {
    const { dataset_identifiers } = CONFIG
    const { cases_and_deaths_by_state_over_time } = dataset_identifiers

    const [
      stateName,
      stateAbbreviation
    ] = state.split(',')

    const today = new Date()
    const month = today.getMonth()
    const lastMonth = month ? month - 1 : month

    Promise.all([
      getCdcData({
        datasetIdentifier: cases_and_deaths_by_state_over_time,
        filters: `&state=${stateAbbreviation}&$order=submission_date ASC&$where=submission_date >= '${format(new Date(today.getFullYear(), lastMonth), 'yyyy-MM-01')}T00:00:00.000'`,
      }),
    ])
      .then(data => {
        this.setState({
          cdcData: {
            casesAndDeathsByStateOverTime: data[0],
            vaccineAllocationDistributions: {
              janssen: data[1],
              moderna: data[2],
              pfizer: data[3],
            }
          }
        })
        this.setChart({
          filter: 'conf_cases',
          ref: this.confirmedCasesRef,
          chart: this.confirmedCasesChart,
          chartType: 'bar',
          label: 'Confirmed Cases',
        })
        this.setChart({
          filter: 'new_case',
          ref: this.newCasesRef,
          chart: this.newCasesChart,
          chartType: 'line',
          label: 'New Cases',
        })
      })
  }

  render() {
    const { cdcData } = this.state
    const { casesAndDeathsByStateOverTime } = cdcData

    return (
      <div className="App">
        <select
          style={{
            fontSize: '18px',
            padding: '20px',
            fontWeight: 'bold',
          }}
          onChange={(event) => this.handleOnChange(event.target.value)}
        >
          <option>- - Choose a state - -</option>
          {
            usStates.map((state, index) => {
              return (
                <option
                  key={index}
                  value={[state.name, state.abbreviation]}
                >
                  {state.name}
                </option>
              )
            })
          }
        </select>

        <div
          style={{
            width: '100%',
          }}
        >
          <div style={{
            position: 'relative',
            width: '400px',
            height: '300px',
            display: 'inline-block',
          }}>
            <canvas ref={this.confirmedCasesRef} />
          </div>

          <div style={{
            position: 'relative',
            width: '400px',
            height: '300px',
            display: 'inline-block',
          }}>
            <canvas ref={this.newCasesRef} />
          </div>
        </div>

        <h2>Cases and Deaths</h2>
        {this.renderCasesAndDeaths(casesAndDeathsByStateOverTime)}
      </div>
    );
  }

  renderCasesAndDeaths(casesAndDeaths: [caseAndDeath]) {
    return (
      <>
        <table>
          <thead>
            <tr>
              <td>Submission date</td>
              <td>Total number of cases</td>
              <td>Total confirmed cases</td>
              <td>Total probable cases</td>
              <td>Number of new cases</td>
              <td>Number of new probable cases</td>
              <td>Total number of deaths</td>
              <td>Total number of confirmed deaths</td>
              <td>Total number of probable deaths</td>
              <td>Number of new deaths</td>
              <td>Number of new probable deaths</td>
              <td>Date and time record was created</td>
              <td>If Agree, then confirmed and probable cases are included. If Not Agree, then only total cases are included.</td>
              <td>If Agree, then confirmed and probable deaths are included. If Not Agree, then only total deaths are included.</td>
            </tr>
          </thead>
          {
            Array.isArray(casesAndDeaths) && casesAndDeaths.map((data, index) => {
              const {
                submission_date,
                tot_cases,
                conf_cases,
                prob_cases,
                new_case,
                pnew_case,
                tot_death,
                conf_death,
                prob_death,
                new_death,
                pnew_death,
                created_at,
                consent_cases,
                consent_deaths,
              } = data
              const submissionDate = format(new Date(submission_date), 'MM/dd/yyyy')
              const dateAndTimeRecordWasCreated = format(new Date(created_at), 'MM/dd/yyyy')
              return (
                <tbody key={index}>
                  <tr>
                    <td>{submissionDate}</td>
                    <td>{tot_cases}</td>
                    <td>{conf_cases}</td>
                    <td>{prob_cases}</td>
                    <td>{new_case}</td>
                    <td>{pnew_case}</td>
                    <td>{tot_death}</td>
                    <td>{conf_death}</td>
                    <td>{prob_death}</td>
                    <td>{new_death}</td>
                    <td>{pnew_death}</td>
                    <td>{dateAndTimeRecordWasCreated}</td>
                    <td>{consent_cases}</td>
                    <td>{consent_deaths}</td>
                  </tr>
                </tbody>
              )
            })
          }
        </table>
      </>
    )
  }
}

export default App;
