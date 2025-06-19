import { ChartRenderer } from "../components/chart-renderer"

// The CURRENT (problematic) JSON from backend
const currentBackendJson = {
  content: JSON.stringify({
    "chartType": "pie",
    "data": [
      {"country": "United States", "gdp": 22675},
      {"country": "China", "gdp": 16875},
      {"country": "Japan", "gdp": 4937},
      {"country": "Germany", "gdp": 4223},
      {"country": "India", "gdp": 3173},
      {"country": "United Kingdom", "gdp": 3137},
      {"country": "France", "gdp": 2975},
      {"country": "Italy", "gdp": 2072},
      {"country": "Canada", "gdp": 1847},
      {"country": "South Korea", "gdp": 1796}
    ],
    "config": {
      "title": "Top 10 Wealthiest Countries by GDP",
      "subtitle": "Measured in trillions of USD",
      "footer": "Data updated as of October 2023",
      "legend": true,
      "series": [
        {"dataKey": "gdp", "name": "GDP (in Trillions)"},
        {"dataKey": "country", "name": "Countries"}  // ❌ WRONG: This should be nameKey
      ]
    }
  }, null, 2)
}

// The CORRECTED JSON that will work properly
const correctedBackendJson = {
  content: JSON.stringify({
    "chartType": "pie",
    "data": [
      {"country": "United States", "gdp": 22675, "color": "#3b82f6"},
      {"country": "China", "gdp": 16875, "color": "#10b981"},
      {"country": "Japan", "gdp": 4937, "color": "#facc15"},
      {"country": "Germany", "gdp": 4223, "color": "#f43f5e"},
      {"country": "India", "gdp": 3173, "color": "#ef4444"},
      {"country": "United Kingdom", "gdp": 3137, "color": "#a855f7"},
      {"country": "France", "gdp": 2975, "color": "#0ea5e9"},
      {"country": "Italy", "gdp": 2072, "color": "#6366f1"},
      {"country": "Canada", "gdp": 1847, "color": "#d97706"},
      {"country": "South Korea", "gdp": 1796, "color": "#4ade80"}
    ],
    "config": {
      "title": "Top 10 Wealthiest Countries by GDP",
      "subtitle": "Measured in trillions of USD",
      "footer": "Data updated as of October 2023",
      "legend": true,
      "series": [
        {
          "dataKey": "gdp",      // ✅ Field containing the numeric values
          "nameKey": "country",  // ✅ Field containing the labels
          "name": "GDP (in Trillions USD)"
        }
      ]
    }
  }, null, 2)
}

export function LegendTestPage() {
  return (
    <div className="p-8 space-y-8">
      <h1 className="text-3xl font-bold">Pie Chart Legend Tests</h1>
      
      <div className="space-y-8">
        <div>
          <h2 className="text-xl font-semibold mb-4 text-red-600">❌ Current Backend JSON (No Legends)</h2>
          <p className="text-sm text-gray-600 mb-4">
            Issues: Missing nameKey, no individual colors, incorrect series config
          </p>
          <ChartRenderer artifact={currentBackendJson} />
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4 text-green-600">✅ Corrected JSON (With Legends)</h2>
          <p className="text-sm text-gray-600 mb-4">
            Fixed: Added nameKey, individual colors, correct series configuration
          </p>
          <ChartRenderer artifact={correctedBackendJson} />
        </div>
      </div>
      
      <div className="mt-8 p-4 bg-gray-100 rounded-lg">
        <h3 className="font-semibold mb-2">Key Differences:</h3>
        <ul className="text-sm space-y-1">
          <li>✅ Added <code>nameKey: "country"</code> to series configuration</li>
          <li>✅ Added individual <code>color</code> property to each data item</li>
          <li>✅ Fixed series structure (removed duplicate dataKey entries)</li>
        </ul>
      </div>
    </div>
  )
}
