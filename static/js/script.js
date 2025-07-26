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
//******************************************************************************************************************** */

// OpenWeatherMap API key and a list of cities I want to collect weather data for.
// Each city has its coordinates predefined to ensure accurate data collection. (IT IS A FREE API SO LIMITED CALLS )
const CITIES = [
    {name: "Athens", lat: 37.9838, lon: 23.7275},
    {name: "Thessaloniki", lat: 40.6401, lon: 22.9444},
    {name: "Corfu", lat: 39.6243, lon: 19.9217},
    {name: "Crete", lat: 35.2401, lon: 24.8093},
    {name: "Larissa", lat: 39.6390, lon: 22.4191},
    {name: "Rhodes", lat: 36.4349, lon: 28.2176}
];

// When the user clicks the collection button, this function is triggered
function startCollection() {
    // I first ask for confirmation because this will overwrite existing data! 
    if (!confirm('This will overwrite existing data with fresh information. Continue?')) {
        return;
    }
    // I show a loading indicator and clear any previous messages
    const status = document.getElementById('status');
    const loader = status.querySelector('.loader');
    const message = document.getElementById('message');
    loader.style.display = 'inline-block';
    message.textContent = '';
    // Here i prepare to collect all weather data and track completion
    let allWeatherData = [];
    let completedRequests = 0;
    // For each city in my predefined list:
    CITIES.forEach(city => {
        // I construct the API URL using the city's coordinates
        const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${city.lat}&lon=${city.lon}&appid=${weatherAPIKey}&units=metric`;
        
        // XMLHttpRequest to fetch the 5-day forecast data
        const xhr = new XMLHttpRequest();
        xhr.open('GET', url);
        xhr.send();

        xhr.onload = function() {
            // When successful, I override the API's city name with my predefined name
            // This ensures consistency in our database
            if (xhr.status === 200) {
                const data = JSON.parse(xhr.responseText);
                // Overwrite the city name with our predefined one in case the API returns a different name
                data.city.name = city.name;
                allWeatherData.push(data);
                console.log(`Fetched weather for ${city.name}`);
            } else {
                console.error(`Error fetching weather for ${city.name}: Status ${xhr.status}`);
            }
            completedRequests++;

            //track completed requests and proceed when all are done
            if (completedRequests === CITIES.length) {
            
                sendToFlask(allWeatherData);
            }
        };

        xhr.onerror = function() {
            console.error(`Network error while fetching weather for ${city.name}`);
            completedRequests++;
            if (completedRequests === CITIES.length) {
                sendToFlask(allWeatherData);
            }
        };
    });
}
// handle sending collected data to the Flask backend
function sendToFlask(data) {
    const xhr = new XMLHttpRequest();
    // include CSRF token protection for secure POST requests
    const csrfTokenMeta = document.querySelector('meta[name="csrf-token"]');
    const csrfToken = csrfTokenMeta ? csrfTokenMeta.content : '';

    //set up the POST request with proper headers
    xhr.open('POST', '/save-weather');
    xhr.setRequestHeader('Content-Type', 'application/json');
    if (csrfToken) {
        xhr.setRequestHeader('X-CSRFToken', csrfToken);
    }
    // When the request completes, I update the UI accordingly
    xhr.onload = function() {
        const loader = document.querySelector('.loader');
        const message = document.getElementById('message');
        loader.style.display = 'none';
        
        if (xhr.status === 200) {
            message.textContent = 'Data successfully fetched!';
            message.style.color = 'green';
            console.log('Data successfully saved:', xhr.responseText);
        } else {
            message.textContent = 'Error saving data: ' + xhr.responseText;
            message.style.color = 'red';
            console.error('Error saving data:', xhr.responseText);
        }
    };
    
    xhr.onerror = function() {
        const loader = document.querySelector('.loader');
        const message = document.getElementById('message');
        loader.style.display = 'none';
        message.textContent = 'Network error during data saving.';
        message.style.color = 'red';
    };
    // Finally, send the weather data as JSON string! IMPORTANT!!
    xhr.send(JSON.stringify(data));
}

// Event listener for the collection button
document.querySelector('button').addEventListener('click', startCollection);

// ****************************************************************************************************************************************************
// ****************************************************************************************************************************************************
// Functions for fetching and displaying data based on user selection

document.getElementById('citySelect').addEventListener('change', function(e) {
    const city = e.target.value;
    if (city) {
        // When user selects a city, fetch its weather data
        fetchWeatherData(city);
    }
});

function fetchWeatherData(city) {
    const xhr = new XMLHttpRequest();
    // request data from our Flask endpoint
    xhr.open('GET', `/get-weather/${encodeURIComponent(city)}`);
    
    xhr.onload = function() {
        if (xhr.status === 200) {
            const data = JSON.parse(xhr.responseText);
            // Assuming the API returns an array of entries, we show the latest one
            processWeatherData(data[0]); 
        } else {
            console.error('Error fetching data:', xhr.responseText);
        }
    };
    
    xhr.onerror = function() {
        console.error('Network error while fetching data.');
    };
    
    xhr.send();
}
// ****************************************************************************************************************************************************
// ****************************************************************************************************************************************************
// *********************************************************use of https://www.chartjs.org/. for charts!!*******************************************************************************************

// Declare chart variables globally so we can use them in other functions
let weatherChart = null;
let windRainChart = null;

// ****************************************************************************************
// CONVERSIONS - These functions help us convert data to useful formats.
// ****************************************************************************************

// Converts wind speed (m/s) to the Beaufort scale (0-12).
function convertToBeaufort(windSpeed) {
    if (windSpeed < 0.3) return 0;    // Calm
    if (windSpeed < 1.6) return 1;    // Light Air
    if (windSpeed < 3.4) return 2;    // Light Breeze
    if (windSpeed < 5.5) return 3;    // Gentle Breeze
    if (windSpeed < 8.0) return 4;    // Moderate Breeze
    if (windSpeed < 10.8) return 5;   // Fresh Breeze
    if (windSpeed < 13.9) return 6;   // Strong Breeze
    if (windSpeed < 17.2) return 7;   // Near Gale
    if (windSpeed < 20.8) return 8;   // Gale
    if (windSpeed < 24.5) return 9;   // Strong Gale
    if (windSpeed < 28.5) return 10;  // Storm
    if (windSpeed < 32.6) return 11;  // Violent Storm
    return 12;                        // Hurricane
}

// Formats the date/time from timestamp to a readable format.
function formatDateTime(dt) {
    return new Date(dt * 1000).toLocaleString('en-US', {
        weekday: 'short',  // Short day name (e.g., Mon, Tue)
        hour: '2-digit',   // Two-digit hour (e.g., 05)
        minute: '2-digit'  // Two-digit minute (e.g., 30)
    });
}

// Categorizes rain probability into 3 levels (Low, Medium, High).
function categorizeRainProbability(probability) {
    if (probability < 30) return 1; // Low
    if (probability < 70) return 2; // Medium
    return 3;                       // High
}


// Event listener to apply the filter when the button is clicked
document.getElementById('applyFilter').addEventListener('click', function() {
    processWeatherData(data); // Re-process the data when the button is clicked
});
// ****************************************************************************************
// PROCESS WEATHER DATA - Extract and prepare data for charts.
// ****************************************************************************************
function processWeatherData(data) {
    document.querySelector(".chartContainer").style.display = "flex"; // Show container

    // Get the filter interval from the dropdown
    const filterInterval = parseInt(document.getElementById('filterInterval').value);

    // Filter the data to keep one point based on the selected interval
    const filteredData = data.list.filter((forecast, index) => index % filterInterval === 0);
    
    // Process each data point
    const weatherData = filteredData.map(forecast => {
        return {
            label: formatDateTime(forecast.dt),
            temperature: parseFloat(forecast.main.temp.toFixed(0)), // Round temperature to 0 decimal place
            cloudiness: forecast.clouds.all,
            windSpeed: convertToBeaufort(forecast.wind.speed),
            rainProbability: forecast.pop * 100,
            categorizedRain: categorizeRainProbability(forecast.pop * 100)
        };
    });

    // Extract values for the charts.
    const labels = weatherData.map(data => data.label);
    const temperatures = weatherData.map(data => data.temperature);
    const cloudiness = weatherData.map(data => data.cloudiness);
    const windSpeeds = weatherData.map(data => data.windSpeed);
    const rainProbability = weatherData.map(data => data.rainProbability);
    const categorizedRain = weatherData.map(data => data.categorizedRain);

    // Render the charts.
    renderTemperatureCloudsChart(labels, temperatures, cloudiness);
    renderWindRainChart(labels, windSpeeds, rainProbability, categorizedRain);

    //  Call after rendering to ensure visibility check works!
}

// ****************************************************************************************
// TEMPERATURE & CLOUDINESS CHART
// ****************************************************************************************
function renderTemperatureCloudsChart(labels, temperatures, cloudiness) {
    var ctx = document.getElementById('weatherChart').getContext('2d');
    if (weatherChart instanceof Chart) {
        weatherChart.destroy();
    }
    
    weatherChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Temperature (°C)',
                    data: temperatures,
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 2,
                    fill: false,
                    pointRadius: 5,
                    pointBackgroundColor: 'rgba(255, 99, 132, 0.8)'
                },
                {
                    label: 'Cloudiness (%)',
                    data: cloudiness,
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 2,
                    fill: true,
                    backgroundColor: 'rgba(54, 162, 235, 0.2)'
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                x: { title: { display: true, text: 'Date & Time' } },
                y: { title: { display: true, text: 'Values' }, beginAtZero: true }
            }
        }
    });
}

// ****************************************************************************************
// WIND SPEED & RAIN PROBABILITY CHART
// ****************************************************************************************
function renderWindRainChart(labels, windSpeeds, rainProbability, categorizedRain) {
    var ctx = document.getElementById('windRainChart').getContext('2d');
    if (windRainChart instanceof Chart) {
        windRainChart.destroy();
    }
    
    windRainChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Wind Speed (bft)',
                    data: windSpeeds,
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 2,
                    fill: false,
                    pointRadius: 5,
                    pointBackgroundColor: 'rgba(75, 192, 192, 0.8)'
                },
                {
                    label: 'Rain Probability (%)',
                    type: 'bar',
                    data: rainProbability,
                    backgroundColor: categorizedRain.map(category => {
                        return category === 1 ? 'rgba(75, 192, 192, 0.5)' : 
                               category === 2 ? 'rgba(255, 159, 64, 0.5)' : 
                                               'rgba(255, 99, 132, 0.5)';
                    }),
                    borderColor: 'rgba(0, 0, 0, 0.5)',
                    borderWidth: 1,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                x: { title: { display: true, text: 'Date & Time' } },
                y: { title: { display: true, text: 'Wind Speed (bft)' }, beginAtZero: true },
                y1: { position: 'right', title: { display: true, text: 'Rain Probability (%)' }, min: 0, max: 100 }
            }
        }
    });
}

