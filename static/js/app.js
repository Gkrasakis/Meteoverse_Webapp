// Data from https://home.openweathermap.org

// // OpenWeather API KEY & Geocoding API KEY constants (fixed values) of API KEYS 
// const weatherAPIKey = "3a0a400ca4722c584ff4d0b65a475dd5" //Needs to be filled with the API KEY from https://home.openweathermap.org --- UPDATED GET FROM DATABASE
// const geocodingAPIKey = "3a0a400ca4722c584ff4d0b65a475dd5" //Needs to be filled with the API KEY from https://home.openweathermap.org --- UPDATED GET FROM DATABASE


//******************************************************************************************************************** */
// Function to fetch the API keys from the backend using XMLHttpRequest
function fetchApiKeys() {
    const getApiKeysUrl = "http://localhost:5000/get-api-keys"; // URL of the backend API

    const xhr_api = new XMLHttpRequest();
    xhr_api.onreadystatechange = function() {
        if (xhr_api.readyState === 4 && xhr_api.status === 200) {  // Check if the request was successful
            const data = JSON.parse(xhr_api.responseText);  // Parse the JSON response
            
            if (data.error) {
                console.error("Error:", data.error);  // Log the error
            } else {
                const weatherAPIKey = data.weatherAPIKey;
                const geocodingAPIKey = data.geocodingAPIKey;   // Extract the secret key
            
                console.log("Weather API Key:", weatherAPIKey);
                console.log("Geocoding API Key:", geocodingAPIKey);
                // save var for use
                window.weatherAPIKey = weatherAPIKey;
                window.geocodingAPIKey = geocodingAPIKey
            }
        } else if (xhr_api.readyState === 4) {
            console.error("Failed to fetch the secret key, Status:", xhr_api.status);  // Log if the request failed
        }
    };

    xhr_api.open('GET', getApiKeysUrl, true);  // Open the request (GET method)
    xhr_api.send();  // Send the request
}

// Call the function to fetch the API keys
fetchApiKeys();
//******************************************************************************************************************** */

// 1. Function to Get City Coordinates (Latitude & Longitude)
// This function takes the city name from the user, queries the geocoding API, 
// and retrieves the latitude and longitude of the city to fetch weather data.
function getCityCoordinates() {
    const city = document.getElementById(`city`).value;
    const APIKEY1 = `${geocodingAPIKey}`;  
    // Important The backtick (` ``) for Dynamic insertion of Variables. Cleaner Syntax. Expression Embedding
    const geocodingUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${city}&appid=${APIKEY1}`;

    const xhr_c = new XMLHttpRequest();
    xhr_c.onreadystatechange = function() {
        if (xhr_c.readyState === 4 && xhr_c.status === 200) {
            console.log("Raw response type: " + typeof xhr_c.responseText);

            // Parse the response as JSON
            const response = JSON.parse(xhr_c.responseText);

            // Log the type of the parsed response
            console.log("Parsed response type: " + typeof response);

            // Ensures that there is at least one match in the response array and with response[0] 
            // I will access the first element of the array (the most relevant search)
            if (response.length > 0) {
                const lat = response[0].lat;
                const lon = response[0].lon;

                // Latitude and longitude at log level
                console.log(`Latitude: ${lat}, Longitude: ${lon}`);
                // Here inside the if statement I have to call get weather function using the retrieved lat and lon
                getWeather(lat, lon, city);
            }else{
                console.error(`No coordinates found for: ${city}`);
            }
         } 
         
        //else {
        // Handle HTTP errors
        // console.error('Error: ' + xhr_c.status); }
    }
    // Here at open method (GET method) geocodingUrl as the URL and true for asynchronous operation.
    xhr_c.open(`GET`, geocodingUrl, true);
    // Sends the request to the server
    xhr_c.send();
};

// 2. Function to Get Weather Data (5-day Forecast)
// This function retrieves the weather forecast for a given set of coordinates (lat, lon).
function getWeather(lat, lon, city) {
    const APIKEY2 = `${weatherAPIKey}`;
    // The get weather function is calling the /forecast call weather for to return current weather data along with changes
    const weatherUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${APIKEY2}&units=metric`;

    const xhr_w = new XMLHttpRequest();
    xhr_w.onreadystatechange = function() {
        if (xhr_w.readyState === 4 && xhr_w.status === 200) {
            console.log("Raw response type: " + typeof xhr_w.responseText);

            // Parse the response as JSON
            const weather_data = JSON.parse(xhr_w.responseText);

            // Here inside the if statement I have to call displayWeatherData using the retrieved lat&lon forecast for 5Day/3Hour for exact city
            displayWeatherData(weather_data, city); // Display the data on the page
        }
        //else {
        // Handle HTTP errors
        // console.error('Error: ' + xhr_w.status); }
    }
    // Here at open method (GET method) geocodingUrl as the URL and true for asynchronous operation.
    xhr_w.open(`GET`, weatherUrl, true);
    // Sends the request to the server
    xhr_w.send();

};

