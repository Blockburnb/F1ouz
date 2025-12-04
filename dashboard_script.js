// Constants
const API_URL = 'api/driver_stats.php'; // The new PHP file
// HARDCODED "Driver of the Moment" (e.g., Max Verstappen id=830, or Alonso id=4)
// You can change this ID to change the featured driver
const DEFAULT_DRIVER_ID = 830; 
const DEFAULT_SEASON = 2023;

let performanceChart = null;

document.addEventListener('DOMContentLoaded', () => {
    initDashboard();
});

async function initDashboard() {
    await loadDropdowns();
    
    // Load default "Pilote du moment"
    document.getElementById('driverSelect').value = DEFAULT_DRIVER_ID;
    document.getElementById('seasonSelect').value = DEFAULT_SEASON;
    
    updateDashboard();
}

// 1. Fetch Lists for Dropdowns
async function loadDropdowns() {
    // We can reuse existing get_data.php for simple lists if available, 
    // or just fetch all drivers. For optimization, I assume we have a basic fetch
    // Simplification: Fetching drivers list. 
    // Note: In a real app with 800+ drivers, you might want to limit this to active drivers.
    const response = await fetch('api/get_data.php?table=drivers'); 
    const drivers = await response.json();
    
    const driverSelect = document.getElementById('driverSelect');
    // Sort alphabetically
    drivers.sort((a, b) => a.surname.localeCompare(b.surname));
    
    drivers.forEach(d => {
        const option = document.createElement('option');
        option.value = d.driverId;
        option.text = `${d.forename} ${d.surname}`;
        driverSelect.appendChild(option);
    });

    // Load Seasons (2000 to 2023 for example)
    const seasonSelect = document.getElementById('seasonSelect');
    for(let y = 2023; y >= 1950; y--) {
        const option = document.createElement('option');
        option.value = y;
        option.text = y;
        seasonSelect.appendChild(option);
    }
}

// 2. Main Update Function
async function updateDashboard() {
    const driverId = document.getElementById('driverSelect').value || DEFAULT_DRIVER_ID;
    const season = document.getElementById('seasonSelect').value || DEFAULT_SEASON;
    
    document.getElementById('displaySeason').innerText = season;

    try {
        const res = await fetch(`${API_URL}?driver_id=${driverId}&season=${season}`);
        const data = await res.json();

        if(data.message) {
            alert(data.message); 
            return;
        }

        renderDriverInfo(data.info);
        renderStats(data.season_stats, data.career_stats);
        renderChart(data.chart_data);

    } catch (error) {
        console.error("Error fetching dashboard data:", error);
    }
}

function renderDriverInfo(info) {
    document.getElementById('driverName').innerText = `${info.forename} ${info.surname}`;
    document.getElementById('driverNationality').innerText = info.nationality;
    document.getElementById('driverNumber').innerText = info.number ? `#${info.number}` : "N/A";
    
    // Attempt to load image from your scripts/headshot_server logic or placeholder
    // If you have local images named by driver code (e.g., HAM.png):
    // document.getElementById('driverPhoto').src = `images/drivers/${info.code}.png`;
    
    // For now, using a generic trick or Wikipedia fetch if you integrated the python script
    // Just using a placeholder + name for safety
    document.getElementById('driverPhoto').alt = info.code; 
}

function renderStats(season, career) {
    document.getElementById('statWins').innerText = career.total_wins || 0;
    document.getElementById('statPodiums').innerText = career.total_podiums || 0;
    document.getElementById('statSeasonPoints').innerText = season && season.season_points ? season.season_points : 0;
    document.getElementById('statCareerPoints').innerText = career.career_points || 0;
}

function renderChart(history) {
    const ctx = document.getElementById('performanceChart').getContext('2d');
    
    // Prepare Data
    const labels = history.map(r => r.race_name);
    const positions = history.map(r => r.positionOrder);

    // Destroy old chart if exists
    if (performanceChart) performanceChart.destroy();

    performanceChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Position en course',
                data: positions,
                borderColor: '#e10600',
                backgroundColor: 'rgba(225, 6, 0, 0.2)',
                borderWidth: 2,
                tension: 0.3,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    reverse: true, // In racing, lower number (1st) is better, so we reverse Y axis
                    beginAtZero: false,
                    title: { display: true, text: 'Position' }
                }
            }
        }
    });
}