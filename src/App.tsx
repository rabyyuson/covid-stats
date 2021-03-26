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

interface casesAndDeaths {
  submission_date: string;
  state: string;
  tot_cases: string;
  conf_cases: string;
  prob_cases: string;
  new_case: string;
  pnew_case: string;
  tot_death: string;
  conf_death: string;
  prob_death: string;
  new_death: string;
  pnew_death: string;
  created_at: string;
  consent_cases: string;
  consent_deaths: string;
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
  totalNumberOfCases: React.RefObject<HTMLCanvasElement>
  totalConfirmedCases: React.RefObject<HTMLCanvasElement>

  constructor(props: any) {
    super(props)

    this.handleOnChange = this.handleOnChange.bind(this)
    this.fetchCdcData = this.fetchCdcData.bind(this)
    this.totalNumberOfCases = React.createRef()
    this.totalConfirmedCases = React.createRef()
    this.setTotalNumberOfCasesChart = this.setTotalNumberOfCasesChart.bind(this)
    this.setTotalConfirmedCasesChart = this.setTotalConfirmedCasesChart.bind(this)

    this.state = {
      cdcData: {
        casesAndDeathsByStateOverTime: {},
        vaccineAllocationDistributions: {
          janssen: {},
          moderna: {},
          pfizer: {},
        }
      }
    }
  }

  setTotalConfirmedCasesChart() {
    const { cdcData } = this.state
    const { casesAndDeathsByStateOverTime } = cdcData
    const totalConfirmedCases = casesAndDeathsByStateOverTime.map((
      caseAndDeath: casesAndDeaths
    ) => ({
      submissionDate: caseAndDeath.submission_date,
      totalConfirmedCase: caseAndDeath.conf_cases,
    }))

    new Chart(this.totalConfirmedCases.current || '', {
      type: 'bar',
      data: {
        labels: totalConfirmedCases.map((
          caseAndDeath: {
            submissionDate: string;
            totalConfirmedCase: string;
          }
        ) => format(new Date(caseAndDeath.submissionDate), 'MM/dd/yyyy')),
        datasets: [{
          label: 'Total Confirmed Cases',
          backgroundColor: 'rgb(255, 99, 132)',
          borderColor: 'rgb(255, 99, 132)',
          data: totalConfirmedCases.map((
            caseAndDeath: {
              submissionDate: string;
              totalConfirmedCase: string;
            }
          ) => caseAndDeath.totalConfirmedCase)
        }]
      },
    });
  }

  setTotalNumberOfCasesChart() {
    const { cdcData } = this.state
    const { casesAndDeathsByStateOverTime } = cdcData
    const totalNumberOfCases = casesAndDeathsByStateOverTime.map((
      caseAndDeath: casesAndDeaths
    ) => ({
      submissionDate: caseAndDeath.submission_date,
      totalNumberOfCase: caseAndDeath.tot_cases,
    }))

    new Chart(this.totalNumberOfCases.current || '', {
      type: 'bar',
      data: {
        labels: totalNumberOfCases.map((
          caseAndDeath: {
            submissionDate: string;
            totalNumberOfCase: string;
          }
        ) => format(new Date(caseAndDeath.submissionDate), 'MM/dd/yyyy')),
        datasets: [{
          label: 'Total Number of Cases',
          backgroundColor: 'rgb(255, 99, 132)',
          borderColor: 'rgb(255, 99, 132)',
          data: totalNumberOfCases.map((
            caseAndDeath: {
              submissionDate: string;
              totalNumberOfCase: string;
            }
          ) => caseAndDeath.totalNumberOfCase)
        }]
      },
    });
  }

  handleOnChange(state: string) {
    this.fetchCdcData(state)
  }

  fetchCdcData(state: string) {
    const { dataset_identifiers } = CONFIG
    const {
      cases_and_deaths_by_state_over_time,
      vaccine_allocation_distributions: distributions,
    } = dataset_identifiers

    const [
      stateName,
      stateAbbreviation
    ] = state.split(',')

    Promise.all([
      getCdcData({
        datasetIdentifier: cases_and_deaths_by_state_over_time,
        filters: `&state=${stateAbbreviation}&$order=submission_date ASC`,
      }),
      getCdcData({
        datasetIdentifier: distributions.janssen,
        filters: `&jurisdiction=${stateName}`,
      }),
      getCdcData({
        datasetIdentifier: distributions.moderna,
        filters: `&jurisdiction=${stateName}`,
      }),
      getCdcData({
        datasetIdentifier: distributions.pfizer,
        filters: `&jurisdiction=${stateName}`,
      })
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
        this.setTotalNumberOfCasesChart()
        this.setTotalConfirmedCasesChart()
      })
  }

  render() {
    const { cdcData } = this.state
    const {
      casesAndDeathsByStateOverTime,
      vaccineAllocationDistributions
    } = cdcData
    const {
      janssen,
      moderna,
      pfizer,
    } = vaccineAllocationDistributions

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
                  value={[state.name, state.abbreviation]}
                >
                  {state.name}
                </option>
              )
            })
          }
        </select>

        <h2>Total Number of Cases</h2>
        <canvas ref={this.totalNumberOfCases} />

        <h2>Total Confirmed Cases</h2>
        <canvas ref={this.totalConfirmedCases} />

        <h2>Cases and Deaths</h2>
        {this.renderCasesAndDeaths(casesAndDeathsByStateOverTime)}

        <h2>Janssen</h2>
        {this.renderDistributionData(janssen)}

        <h2>Pfizer</h2>
        {this.renderDistributionData(pfizer)}

        <h2>Moderna</h2>
        {this.renderDistributionData(moderna)}
      </div>
    );
  }

  renderDistributionData(distribution: [vaccineAllocationDistribution]) {
    return (
      <>
        <table>
          <thead>
            <tr>
              <td>Week of allocations</td>
              <td>1st dose allocations</td>
              <td>2nd dose allocations</td>
            </tr>
          </thead>
          {Array.isArray(distribution) && distribution.map((data, index) => {
            const {
              jurisdiction,
              week_of_allocations,
              _1st_dose_allocations,
              _2nd_dose_allocations,
            } = data
            const dateAllocated = format(new Date(week_of_allocations), 'MM/dd/yyyy')
            return (
                <tbody key={index}>
                  <tr>
                    <td>{dateAllocated}</td>
                    <td>{_1st_dose_allocations}</td>
                    <td>{_2nd_dose_allocations}</td>
                  </tr>
                </tbody>
            )
          })}
        </table>
      </>
    )
  }

  renderCasesAndDeaths(casesAndDeaths: [casesAndDeaths]) {
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
                state,
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
