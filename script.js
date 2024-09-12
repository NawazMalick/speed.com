let audioContext, analyser, microphone, scriptProcessor;
let minValue = Infinity, maxValue = 0, sum = 0, count = 0;
const measurementInterval = 1000; // Interval in milliseconds (1 second)
const smoothingFactor = 0.9; // Smoothing factor for the moving average
let smoothedDB = 0; // Initialize smoothedDB
let distanceCovered = 0;
let watchId;
document.getElementById('startButton').addEventListener('click', () => {
    // First, request microphone access and start speedometer
    requestMicAccess();
    startSpeedometer();
});

document.getElementById('resetButton').addEventListener('click', resetMeasurements);
document.getElementById('exportButton').addEventListener('click', () => {
    // Fetch or gather data to be exported
    const data = getDataToExport(); // Replace with your actual function to get data

    // Ensure data is valid before proceeding
    if (data && typeof data === 'object') {
        const jsonString = JSON.stringify(data);
        const blob = new Blob([jsonString], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "data.json";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    } else {
        console.error("Invalid data format for export");
    }
});

async function init() {
    try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            alert('Your browser does not support the MediaDevices interface.');
            return;
        }

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        microphone = audioContext.createMediaStreamSource(stream);
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 2048;

        scriptProcessor = audioContext.createScriptProcessor(2048, 1, 1);
        microphone.connect(analyser);
        analyser.connect(scriptProcessor);
        scriptProcessor.connect(audioContext.destination);

        scriptProcessor.onaudioprocess = processAudio;

        setInterval(processAudio, measurementInterval);
    } catch (error) {
        alert('Microphone access denied. Please enable microphone access in your browser settings.');
        console.error('Microphone access error:', error);
    }
}

function processAudio() {
    const bufferLength = analyser.fftSize;
    const inputData = new Float32Array(bufferLength);
    analyser.getFloatTimeDomainData(inputData);

    let sumSquares = 0.0;
    for (let i = 0; i < bufferLength; i++) {
        sumSquares += inputData[i] * inputData[i];
    }

    const rms = Math.sqrt(sumSquares / bufferLength);
    const dB = Math.min(50, Math.max(0, 20 * Math.log10(rms + 0.0001) + 50));

    // Apply smoothing to dB values
    smoothedDB = (smoothingFactor * smoothedDB) + ((1 - smoothingFactor) * dB);

    // Update min, max, and average
    if (smoothedDB < minValue) minValue = smoothedDB;
    if (smoothedDB > maxValue) maxValue = smoothedDB;
    sum += smoothedDB;
    count++;

    document.getElementById('minValue').innerText = minValue.toFixed(1);
    document.getElementById('avgValue').innerText = (sum / count).toFixed(1);
    document.getElementById('maxValue').innerText = maxValue.toFixed(1);
    document.getElementById('currentValue').innerText = smoothedDB.toFixed(1);

    drawGauge(smoothedDB);
}

function drawGauge(dB) {
    const canvas = document.getElementById('gaugeCanvas');
    const ctx = canvas.getContext('2d');
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;
    const radius = Math.min(canvasWidth, canvasHeight) / 2.5; // Adjust radius for better visibility
    const lineWidth = 20;

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // Draw Gauge Background
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0.75 * Math.PI, 0.25 * Math.PI, false);
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = '#444'; // Background color
    ctx.stroke();

    // Draw Gauge Fill
    const endAngle = (0.75 + (dB / 50) * 1.5) * Math.PI;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0.75 * Math.PI, endAngle, false);
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = '#ffcc00'; // Fill color
    ctx.stroke();
}
function requestMicAccess() {
    if (navigator.permissions) {
        navigator.permissions.query({ name: 'microphone' }).then(result => {
            if (result.state === 'denied') {
                alert('Microphone access is blocked. Please enable it in your browser settings.');
            } else {
                init(); // Initialize microphone if allowed
            }
        }).catch(error => {
            alert('An error occurred while checking microphone permissions.');
        });
    }
}