//3. Function to Format and Display Weather Data
// This function formats the retrieved weather data and displays it on the page, 
// grouping forecasts by date and displaying them for every 3 hours.
function displayWeatherData(weatherData, city) {
    const weatherBox = document.getElementById('weatherBox'); // na dhmiourghsw sxhmata gia thn epeksighsh api pyramid for reference!! async opp ,chaining 
    const dailyForecast = {};

    // Group forecasts by date
    weatherData.list.forEach(forecast => {
        const date = forecast.dt_txt.split(' ')[0]; // Extract date part
        if (!dailyForecast[date]) {
            dailyForecast[date] = [];
        }
        dailyForecast[date].push(forecast); // Group by date
    });

    // Starting building the HTML
    let forecastHTML = `<h2 class="city-title">5-Day Weather Forecast for ${city}</h2>`;

    // A for Loop through each date and its forecasts
    for (const [date, forecasts] of Object.entries(dailyForecast)) {
        forecastHTML += `
            <div class="daily-container">
                <h3 class="date-title">${formatDate(date)}</h3>
                <div class="hourly-container">
            `;

        // Add forecasts for every 3 hours
        forecasts.forEach((forecast, index) => {
            const time = forecast.dt_txt.split(' ')[1].slice(0, 5); // Get time (HH:MM)
            const description = capitalizeFirstLetter(forecast.weather[0].description);
            const temperature = Math.round(forecast.main.temp); // No need to convert temperature to celcius 
            // const windSpeed = forecast.wind.speed; // optional
            const icon = forecast.weather[0].icon;
            const day = new Date(forecast.dt_txt).toLocaleString('en-us', { weekday: 'long' });

            // Show data for every 3 hours )
            if (index % 1 === 0) {
                forecastHTML += `
                    <div class="hourly-item">
                        <p><img src="https://openweathermap.org/img/wn/${icon}.png" alt="${description}" class="weather-icon"></p>
                        <p><strong>${day} - ${time}</strong></p>
                        <p>${description}</p>
                        <p>🌡️ ${temperature}°C</p>
                    </div>
                `;
            }
        });

        forecastHTML += '</div></div>'; // Close hourly-container and daily-container
    }

    weatherBox.innerHTML = forecastHTML;
}

// **Utility Functions** (for formatting, capitalizing, etc.)
// Function to format the date to a more readable format (e.g., Jan 15)
function formatDate(date) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(date).toLocaleDateString('en-us', options);
}

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

// **Event Listeners for Form Handling and UI Interactions**
// Handle weather search button click to trigger the getCityCoordinates function
document.addEventListener('DOMContentLoaded', function() {
    // Handle weather search
    const searchWeatherButton = document.getElementById('searchWeather');
    if (searchWeatherButton) {
        searchWeatherButton.addEventListener('click', function() {getCityCoordinates();});
    } else {
        console.error('searchWeather button not found');
    }
});