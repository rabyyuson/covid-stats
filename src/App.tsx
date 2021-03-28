import fetch from 'cross-fetch'
import usStates from 'states-us'
import { format } from 'date-fns'
import React from 'react'
import Chart from 'chart.js'
import './App.css';

const CONFIG = {
  socrata: {
    app_token: '9UKsqjohDZQ5pRVegZbpkfSww',
    cdc_base_url: 'https://data.cdc.gov/resource/',
    healthdata_base_url: 'https://healthdata.gov/resource/',
    dataset_identifiers: {
      cases_and_deaths_by_state_over_time: '9mfq-cb36',
      diagnostic_laboratory_polymerase_chain_reaction_testing: 'j8mb-icvb',
      patient_impact_and_hospital_capacity: 'g62h-syeh',
    }
  }
}

interface dataItem {
  [key: string]: string;
}

async function fetchJSONData({
  baseUrl,
  datasetIdentifier,
  filters,
}: {
  [key: string]: string
}) {
  const { socrata } = CONFIG
  const { app_token } = socrata
  const requestUrl = `${baseUrl}${datasetIdentifier}.json?$$app_token=${app_token}${filters}`

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
  confirmedHospitalizedAdultsRef: React.RefObject<HTMLCanvasElement>
  confirmedHospitalizedChildrenRef: React.RefObject<HTMLCanvasElement>
  confirmedCasesRef: React.RefObject<HTMLCanvasElement>
  confirmedDeathsRef: React.RefObject<HTMLCanvasElement>
  newCasesRef: React.RefObject<HTMLCanvasElement>
  newDeathsRef: React.RefObject<HTMLCanvasElement>
  polymeraseChainReactionPositiveRef: React.RefObject<HTMLCanvasElement>
  polymeraseChainReactionNegativeRef: React.RefObject<HTMLCanvasElement>

  constructor(props: any) {
    super(props)

    this.confirmedHospitalizedAdultsRef = React.createRef()
    this.confirmedHospitalizedChildrenRef = React.createRef()
    this.confirmedCasesRef = React.createRef()
    this.confirmedDeathsRef = React.createRef()
    this.newCasesRef = React.createRef()
    this.newDeathsRef = React.createRef()
    this.polymeraseChainReactionPositiveRef = React.createRef()
    this.polymeraseChainReactionNegativeRef = React.createRef()

    this.handleOnChange = this.handleOnChange.bind(this)
    this.fetchData = this.fetchData.bind(this)
    this.setChart = this.setChart.bind(this)

    this.state = {
      cdcData: {
        casesAndDeathsByStateOverTime: [],
      },
      healthdata: {
        diagnosticLaboratoryPolymeraseChainReactionTesting: {},
        patientImpactAndHospitalCapacity: []
      },
      charts: {}
    }
  }

  fetchData(state: string) {
    const { socrata } = CONFIG
    const {
      cdc_base_url,
      healthdata_base_url,
      dataset_identifiers,
    } = socrata
    const {
      cases_and_deaths_by_state_over_time,
      diagnostic_laboratory_polymerase_chain_reaction_testing,
      patient_impact_and_hospital_capacity,
    } = dataset_identifiers

    const [
      stateName,
      stateAbbreviation
    ] = state.split(',')

    const today = new Date()
    const month = today.getMonth()
    const lastMonth = month ? month - 1 : month
    const dayLastMonth = `${format(new Date(today.getFullYear(), lastMonth), 'yyyy-MM-01')}T00:00:00.000`

    Promise.all([
      // Cases and deaths
      fetchJSONData({
        baseUrl: cdc_base_url,
        datasetIdentifier: cases_and_deaths_by_state_over_time,
        filters: `&state=${stateAbbreviation}&$order=submission_date ASC&$where=submission_date >= '${dayLastMonth}'`,
      }),

      // Patient impact and hospital capacity
      fetchJSONData({
        baseUrl: healthdata_base_url,
        datasetIdentifier: patient_impact_and_hospital_capacity,
        filters: `&state=${stateAbbreviation}&$order=date ASC&$where=date >= '${dayLastMonth}'`,
      }),

      // Polymerase Chain Reaction Testing - Positive
      fetchJSONData({
        baseUrl: healthdata_base_url,
        datasetIdentifier: diagnostic_laboratory_polymerase_chain_reaction_testing,
        filters: `&overall_outcome=Positive&state=${stateAbbreviation}&$order=date ASC&$where=date >= '${dayLastMonth}'`,
      }),

      // Polymerase Chain Reaction Testing - Negative
      fetchJSONData({
        baseUrl: healthdata_base_url,
        datasetIdentifier: diagnostic_laboratory_polymerase_chain_reaction_testing,
        filters: `&overall_outcome=Negative&state=${stateAbbreviation}&$order=date ASC&$where=date >= '${dayLastMonth}'`,
      }),
    ])
      .then(data => {
        // console.log(data)
        this.setState({
          cdcData: {
            casesAndDeathsByStateOverTime: data[0],
          },
          healthdata: {
            patientImpactAndHospitalCapacity: data[1],
            diagnosticLaboratoryPolymeraseChainReactionTesting: {
              positive: data[2],
              negative: data[3],
            },
          }
        })

        const {
          cdcData,
          healthdata,
        } = this.state
        const { casesAndDeathsByStateOverTime } = cdcData
        const {
          diagnosticLaboratoryPolymeraseChainReactionTesting,
          patientImpactAndHospitalCapacity
        } = healthdata
        const {
          positive: polymeraseChainReactionPositive,
          negative: polymeraseChainReactionNegative,
        } = diagnosticLaboratoryPolymeraseChainReactionTesting

        if (
          !casesAndDeathsByStateOverTime.length ||
          !patientImpactAndHospitalCapacity.length ||
          !polymeraseChainReactionPositive.length ||
          !polymeraseChainReactionNegative.length
        ) {
          return
        }

        // Polymerase Chain Reaction Positive
        this.setChart({
          id: 'polymeraseChainReactionPositive',
          chartType: 'bar',
          color: 'rgb(242,57,57,0.75)',
          data: polymeraseChainReactionPositive,
          filter: {
            date: 'date',
            identifier: 'total_results_reported',
          },
          label: 'Polymerase Chain Reaction (PCR) Testing - Positive',
          ref: this.polymeraseChainReactionPositiveRef,
        })

        // Polymerase Chain Reaction Negative
        this.setChart({
          id: 'polymeraseChainReactionNegative',
          chartType: 'bar',
          color: 'rgb(242,57,57,0.75)',
          data: polymeraseChainReactionNegative,
          filter: {
            date: 'date',
            identifier: 'total_results_reported',
          },
          label: 'Polymerase Chain Reaction (PCR) Testing - Negative',
          ref: this.polymeraseChainReactionNegativeRef,
        })

        // Confirmed Hospitalized Adults
        this.setChart({
          id: 'confirmedHospitalizedAdults',
          chartType: 'line',
          color: 'rgb(242,57,57,0.75)',
          data: patientImpactAndHospitalCapacity,
          filter: {
            date: 'date',
            identifier: 'total_adult_patients_hospitalized_confirmed_covid',
          },
          label: 'Confirmed Hospitalized Adults',
          ref: this.confirmedHospitalizedAdultsRef,
        })


        // Confirmed Hospitalized Children
        this.setChart({
          id: 'confirmedHospitalizedChildren',
          chartType: 'line',
          color: 'rgb(242,57,57,0.75)',
          data: patientImpactAndHospitalCapacity,
          filter: {
            date: 'date',
            identifier: 'total_pediatric_patients_hospitalized_confirmed_covid',
          },
          label: 'Confirmed Hospitalized Children',
          ref: this.confirmedHospitalizedChildrenRef,
        })

        // Confirmed Cases
        this.setChart({
          id: 'confirmedCases',
          chartType: 'bar',
          color: 'rgb(242,57,57,0.75)',
          data: casesAndDeathsByStateOverTime,
          filter: {
            date: 'submission_date',
            identifier: 'conf_cases',
          },
          label: 'Confirmed Cases',
          ref: this.confirmedCasesRef,
        })

        // Confirmed Deaths
        this.setChart({
          id: 'confirmedDeaths',
          chartType: 'bar',
          color: 'rgb(242,57,57,0.75)',
          data: casesAndDeathsByStateOverTime,
          filter: {
            date: 'submission_date',
            identifier: 'conf_death',
          },
          label: 'Confirmed Deaths',
          ref: this.confirmedDeathsRef,
        })

        // New Cases
        this.setChart({
          id: 'newCases',
          chartType: 'line',
          color: 'rgb(242,57,57,0.75)',
          data: casesAndDeathsByStateOverTime,
          filter: {
            date: 'submission_date',
            identifier: 'new_case',
          },
          label: 'New Cases',
          ref: this.newCasesRef,
        })

        // Confirmed Deaths
        this.setChart({
          id: 'newDeaths',
          chartType: 'line',
          color: 'rgb(242,57,57,0.75)',
          data: casesAndDeathsByStateOverTime,
          filter: {
            date: 'submission_date',
            identifier: 'new_death',
          },
          label: 'New Deaths',
          ref: this.newDeathsRef,
        })
      })
  }

  setChart({
    id,
    chartType,
    color,
    data,
    filter,
    label,
    ref,
  }:
  {
    id: string;
    chartType: string;
    color: string;
    data: [dataItem],
    filter: {
      date: string;
      identifier: string;
    };
    label: string;
    ref: React.RefObject<HTMLCanvasElement>;
  }) {
    const { charts } = this.state
    const existingChart = charts[id]
    if (existingChart) {
      existingChart.destroy()
    }

    const recentData = data.slice(-7)
    const canvasElement = ref.current || ''
    const newChart = new Chart(canvasElement, {
      type: chartType,
      data: {
        labels: recentData.map((
          dataItem: dataItem
        ) => format(new Date(dataItem[filter.date]), 'MM/dd')),
        datasets: [
          {
            label,
            backgroundColor: color,
            borderColor: color,
            data: recentData.map((
              dataItem: dataItem
            ) => Number(dataItem[filter.identifier])),
            fill: false
          }
        ]
      },
      options: {
        maintainAspectRatio: false,
      }
    })

    charts[id] = newChart
    this.setState({
      charts,
      ...this.state
    })
  }

  handleOnChange(state: string) {
    this.fetchData(state)
  }

  render() {
    const {
      cdcData,
      healthdata,
    } = this.state
    const { casesAndDeathsByStateOverTime } = cdcData
    const {
      diagnosticLaboratoryPolymeraseChainReactionTesting,
      patientImpactAndHospitalCapacity,
    } = healthdata
    const {
      positive: polymeraseChainReactionPositive,
      negative: polymeraseChainReactionNegative,
    } = diagnosticLaboratoryPolymeraseChainReactionTesting

    const headingStyle = {
      margin: '0 0 20px 0',
    }
    const stateSelectStyles = {
      fontSize: '18px',
      padding: '10px',
      FontWeight: 'bold',
    }
    const canvasWrapperStyles = {
      display: 'flex',
      FlexDirection: 'row',
    }
    const canvasStyles = {
      Position: 'relative',
      width: '500px',
      height: '300px',
    }

    return (
      <div className="App">
        <h1 style={headingStyle}>Covid-19 Statistics</h1>
        <select
          style={stateSelectStyles}
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
        
        {(
          (polymeraseChainReactionPositive && Boolean(polymeraseChainReactionPositive.length)) && 
          (polymeraseChainReactionNegative && Boolean(polymeraseChainReactionNegative.length))
        ) && (
          <>
            <br/><br/><br/>
            <div style={canvasWrapperStyles}>
              <div style={canvasStyles}>
                <canvas ref={this.polymeraseChainReactionPositiveRef} />
              </div>
              
              <div style={canvasStyles}>
                <canvas ref={this.polymeraseChainReactionNegativeRef} />
              </div>
            </div>
          </>
        )}

        {Boolean(patientImpactAndHospitalCapacity.length) && (
          <>
            <br/><br/><br/>
            <div style={canvasWrapperStyles}>
              <div style={canvasStyles}>
                <canvas ref={this.confirmedHospitalizedAdultsRef} />
              </div>

              <div style={canvasStyles}>
                <canvas ref={this.confirmedHospitalizedChildrenRef} />
              </div>
            </div>
          </>
        )}

        {Boolean(casesAndDeathsByStateOverTime.length) && (
          <>
            <br/><br/><br/>
            <div style={canvasWrapperStyles}>
              <div style={canvasStyles}>
                <canvas ref={this.confirmedCasesRef} />
              </div>
              
              <div style={canvasStyles}>
                <canvas ref={this.confirmedDeathsRef} />
              </div>
            </div>

            <br/><br/><br/>
            <div style={canvasWrapperStyles}>
              <div style={canvasStyles}>
                <canvas ref={this.newCasesRef} />
              </div>
              
              <div style={canvasStyles}>
                <canvas ref={this.newDeathsRef} />
              </div>
            </div>
          </>
        )}
      </div>
    );
  }
}

export default App;
