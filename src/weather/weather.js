import { faCloudBolt, faCloudMoon, faCloudMoonRain, faCloudSun, faCloudSunRain, faMoon, faSun } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React from 'react'
import Toast from 'react-bootstrap/Toast';

const WeatherIcons = {
  "01d": <FontAwesomeIcon icon={faSun} />,
  "01n": <FontAwesomeIcon icon={faMoon} />,
  "02d": <FontAwesomeIcon icon={faSun} />,
  "02n":<FontAwesomeIcon icon={faCloudMoon} />,
  "03d": <FontAwesomeIcon icon={faCloudSun} />,
  "03n": <FontAwesomeIcon icon={faCloudSun} />,
  "04d": <FontAwesomeIcon icon={faSun} />,
  "04n": <FontAwesomeIcon icon={faCloudMoon} />,
  "09d": <FontAwesomeIcon icon={faCloudSunRain} />,
  "09n": <FontAwesomeIcon icon={faCloudMoonRain} />,
  "10d": <FontAwesomeIcon icon={faCloudSunRain} />,
  "10n": <FontAwesomeIcon icon={faCloudMoonRain} />,
  "11d": <FontAwesomeIcon icon={faCloudBolt} />,
  "11n": <FontAwesomeIcon icon={faCloudBolt} />,
};

const WeatherInfoComponent = (props) => {
  const {name, value} = props;
  return (
      <div className='weather-info'>
          <div className='weather-info-label'>
              {value}
              <span>{name}</span>
          </div>
      </div>
  );
};

/**
 * Represents a Weather component.
 * 
 * @param {Object} weather - The weather data.
 * @returns {JSX.Element} - The rendered Weather component.
 */

function Weather(weather) {
  if (weather){
    let data = weather.weather
    const isDay = data?.weather[0].icon?.includes('d')
    const getTime = (timeStamp) => {
      return `${new Date(timeStamp * 1000).getHours()} : ${new Date(timeStamp * 1000).getMinutes()}`
    }
    return (
        <Toast style={{zIndex:9999}}>
          <Toast.Header closeButton={false}>
            <div className='weather-header'>
              <span>{data.main?.temp + ' °C'}</span>
               {`  |  ${data?.weather[0].description}  |  `} 
               {WeatherIcons[data?.weather[0].icon]}
            </div>
          </Toast.Header>
          <Toast.Body>
            <div className='weather-header-location'>
                {`${data?.name}, ${data?.sys?.country}`}
            </div>
            <div className='weather-info-title'>Weather Info</div>
            <div className='weather-info-container '>
                <WeatherInfoComponent name={isDay ? "sunset" : "sunrise"}
                                      value={`${getTime(data?.sys[isDay ? "sunset" : "sunrise"])}`}/>
                <WeatherInfoComponent name={"humidity"} value={data?.main?.humidity + ' %'}/>
                <WeatherInfoComponent name={"wind"} value={data?.wind?.speed + ' m/s'}/>
                <WeatherInfoComponent name={"pressure"} value={data?.main?.pressure+ ' hPa'}/>
               
            </div>
          </Toast.Body>
        </Toast>
    )
  }
}

export default Weather