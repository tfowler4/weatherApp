import React from 'react';
import axios from 'axios';
import moment from 'moment-timezone';
import Highcharts from 'highcharts';

// Rigor Test API keys, normally they wouldn't be stored here
const WEATHER_API_KEY = '524589f12ff60e2a150e470595208862';
const GEO_API_KEY = '0264db5477fe4b1c9ee9ae23b3ec59e5';

// Atlanta, GA
const DEFAULT_LAT = '33.753746';
const DEFAULT_LONG = '-84.386330';

class App extends React.Component {
  constructor(props) {
      super(props);

      this.state = {
        current_weather: {},
        hourly_weather: [],
        weekly_weather: [],
        is_weather_data_loaded: false,
        user_lat: '',
        user_long: '',
        weather_location: ''
      };
  }

  componentDidMount() {
    try {
      // once the user location is set will then begin loading weather information
      // taking this route because html5 geolocation doesn't like async/await
      this.set_user_location();
    } catch (ex) {
      console.log('componentDidMount ex', ex);
    }
  }

  load_highcharts() {
    try {
      let hours = [];
      let temperatures = [];

      this.state.hourly_weather.map((item, index) => {
        if ( index < 8 ) { // get the first 8 hours
          hours.push(moment.unix(item.dt).format('h A'));
          temperatures.push(Math.round(item.temp));
        }
      });

      Highcharts.chart('hourly-highcharts-container', {
        chart: {
            height: '150px',
            type: 'area'
        },
        title: {
            text: ''
        },
        xAxis: {
            categories: hours
        },
        series: [{
            name: '',
            data: temperatures
        }],
        plotOptions: {
          area: {
              dataLabels: {
                  enabled: true
              },
              enableMouseTracking: false
          }
        },
        legend: {
          enabled: false
        },
        yAxis: {
          visible: false
        }
      });
    } catch (ex) {
      console.log('load_highcharts ex', ex);
    }
  }

  get_daily_forecast_item(item) {
    try {
      return(
        <>
          <div className={ 'd-flex flex-column align-items-center ml-4 mr-4' }>
            <span className={ 'text-muted' }>{ moment.unix(item.dt).format('ddd') }</span>
            <img alt={ item.weather[0].icon } src={ `http://openweathermap.org/img/wn/${item.weather[0].icon}.png` } />

            <div className={ 'd-flex align-items-center justify-content-start' }>
              <span className={ 'mr-1 font-weight-bold' }>{ Math.round(item.temp.max) }</span><sup className={ '' }>&deg;</sup>
              <span className={ 'ml-1 text-muted' }>{ Math.round(item.temp.min) }</span><sup className={ '' }>&deg;</sup>
            </div>
          </div>
        </>
      )
    } catch (ex) {
      console.log('get_daily_forecast_item', ex);
    }
  }

  async get_location_name(lat, long) {
    let location = '';

    try {
      const api_url = `https://api.opencagedata.com/geocode/v1/json?q=${lat}+${long}&key=${GEO_API_KEY}&pretty=1`;
      const response = await this.make_get_request(api_url);

      if ( response && response.data ) {
        const location_data = response.data.results[0];

        if ( location_data.components.city ) { // if for some reason it doesn't return a city, return the county
          location = `${location_data.components.city}, ${location_data.components.state_code}`;
        } else if ( location_data.components.county ) {
          location = `${location_data.components.county}, ${location_data.components.state_code}`;
        } else {
          location = `N/A, ${location_data.components.state_code}`;
        }
      }
    } catch (ex) {
      console.log('get_location_name ex', ex);
    }

    return location;
  }

  async make_get_request(url) {
    try {
        let response = null;

        await axios.get(url)
        .then((payload) => {
          response = payload;
        })
        .catch((error) => {
          response = error;
        })
        .finally(() => {

        });

        return response;
    } catch (ex) {
        console.log('make_get_request ex', ex);
    }
  }

  async set_weather_data() {
    try {
      let current_payload = {};
      let weekly_payload  = [];
      let hourly_payload = [];
      const api_url = `https://api.openweathermap.org/data/2.5/onecall?lat=${this.state.user_lat}&lon=${this.state.user_long}&appid=${WEATHER_API_KEY}&units=imperial`;

      const weather_payload = await this.make_get_request(api_url);

      if ( weather_payload.status === 200 ) {
        current_payload = weather_payload.data.current;
        weekly_payload = weather_payload.data.daily;
        hourly_payload = weather_payload.data.hourly;

        // we only want 5 day forecast, but they gave us 8;
        weekly_payload = weekly_payload.splice(1, 5);
      }

      this.setState({
        current_weather: current_payload,
        hourly_weather: hourly_payload,
        weekly_weather: weekly_payload,
        is_weather_data_loaded: weather_payload && weather_payload.status === 200 ? true : false
      }, () => {
        if ( this.state.hourly_weather ) {
          this.load_highcharts();
        }
      });
    } catch (ex) {
      console.log('set_weather_data ex', ex);
    }
  }

  set_user_location() {
    try {
      const that = this;

      navigator.geolocation.getCurrentPosition(async (payload) => {
        that.setState({
          user_lat: payload.coords.latitude,
          user_long: payload.coords.longitude,
          weather_location: await that.get_location_name(payload.coords.latitude, payload.coords.longitude)
        }, () => {
          that.set_weather_data();
        });
      }, async (failure) => {
        // user prevented geolocation, use default
        that.setState({
          user_lat: DEFAULT_LAT,
          user_long: DEFAULT_LONG,
          weather_location: await that.get_location_name(DEFAULT_LAT, DEFAULT_LONG)
        }, () => {
          that.set_weather_data();
        });
      });
    } catch (ex) {
      console.log('set_user_location ex', ex);
    }
  }

  render() {
    return(
      <div className={ 'container' }>
        { this.state.is_weather_data_loaded ?
          <>
            {/* current forecast */}
            <div className={ 'row justify-content-center' }>
              <div className={ 'col d-flex flex-column align-items-center' }>
                <span className={ 'text-muted ml-3' }>{ this.state.weather_location }</span>
                <span className={ 'text-muted ml-3' }>{ moment.unix(this.state.current_weather.dt).format('dddd hh:mm A') }</span>
                <span className={ 'text-muted ml-3' }>{ this.state.current_weather.weather[0].main }</span>

                <div className={ 'd-flex align-items-center justify-content-start' }>
                  <img alt={ this.state.current_weather.weather[0].icon } src={ `http://openweathermap.org/img/wn/${this.state.current_weather.weather[0].icon}.png` } />
                  <span className={ 'h2 m-0' }>{ Math.round(this.state.current_weather.temp) }</span><sup className={ '' }>&#x2109;</sup>
                </div>
              </div>
            </div>

            {/* hourly forecast */}
            <div className={ 'row justify-content-center' }>
              <div className={ 'col d-flex justify-content-center' }>
                <div id={ 'hourly-highcharts-container' } className={ 'mb-3' }></div>
              </div>
            </div>

            {/* nex 6 day forecast */}
            <div className={ 'row justify-content-center' }>
              <div className={ 'col d-flex justify-content-center' }>
                { this.state.weekly_weather.map((item, index) => {
                  return(
                    this.get_daily_forecast_item(item)
                  )
                })}
              </div>
            </div>
          </>
        :
          <>
            <div className={ 'row justify-content-center' }>
              <div className={ 'col d-flex flex-column align-items-center' }>
                Loading Weather Data...
              </div>
            </div>
          </>
        }
      </div>
    )
  }
}

export default App;