function resetMeasurements() {
    minValue = Infinity;
    maxValue = 0;
    sum = 0;
    count = 0;

    document.getElementById('minValue').innerText = '--';
    document.getElementById('avgValue').innerText = '--';
    document.getElementById('maxValue').innerText = '--';
    document.getElementById('currentValue').innerText = '--';

    if (audioContext) {
        audioContext.close();
        audioContext = null;
    }
}
function exportToCSV() {
    const csvContent = `data:text/csv;charset=utf-8,Min,Avg,Max,Current\n${minValue.toFixed(1)},${(sum / count).toFixed(1)},${maxValue.toFixed(1)},${document.getElementById('currentValue').innerText}`;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'noise_level_data.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}


document.getElementById('exportButton').addEventListener('click', exportToCSV);
function exportToJSON() {
    const data = {
        minValue: minValue.toFixed(1),
        avgValue: (sum / count).toFixed(1),
        maxValue: maxValue.toFixed(1),
        currentValue: document.getElementById('currentValue').innerText,
        peakValue: peakValue.toFixed(1)
    };
    const jsonContent = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data))}`;
    const link = document.createElement('a');
    link.setAttribute('href', jsonContent);
    link.setAttribute('download', 'noise_level_data.json');
    document.body.appendChild(link);
    link.click();
}
document.getElementById('exportJSONButton').addEventListener('click', () => {
    const data = {
        minValue: minValue.toFixed(1),
        avgValue: (sum / count).toFixed(1),
        maxValue: maxValue.toFixed(1),
        currentValue: document.getElementById('currentValue').innerText
    };
    
    const jsonString = JSON.stringify(data);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "noise_data.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
});

function updateDateTime() {
    const now = new Date();
    const dateTimeString = now.toLocaleString(); // Format date and time based on locale
    document.getElementById('dateTime').innerText = dateTimeString;
}
const exportData = (data) => {
    const jsonString = JSON.stringify(data);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "data.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
};

// Update date and time every second
setInterval(updateDateTime, 1000);
// Detect mobile devices and show the note if needed
function checkMobile() {
    if (window.innerWidth <= 768) { // Adjust the width based on your design
        document.getElementById('noteBanner').style.display = 'block';
    }
}

// Call the function on page load and on resize
window.addEventListener('load', checkMobile);
window.addEventListener('resize', checkMobile);
// Function to show or hide the note based on viewport width
function checkViewport() {
    const noteBanner = document.getElementById('noteBanner');
    if (window.innerWidth <= 768) { // Width threshold for mobile view
        noteBanner.style.display = 'block';
    } else {
        noteBanner.style.display = 'none';
    }
}

// Call the function on page load and resize
window.addEventListener('load', checkViewport);
window.addEventListener('resize', checkViewport);
function checkMediaSupport() {
    const noteBox = document.getElementById('noteBox');
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        noteBox.style.display = 'block';
    } else {
        noteBox.style.display = 'none';
    }
}

// Call this function on page load
window.onload = function() {
    checkMediaSupport();
};
// Function to start speedometer
function startSpeedometer() {
    if (navigator.geolocation) {
        navigator.geolocation.watchPosition(
            function(position) {
                const speed = position.coords.speed;
                updateSpeedometer(speed);
            },
            function(error) {
                handleGeolocationError(error); // Ensure errors are handled properly
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    } else {
        alert("Geolocation is not supported by your browser.");
    }
}


// Function to stop speedometer
function stopSpeedometer() {
    if (watchId) {
        navigator.geolocation.clearWatch(watchId);
    }
}

// Error handling for geolocation
function handleGeolocationError(error) {
    switch (error.code) {
        case error.PERMISSION_DENIED:
            showNote("Location access denied by user. Please allow GPS access in your browser settings.");
            break;
        case error.POSITION_UNAVAILABLE:
            showNote("Location information is unavailable.");
            break;
        case error.TIMEOUT:
            showNote("The request to get user location timed out.");
            break;
        case error.UNKNOWN_ERROR:
            showNote("An unknown error occurred while trying to access location.");
            break;
    }
}

// Function to show the note to user
function showNote(message) {
    const noteBox = document.getElementById('noteBox');
    noteBox.innerText = message;
    noteBox.style.display = 'block'; // Show the note box
}

// Function to hide the note when not needed
function hideNote() {
    const noteBox = document.getElementById('noteBox');
    noteBox.style.display = 'none'; // Hide the note box
}

// Start speedometer when the start button is clicked
document.getElementById('startButton').addEventListener('click', startSpeedometer);

// Hide the note by default
hideNote();
// Function to update the speedometer
function updateSpeedometer(speed) {
    const speedKmph = (speed * 3.6).toFixed(1); // Convert speed to km/h
    const speedCircle = document.getElementById('speedCircle');
    const speedValue = document.getElementById('speedValue');

    // Set speed value display
    speedValue.innerText = isNaN(speedKmph) ? '--' : speedKmph;

    // Calculate the stroke-dashoffset for the speed circle
    const maxSpeed = 180; // Maximum speed in km/h for the meter
    const offset = 283 - (speedKmph / maxSpeed) * 283; // Calculate the offset

    // Set the stroke-dashoffset to animate the circle
    speedCircle.style.strokeDashoffset = offset;
}

// Start speedometer when the start button is clicked
document.getElementById('startButton').addEventListener('click', startSpeedometer);

// Function to start the speedometer
function startSpeedometer() {
    if (navigator.geolocation) {
        navigator.geolocation.watchPosition(
            function (position) {
                const speed = position.coords.speed; // Speed in m/s
                updateSpeedometer(speed);
            },
            function (error) {
                handleGeolocationError(error);
            },
            { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 }
        );
    } else {
        showNote("Geolocation is not supported by this browser.");
    }
}
navigator.permissions.query({ name: 'microphone' }).then(result => {
    if (result.state === 'denied') {
        alert('Microphone access is blocked. Please enable it in your browser settings.');
    } else {
        init();
    }
}).catch(error => {
    alert('An error occurred while checking microphone permissions.');
});
navigator.geolocation.watchPosition(
    function (position) {
        const speed = position.coords.speed;
        updateSpeedometer(speed); // Call function to update the display
    },
    function (error) {
        handleGeolocationError(error);
    },
    { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 }
);
if (speed == null) {
    document.getElementById('speedValue').innerText = '--'; // Show dashes for no speed
} else {
    updateSpeedometer(speed);
}
// Function to toggle the visibility of the converter
function toggleConverter() {
  const converterContainer = document.getElementById('converterContainer');
  if (converterContainer.style.display === 'none') {
    converterContainer.style.display = 'block';
  } else {
    converterContainer.style.display = 'none';
  }
}
function updateSpeedometer(speed) {
    const speedKmph = (speed * 3.6).toFixed(1); // Convert speed to km/h
    const maxSpeed = 180; // Maximum speed

    // Update speed and distance display
    document.getElementById('speedValue').innerText = `${speedKmph} km/h`;
    document.getElementById('distanceValue').innerText = `${distanceCovered.toFixed(2)} km`;

    // Update the yellow circle (gauge)
    const offset = 283 - (speedKmph / maxSpeed) * 283; // Adjust gauge based on speed
    document.getElementById('speedCircle').style.strokeDashoffset = offset;
}
