import React from 'react'
import {Accordion} from 'react-bootstrap';

/**
 * Represents a Weather History component.
 * 
 * @param {Object} weather - The user and the city/location query
 * @returns {JSX.Element} - The rendered Weather History component for the past 7 days.
 */


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

export default function weatherHistory(weathers) {
    let datas = weathers.weather
    let today = new Date()
    const getTime = (timeStamp) => {
        return `${new Date(timeStamp * 1000).getHours()} : ${new Date(timeStamp * 1000).getMinutes()}`
      }
    return (
        <>
        <Accordion style={{width:"400px"}} defaultActiveKey="0">
            {datas.map((data, index) => {
                let day = data.weather;
                let isDay = day[0].icon.includes('d');
                let dayOfWeek = today.getDay() - index;
                let date = new Date(today);
                date.setDate(date.getDate() - index);
                let readableDate = date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                if (dayOfWeek < 0) {
                    dayOfWeek += 7;
                }
                
                let readableDay = '';
                switch (dayOfWeek) {
                    case 0:
                        readableDay = 'Sunday';
                        break;
                    case 1:
                        readableDay = 'Monday';
                        break;
                    case 2:
                        readableDay = 'Tuesday';
                        break;
                    case 3:
                        readableDay = 'Wednesday';
                        break;
                    case 4:
                        readableDay = 'Thursday';
                        break;
                    case 5:
                        readableDay = 'Friday';
                        break;
                    case 6:
                        readableDay = 'Saturday';
                        break;
                    default:
                        break;
                }
                return (
                    <Accordion.Item style={{width:"400px"}} eventKey={index} key={index}>
                        <Accordion.Header style={{width:"400px"}}>{readableDate}</Accordion.Header>
                        <Accordion.Body>
                            <div className='weather-info-container '>
                                <WeatherInfoComponent value={data?.weather[0]?.description}/>
                                <WeatherInfoComponent name={"temperature"} value={data?.main?.temp + ' °C'}/>
                                <WeatherInfoComponent name={"humidity"} value={data?.main?.humidity + ' %'}/>
                                <WeatherInfoComponent name={"wind"} value={data?.wind?.speed + ' m/s'}/>
                            </div>
                        </Accordion.Body>
                    </Accordion.Item>
                );
            })}
            </Accordion>
        </>
    )
}
