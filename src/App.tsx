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
    fusioncenter_base_url: 'https://fusioncenter.nhit.org/resource/',
    healthdata_base_url: 'https://healthdata.gov/resource/',
    dataset_identifiers: {
      cases_and_deaths_by_state_over_time: '9mfq-cb36',
      diagnostic_laboratory_polymerase_chain_reaction_testing: 'j8mb-icvb',
      patient_impact_and_hospital_capacity: 'g62h-syeh',
      vaccine_distributions_and_administration: 'q8wb-4vhy',
      vaccine_federal_pharmacy_partnership_for_long_term_care_program: 'p27c-rmkm',
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
  vaccineDistributionAndAdministrationRef: React.RefObject<HTMLCanvasElement>
  vaccineFederalPharmacyPartnershipForLongTermCareProgramRef: React.RefObject<HTMLCanvasElement>

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
    this.vaccineDistributionAndAdministrationRef = React.createRef()
    this.vaccineFederalPharmacyPartnershipForLongTermCareProgramRef = React.createRef()

    this.handleOnChange = this.handleOnChange.bind(this)
    this.fetchData = this.fetchData.bind(this)
    this.setChart = this.setChart.bind(this)

    this.state = {
      cdc: {
        casesAndDeathsByStateOverTime: [],
      },
      fusioncenter: {
        vaccineDistributionsAndAdministration: [],
        vaccineFederalPharmacyPartnershipForLongTermCareProgram: [],
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
      fusioncenter_base_url,
      healthdata_base_url,
      dataset_identifiers,
    } = socrata
    const {
      cases_and_deaths_by_state_over_time,
      diagnostic_laboratory_polymerase_chain_reaction_testing,
      patient_impact_and_hospital_capacity,
      vaccine_distributions_and_administration,
      vaccine_federal_pharmacy_partnership_for_long_term_care_program,
    } = dataset_identifiers

    const [
      stateName,
      stateAbbreviation
    ] = state.split(',')

    const today = new Date()
    const thisMonth = today.getMonth()
    const lastMonth = thisMonth ? thisMonth - 1 : thisMonth
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

      // Vaccine Distributions and Administration
      fetchJSONData({
        baseUrl: fusioncenter_base_url,
        datasetIdentifier: vaccine_distributions_and_administration,
        filters: `&state_territory_federal_entity=${stateName}`,
      }),

      // Vaccine Administered through Federal Pharmacy Partnership for Long Term Care Program
      fetchJSONData({
        baseUrl: fusioncenter_base_url,
        datasetIdentifier: vaccine_federal_pharmacy_partnership_for_long_term_care_program,
        filters: `&state_territory=${stateName}`,
      }),
    ])
      .then(data => {
        this.setState({
          cdc: {
            casesAndDeathsByStateOverTime: data[0],
          },
          fusioncenter: {
            vaccineDistributionsAndAdministration: data[4],
            vaccineFederalPharmacyPartnershipForLongTermCareProgram: data[5],
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
          cdc,
          fusioncenter,
          healthdata,
        } = this.state
        const {
          casesAndDeathsByStateOverTime,
        } = cdc
        const {
          diagnosticLaboratoryPolymeraseChainReactionTesting,
          patientImpactAndHospitalCapacity,
        } = healthdata
        const {
          positive: polymeraseChainReactionPositive,
          negative: polymeraseChainReactionNegative,
        } = diagnosticLaboratoryPolymeraseChainReactionTesting
        const {
          vaccineDistributionsAndAdministration,
          vaccineFederalPharmacyPartnershipForLongTermCareProgram,
        } = fusioncenter

        // Vaccine Distribution and Administration
        this.setChart({
          id: 'vaccineDistributionAndAdministration',
          chartType: 'horizontalBar',
          color: 'rgb(0,155,59,0.75)',
          customData: {
            labels: [
              'Total Distributed',
              'Total Administered',
              'Distributed per 100k',
              'Administered per 100k',
              'People with 1st dose',
              'People with 1st dose per 100k',
              'People with 2nd dose',
              'People with 2nd dose per 100k',
            ],
            datasetData: [
              vaccineDistributionsAndAdministration[0].total_distributed,
              vaccineDistributionsAndAdministration[0].total_administered,
              vaccineDistributionsAndAdministration[0].distributed_per_100k,
              vaccineDistributionsAndAdministration[0].administered_per_100k,
              vaccineDistributionsAndAdministration[0].people_with_1_doses,
              vaccineDistributionsAndAdministration[0].people_with_1_doses_per_100k,
              vaccineDistributionsAndAdministration[0].people_with_2_doses,
              vaccineDistributionsAndAdministration[0].people_with_2_doses_per_100k,
            ],
          },
          label: 'Vaccine Distribution and Administration',
          ref: this.vaccineDistributionAndAdministrationRef,
        })

        // Polymerase Chain Reaction Negative
        this.setChart({
          id: 'polymeraseChainReactionNegative',
          chartType: 'bar',
          color: 'rgb(79,156,237,0.75)',
          data: polymeraseChainReactionNegative,
          filter: {
            date: 'date',
            identifier: 'total_results_reported',
          },
          label: 'Polymerase Chain Reaction (PCR) Testing - Negative',
          ref: this.polymeraseChainReactionNegativeRef,
        })

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

        // Vaccine Distribution and Administration
        this.setChart({
          id: 'vaccineFederalPharmacyPartnershipForLongTermCareProgram',
          chartType: 'horizontalBar',
          color: 'rgb(0,155,59,0.75)',
          customData: {
            labels: [
              'Total Long Term Care Doses Administered',
              'People in Long Term Care with 1st Dose',
              'People in Long Term Care with 2nd Dose',
            ],
            datasetData: [
              vaccineFederalPharmacyPartnershipForLongTermCareProgram[0].total_ltc_doses_adminstered,
              vaccineFederalPharmacyPartnershipForLongTermCareProgram[0].people_in_ltc_with_1_doses,
              vaccineFederalPharmacyPartnershipForLongTermCareProgram[0].people_in_ltc_with_2_doses,
            ],
          },
          data: casesAndDeathsByStateOverTime,
          label: 'Vaccine Federal Pharmacy Partnership for Long Term Care Program',
          ref: this.vaccineFederalPharmacyPartnershipForLongTermCareProgramRef,
        })
      })
  }

  setChart({
    id,
    chartType,
    color,
    customData,
    data,
    filter,
    label,
    ref,
  }:
  {
    id: string;
    chartType: string;
    color: string;
    customData?: {
      labels: string[];
      datasetData: number[];
    };
    data?: [dataItem];
    filter?: {
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

    let labels: string[] = []
    let datasetData: number[] = []

    if (data) {
      const recentData = data.slice(-7)
      if (filter && filter.date) {
        labels = recentData.map((
          dataItem: dataItem
        ) => format(new Date(dataItem[filter.date]), 'MM/dd'))
      }

      if (filter && filter.identifier) {
        datasetData = recentData.map((
          dataItem: dataItem
        ) => Number(dataItem[filter.identifier]))
      }
    }

    if (customData) {
      if (customData.labels && customData.labels.length) {
        labels = customData.labels
      }

      if (customData.datasetData && customData.datasetData.length) {
        datasetData = customData.datasetData
      }
    }

    const canvasElement = ref.current || ''
    const newChart = new Chart(canvasElement, {
      type: chartType,
      data: {
        labels,
        datasets: [
          {
            label,
            backgroundColor: color,
            borderColor: color,
            data: datasetData,
            fill: false
          }
        ]
      },
      options: {
        maintainAspectRatio: false,
        responsive: true,
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
      cdc,
      fusioncenter,
      healthdata,
    } = this.state
    const {
      casesAndDeathsByStateOverTime,
    } = cdc
    const {
      diagnosticLaboratoryPolymeraseChainReactionTesting,
      patientImpactAndHospitalCapacity,
    } = healthdata
    const {
      positive: polymeraseChainReactionPositive,
      negative: polymeraseChainReactionNegative,
    } = diagnosticLaboratoryPolymeraseChainReactionTesting
    const {
      vaccineDistributionsAndAdministration,
      vaccineFederalPharmacyPartnershipForLongTermCareProgram,
    } = fusioncenter

    const canvasWrapperStyles = {
    }
    const canvasStyle = {
      Position: 'relative',
      width: '100%',
      height: '40vh',
      padding: '2vw 0',
      display: 'inline-block',
    }

    return (
      <div className="App">
        <h1 className="heading">US Covid-19 Statistics</h1>
        <p className="blurb">
          This tool gathers and visually presents publicly available covid-19 related datasets using charts to show time period cases, 
          vaccine data, testing statistics and hospitalized patient numbers. It collects resources from the following government agencies and public organizations:
          {' '}<a href="https://www.cdc.gov/" target="_blank" rel="noreferrer">Centers for Disease Control and Prevention</a>, 
          {' '}<a href="https://healthdata.gov/" target="_blank" rel="noreferrer">Health Data</a>, 
          and <a href="http://www.nhit.org/" target="_blank" rel="noreferrer">National Health IT Collaborative for the Underserved</a>.
          {' '}This tool is intended for informational purposes only to inform the public of the virus' trends and also to compare historical data.
          <br/><br/>
          If you would like to contribute to the project check out the <a href="https://github.com/rabyyuson/covid-stats" target="_blank" rel="noreferrer">project repository</a>. 
          To begin select a state from the drop down.
        </p>
        <select
          className="dropdown"
          onChange={(event) => this.handleOnChange(event.target.value)}
        >
          <option>Select a state</option>
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

        {Boolean(vaccineDistributionsAndAdministration.length) && (
          <>
            <div style={canvasWrapperStyles}>
              <div style={canvasStyle}>
                <canvas ref={this.vaccineDistributionAndAdministrationRef} />
              </div>
            </div>
          </>
        )}
        
        {(
          (polymeraseChainReactionPositive && Boolean(polymeraseChainReactionPositive.length)) && 
          (polymeraseChainReactionNegative && Boolean(polymeraseChainReactionNegative.length))
        ) && (
          <>
            <div style={canvasWrapperStyles}>
              <div style={canvasStyle}>
                <canvas ref={this.polymeraseChainReactionNegativeRef} />
              </div>

              <div style={canvasStyle}>
                <canvas ref={this.polymeraseChainReactionPositiveRef} />
              </div>
            </div>
          </>
        )}

        {Boolean(patientImpactAndHospitalCapacity.length) && (
          <>
            <div style={canvasWrapperStyles}>
              <div style={canvasStyle}>
                <canvas ref={this.confirmedHospitalizedAdultsRef} />
              </div>

              <div style={canvasStyle}>
                <canvas ref={this.confirmedHospitalizedChildrenRef} />
              </div>
            </div>
          </>
        )}

        {Boolean(casesAndDeathsByStateOverTime.length) && (
          <>
            <div style={canvasWrapperStyles}>
              <div style={canvasStyle}>
                <canvas ref={this.confirmedCasesRef} />
              </div>
              
              <div style={canvasStyle}>
                <canvas ref={this.confirmedDeathsRef} />
              </div>
            </div>

            <div style={canvasWrapperStyles}>
              <div style={canvasStyle}>
                <canvas ref={this.newCasesRef} />
              </div>
              
              <div style={canvasStyle}>
                <canvas ref={this.newDeathsRef} />
              </div>
            </div>
          </>
        )}

        {Boolean(vaccineFederalPharmacyPartnershipForLongTermCareProgram.length) && (
          <>
            <div style={canvasWrapperStyles}>
              <div style={canvasStyle}>
                <canvas ref={this.vaccineFederalPharmacyPartnershipForLongTermCareProgramRef} />
              </div>
            </div>
          </>
        )}
      </div>
    );
  }
}

export default App;
