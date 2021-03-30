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
    this.renderData = this.renderData.bind(this)

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
      charts: {},
      loading: false,
    }
  }

  fetchData(state: string) {
    this.setState({ loading: true })

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
          },
          loading: false,
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
          vaccineDistributionsAndAdministration: vaccDistAdmin,
          vaccineFederalPharmacyPartnershipForLongTermCareProgram: vaccFedPharPartLTC,
        } = fusioncenter

        // Vaccine Distribution and Administration
        this.setChart({
          id: 'vaccineDistributionAndAdministration',
          chartType: 'horizontalBar',
          color: 'rgb(0,155,59,0.75)',
          customData: {
            labels: [
              'Doses Distributed',
              'Doses Administered',
              'Distributed per 100k',
              'Administered per 100k',
              'People with 1st dose',
              'People with 1st dose per 100k',
              'People with 2nd dose',
              'People with 2nd dose per 100k',
            ],
            datasetData: [
              vaccDistAdmin && vaccDistAdmin[0] && vaccDistAdmin[0].total_distributed,
              vaccDistAdmin && vaccDistAdmin[0] && vaccDistAdmin[0].total_administered,
              vaccDistAdmin && vaccDistAdmin[0] && vaccDistAdmin[0].distributed_per_100k,
              vaccDistAdmin && vaccDistAdmin[0] && vaccDistAdmin[0].administered_per_100k,
              vaccDistAdmin && vaccDistAdmin[0] && vaccDistAdmin[0].people_with_1_doses,
              vaccDistAdmin && vaccDistAdmin[0] && vaccDistAdmin[0].people_with_1_doses_per_100k,
              vaccDistAdmin && vaccDistAdmin[0] && vaccDistAdmin[0].people_with_2_doses,
              vaccDistAdmin && vaccDistAdmin[0] && vaccDistAdmin[0].people_with_2_doses_per_100k,
            ],
          },
          label: 'Vaccine Distribution and Administration',
          ref: this.vaccineDistributionAndAdministrationRef,
        })

        // Polymerase Chain Reaction Negative
        this.setChart({
          id: 'polymeraseChainReactionNegative',
          chartType: 'bar',
          color: 'rgb(166,174,169,0.75)',
          data: polymeraseChainReactionNegative,
          filter: {
            date: 'date',
            identifier: 'total_results_reported',
          },
          label: 'Polymerase Chain Reaction Testing - Negative',
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
          label: 'Polymerase Chain Reaction Testing - Positive',
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

        // New Deaths
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
          chartType: 'bar',
          color: 'rgb(0,155,59,0.75)',
          customData: {
            labels: [
              'Doses Administered',
              'People with 1st Dose',
              'People with 2nd Dose',
            ],
            datasetData: [
              vaccFedPharPartLTC && vaccFedPharPartLTC[0] && vaccFedPharPartLTC[0].total_ltc_doses_adminstered,
              vaccFedPharPartLTC && vaccFedPharPartLTC[0] && vaccFedPharPartLTC[0].people_in_ltc_with_1_doses,
              vaccFedPharPartLTC && vaccFedPharPartLTC[0] && vaccFedPharPartLTC[0].people_in_ltc_with_2_doses,
            ],
          },
          data: casesAndDeathsByStateOverTime,
          label: 'Federal Pharmacy Partnership for Long Term Care Program',
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
            fill: false,
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
      ...this.state,
    })
  }

  handleOnChange(state: string) {
    this.fetchData(state)
  }

  render() {
    const { loading } = this.state
    const today = new Date()

    return (
      <div className="App">
        <div className="title">
          <svg className="logo" viewBox="0 0 40 40">
            <path d="M34.4,16.5c-1.6,0-2.8,1.1-3.1,2.6h-1c-0.1-2.6-1.2-5-2.9-6.8l1.7-1.7c0.5,0.4,1.2,0.7,1.9,0.7c1.7,0,3.1-1.4,3.1-3.1
              c0-1.7-1.4-3.1-3.1-3.1S28,6.5,28,8.2c0,0.6,0.2,1.2,0.5,1.7l-1.8,1.8C25,10,22.6,9,20.1,8.9V7.8c0,0,0,0,0,0
              c1.5-0.2,2.6-1.5,2.6-3.1c0-1.7-1.4-3.1-3.1-3.1S16.5,3,16.5,4.7c0,1.6,1.1,2.8,2.6,3.1c0,0,0,0,0,0v1.1c-2.6,0.1-4.9,1.1-6.7,2.8
              L11.7,11c0.4-0.5,0.6-1.1,0.6-1.8c0-1.7-1.4-3.1-3.1-3.1C7.4,6,6,7.4,6,9.2c0,1.7,1.4,3.1,3.1,3.1c0.7,0,1.3-0.2,1.8-0.6l0.7,0.7
              C10,14.2,9,16.6,8.8,19.2H8c-0.2-1.5-1.5-2.6-3.1-2.6c-1.7,0-3.1,1.4-3.1,3.1c0,1.7,1.4,3.1,3.1,3.1c1.6,0,2.8-1.1,3.1-2.6h0.9
              c0.1,2.6,1.2,5,2.8,6.8l-1.3,1.3c0,0,0,0.1-0.1,0.1c-0.5-0.4-1.2-0.6-1.9-0.6c-1.7,0-3.1,1.4-3.1,3.1s1.4,3.1,3.1,3.1
              s3.1-1.4,3.1-3.1c0-0.7-0.2-1.3-0.6-1.8c0,0,0.1,0,0.1-0.1l1.3-1.3c1.8,1.6,4.2,2.7,6.7,2.8v0.9c-1.5,0.2-2.7,1.5-2.7,3.1
              c0,1.7,1.4,3.1,3.1,3.1s3.1-1.4,3.1-3.1c0-1.5-1.1-2.8-2.6-3.1v-0.9c2.6-0.1,5-1.2,6.8-2.9l0.7,0.7c-0.4,0.5-0.7,1.2-0.7,1.9
              c0,1.7,1.4,3.1,3.1,3.1s3.1-1.4,3.1-3.1s-1.4-3.1-3.1-3.1c-0.6,0-1.2,0.2-1.7,0.5l-0.7-0.7c1.6-1.8,2.6-4.1,2.7-6.7h1
              c0.2,1.5,1.5,2.6,3.1,2.6c1.7,0,3.1-1.4,3.1-3.1C37.5,17.9,36.1,16.5,34.4,16.5z M4.9,21.8c-1.2,0-2.1-1-2.1-2.1s1-2.1,2.1-2.1
              s2.1,1,2.1,2.1S6,21.8,4.9,21.8z M8.4,32.9c-1.2,0-2.1-1-2.1-2.1s1-2.1,2.1-2.1s2.1,1,2.1,2.1S9.6,32.9,8.4,32.9z M31.1,6.1
              c1.2,0,2.1,1,2.1,2.1s-1,2.1-2.1,2.1S29,9.4,29,8.2S30,6.1,31.1,6.1z M17.5,4.7c0-1.2,1-2.1,2.1-2.1s2.1,1,2.1,2.1s-1,2.1-2.1,2.1
              S17.5,5.9,17.5,4.7z M9.1,11.3c-1.2,0-2.1-1-2.1-2.1S7.9,7,9.1,7s2.1,1,2.1,2.1S10.3,11.3,9.1,11.3z M21.7,34.4c0,1.2-1,2.1-2.1,2.1
              s-2.1-1-2.1-2.1c0-1.2,1-2.1,2.1-2.1S21.7,33.2,21.7,34.4z M32.2,30.2c0,1.2-1,2.1-2.1,2.1s-2.1-1-2.1-2.1s1-2.1,2.1-2.1
              S32.2,29,32.2,30.2z M26.9,26.1l-1.3-1.3c-0.2-0.2-0.5-0.2-0.7,0c-0.2,0.2-0.2,0.5,0,0.7l1.3,1.3c-1.6,1.5-3.7,2.4-6.1,2.6v-2.2
              c0-0.3-0.2-0.5-0.5-0.5s-0.5,0.2-0.5,0.5v2.2c-2.3-0.1-4.4-1-6-2.5l1.1-1.1c0.2-0.2,0.2-0.5,0-0.7s-0.5-0.2-0.7,0l-1.1,1.1
              c-1.5-1.6-2.4-3.7-2.5-6.1h1.8c0.2,1.5,1.5,2.6,3.1,2.6c1.7,0,3.1-1.4,3.1-3.1c0-1.7-1.4-3.1-3.1-3.1c-1.6,0-2.8,1.1-3.1,2.6H9.8
              c0.1-2.3,1.1-4.5,2.5-6.1l1.5,1.5c0.1,0.1,0.2,0.1,0.4,0.1c0.1,0,0.3,0,0.4-0.1c0.2-0.2,0.2-0.5,0-0.7l-1.5-1.4
              c1.6-1.4,3.7-2.4,6-2.5v2.2c0,0.3,0.2,0.5,0.5,0.5s0.5-0.2,0.5-0.5V9.9c2.3,0.1,4.3,1,5.9,2.4l-0.6,0.6c-0.2,0.2-0.2,0.5,0,0.7
              c0.1,0.1,0.2,0.1,0.4,0.1s0.3,0,0.4-0.1l0.6-0.6c1.5,1.6,2.5,3.8,2.6,6.1H27c-0.3,0-0.5,0.2-0.5,0.5s0.2,0.5,0.5,0.5h2.3
              C29.2,22.5,28.3,24.5,26.9,26.1z M12.6,19.7c0-1.2,1-2.1,2.1-2.1s2.1,1,2.1,2.1s-1,2.1-2.1,2.1S12.6,20.8,12.6,19.7z M34.4,21.8
              c-1.2,0-2.1-1-2.1-2.1s1-2.1,2.1-2.1s2.1,1,2.1,2.1S35.5,21.8,34.4,21.8z M21.4,12.8c-1.7,0-3.1,1.4-3.1,3.1c0,1.7,1.4,3.1,3.1,3.1
              c1.7,0,3.1-1.4,3.1-3.1C24.6,14.2,23.2,12.8,21.4,12.8z M21.4,18.1c-1.2,0-2.1-1-2.1-2.1s1-2.1,2.1-2.1c1.2,0,2.1,1,2.1,2.1
              S22.6,18.1,21.4,18.1z M21.1,20.3c-1.7,0-3.1,1.4-3.1,3.1s1.4,3.1,3.1,3.1s3.1-1.4,3.1-3.1S22.8,20.3,21.1,20.3z M21.1,25.6
              c-1.2,0-2.1-1-2.1-2.1c0-1.2,1-2.1,2.1-2.1c1.2,0,2.1,1,2.1,2.1C23.2,24.6,22.3,25.6,21.1,25.6z"/>
          </svg>
          <h1 className="heading">US Covid-19 Statistics</h1>
        </div>
        <p className="blurb">
          This tool gathers and visually presents publicly available covid-19 related data using charts. It collects open source information from the following government and public organizations:
          {' '}<a href="https://www.cdc.gov/" target="_blank" rel="noreferrer">Centers for Disease Control and Prevention</a>, 
          {' '}<a href="https://healthdata.gov/" target="_blank" rel="noreferrer">Health Data</a>, 
          and <a href="http://www.nhit.org/" target="_blank" rel="noreferrer">National Health IT Collaborative for the Underserved</a>. 
          It generates time period cases, vaccination data, testing statistics and hospitalized patient numbers. The information provided 
          gives insight to the effect of the virus to the community, shows trend by comparing historical results and provides a tool to 
          identify society's contribution to the increase or decrease of the virus' spread.
          <br/><br/>
          To begin select a state from the drop down (take note that some data presented might not be current &mdash; this is because of data verifications and reconciliations which takes time before it can be updated).
          <br/><br/>
          If you would like to contribute to this project please visit the <a href="https://github.com/rabyyuson/us-covid-19-statistics" target="_blank" rel="noreferrer">project repository</a> or send me an <a href="mailto:rabyyusondev@gmail.com">email</a>. 
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

        {loading && (
          <div className="loading">
            Fetching data. Please wait...
          </div>
        )}
        {!loading && this.renderData()}
        
        <div className="footer">
          <a href="https://rabyyuson.dev/">{today.getFullYear()}. Raby Yuson.</a>
        </div>
      </div>
    );
  }

  renderData() {
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

    const canvasStyle = {
      Position: 'relative',
      width: '100%',
      height: '40vh',
      padding: '2vw 0',
      display: 'inline-block',
    }

    return (
      <>
        {Boolean(vaccineDistributionsAndAdministration.length) && (
          <>
            <div style={canvasStyle}>
              <canvas ref={this.vaccineDistributionAndAdministrationRef} />
            </div>
          </>
        )}
        
        {(
          (polymeraseChainReactionPositive && Boolean(polymeraseChainReactionPositive.length)) && 
          (polymeraseChainReactionNegative && Boolean(polymeraseChainReactionNegative.length))
        ) && (
          <>
            <div style={canvasStyle}>
              <canvas ref={this.polymeraseChainReactionNegativeRef} />
            </div>

            <div style={canvasStyle}>
              <canvas ref={this.polymeraseChainReactionPositiveRef} />
            </div>
          </>
        )}

        {Boolean(patientImpactAndHospitalCapacity.length) && (
          <>
            <div style={canvasStyle}>
              <canvas ref={this.confirmedHospitalizedAdultsRef} />
            </div>

            <div style={canvasStyle}>
              <canvas ref={this.confirmedHospitalizedChildrenRef} />
            </div>
          </>
        )}

        {Boolean(casesAndDeathsByStateOverTime.length) && (
          <>
            <div style={canvasStyle}>
              <canvas ref={this.confirmedCasesRef} />
            </div>
            
            <div style={canvasStyle}>
              <canvas ref={this.confirmedDeathsRef} />
            </div>

            <div style={canvasStyle}>
              <canvas ref={this.newCasesRef} />
            </div>
            
            <div style={canvasStyle}>
              <canvas ref={this.newDeathsRef} />
            </div>
          </>
        )}

        {Boolean(vaccineFederalPharmacyPartnershipForLongTermCareProgram.length) && (
          <>
            <div style={canvasStyle}>
              <canvas ref={this.vaccineFederalPharmacyPartnershipForLongTermCareProgramRef} />
            </div>
          </>
        )}
      </>
    )
  }
}

export default App;
