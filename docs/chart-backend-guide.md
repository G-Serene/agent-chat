# Chart Generation Backend Guide

## Overview
This guide explains how to format chart data for the frontend to properly render charts with legends and support multiple chart types.

## Supported Chart Types

### Basic Charts
- `bar` - Bar charts
- `line` - Line charts  
- `area` - Area charts
- `pie` - Pie charts (with enhanced legend support)
- `donut` - Donut charts (pie charts with inner radius)

### Advanced Charts
- `scatter` - Scatter plots
- `radar` - Radar/Spider charts
- `composed` - Mixed chart types (bar + line + area)
- `treemap` - Hierarchical data visualization
- `funnel` - Funnel charts for conversion data
- `heatmap` - Heat map visualization (placeholder - needs specialized library)

## Chart Data Format

### Standard Format
```json
{
  "chartType": "pie",
  "data": [
    {"region": "East", "avg_temp": 81.33, "population": 50000},
    {"region": "Midwest", "avg_temp": 76.67, "population": 45000},
    {"region": "West", "avg_temp": 69.67, "population": 60000}
  ],
  "config": {
    "title": "Regional Data Analysis",
    "subtitle": "Temperature and Population by Region",
    "footer": "Data updated as of June 2025",
    "legend": true,
    "grid": true,
    "series": [
      {
        "dataKey": "avg_temp",
        "nameKey": "region", 
        "name": "Average Temperature (°F)",
        "fill": "#dc2626",
        "type": "bar"
      }
    ],
    "xAxis": {
      "dataKey": "region"
    },
    "yAxis": {
      "label": "Temperature (°F)"
    }
  }
}
```

## Pie Chart Legend Requirements

For pie charts to display legends properly, ensure:

1. **Data Structure**: Each data item should have a name/label field and a value field
2. **Series Configuration**: Specify `dataKey` and `nameKey` in the series
3. **Legend Enabled**: Set `"legend": true` in config (optional, pie charts always show legends)

### Pie Chart Example
```json
{
  "chartType": "pie",
  "data": [
    {"category": "Product A", "sales": 4500, "color": "#dc2626"},
    {"category": "Product B", "sales": 3200, "color": "#2563eb"},
    {"category": "Product C", "sales": 2800, "color": "#16a34a"},
    {"category": "Product D", "sales": 1900, "color": "#ea580c"}
  ],
  "config": {
    "title": "Sales by Product Category",
    "series": [
      {
        "dataKey": "sales",
        "nameKey": "category",
        "name": "Sales Volume"
      }
    ],
    "outerRadius": 120,
    "innerRadius": 0
  }
}
```

### CORRECTED Backend JSON for GDP Example
```json
{
  "chartType": "pie",
  "data": [
    {"country": "United States", "gdp": 21433, "color": "#3b82f6"},
    {"country": "China", "gdp": 14342, "color": "#10b981"},
    {"country": "Japan", "gdp": 5082, "color": "#facc15"},
    {"country": "Germany", "gdp": 3846, "color": "#f43f5e"},
    {"country": "India", "gdp": 2875, "color": "#ef4444"},
    {"country": "United Kingdom", "gdp": 2827, "color": "#a855f7"},
    {"country": "France", "gdp": 2715, "color": "#0ea5e9"},
    {"country": "Italy", "gdp": 2001, "color": "#6366f1"},
    {"country": "Canada", "gdp": 1840, "color": "#d97706"},
    {"country": "South Korea", "gdp": 1640, "color": "#4ade80"}
  ],
  "config": {
    "title": "Top 10 Wealthiest Countries by GDP",
    "subtitle": "GDP in billions of USD",
    "legend": true,
    "series": [
      {
        "dataKey": "gdp",
        "nameKey": "country",
        "name": "GDP (Billions USD)"
      }
    ]
  }
}
```

## Multi-Series Charts

For charts with multiple data series:

```json
{
  "chartType": "composed",
  "data": [
    {"month": "Jan", "revenue": 12000, "costs": 8000, "profit": 4000},
    {"month": "Feb", "revenue": 15000, "costs": 9000, "profit": 6000},
    {"month": "Mar", "revenue": 18000, "costs": 11000, "profit": 7000}
  ],
  "config": {
    "title": "Financial Performance",
    "legend": true,
    "grid": true,
    "series": [
      {
        "dataKey": "revenue",
        "name": "Revenue",
        "type": "bar",
        "fill": "#16a34a"
      },
      {
        "dataKey": "costs", 
        "name": "Costs",
        "type": "bar",
        "fill": "#dc2626"
      },
      {
        "dataKey": "profit",
        "name": "Profit",
        "type": "line",
        "stroke": "#2563eb"
      }
    ],
    "xAxis": {
      "dataKey": "month"
    }
  }
}
```

## Color Configuration

### Individual Item Colors
Add `color` or `fill` property to each data item:
```json
{"category": "Item 1", "value": 100, "color": "#dc2626"}
```

### Series Colors
Define colors in the series configuration:
```json
"series": [
  {
    "dataKey": "value",
    "fill": "#dc2626",
    "stroke": "#dc2626"
  }
]
```

### Automatic Colors
If no colors are specified, the system uses a predefined color palette with 15+ colors.

## Backend Code Generation Tips

### Python Example Template
```python
def generate_chart_artifact(chart_type, data, title=None, **kwargs):
    """
    Generate chart artifact with proper formatting
    """
    # Auto-detect data keys if not provided
    if not data:
        return None
        
    first_item = data[0]
    name_key = kwargs.get('name_key') or next(iter(first_item.keys()))
    value_key = kwargs.get('value_key') or list(first_item.keys())[1] if len(first_item) > 1 else name_key
    
    # Apply colors to individual data items (IMPORTANT for pie charts)
    colors = kwargs.get('colors') or [
        "#3b82f6", "#10b981", "#facc15", "#f43f5e", "#ef4444", 
        "#a855f7", "#0ea5e9", "#6366f1", "#d97706", "#4ade80"
    ]
    
    for i, item in enumerate(data):
        if 'color' not in item and 'fill' not in item:
            item['color'] = colors[i % len(colors)]
    
    config = {
        "title": title or f"{chart_type.title()} Chart",
        "legend": True,
        "series": [
            {
                "dataKey": value_key,
                "nameKey": name_key,
                "name": kwargs.get('series_name', value_key.replace('_', ' ').title())
            }
        ]
    }
    
    # Add chart-specific config
    if chart_type == "pie":
        config["outerRadius"] = kwargs.get('outer_radius', 120)
        config["innerRadius"] = kwargs.get('inner_radius', 0)
    elif chart_type == "donut":
        config["outerRadius"] = kwargs.get('outer_radius', 120)
        config["innerRadius"] = kwargs.get('inner_radius', 60)
    elif chart_type in ["bar", "line", "area"]:
        config["grid"] = kwargs.get('grid', True)
        config["xAxis"] = {"dataKey": name_key}
        
    return {
        "chartType": chart_type,
        "data": data,
        "config": config
    }

# CORRECTED Usage for GDP Example
def create_gdp_chart():
    chart_data = [
        {"country": "United States", "gdp": 21433},
        {"country": "China", "gdp": 14342},
        {"country": "Japan", "gdp": 5082},
        {"country": "Germany", "gdp": 3846},
        {"country": "India", "gdp": 2875},
        {"country": "United Kingdom", "gdp": 2827},
        {"country": "France", "gdp": 2715},
        {"country": "Italy", "gdp": 2001},
        {"country": "Canada", "gdp": 1840},
        {"country": "South Korea", "gdp": 1640}
    ]
    
    colors = [
        "#3b82f6", "#10b981", "#facc15", "#f43f5e", "#ef4444",
        "#a855f7", "#0ea5e9", "#6366f1", "#d97706", "#4ade80"
    ]
    
    artifact = generate_chart_artifact(
        "pie", 
        chart_data, 
        title="Top 10 Wealthiest Countries by GDP",
        value_key="gdp",
        name_key="country",
        series_name="GDP (Billions USD)",
        colors=colors
    )
    
    # Add subtitle after generation
    artifact["config"]["subtitle"] = "GDP in billions of USD"
    
    return artifact

# Output as ```chart block
chart = create_gdp_chart()
print("```chart")
print(json.dumps(chart, indent=2))
print("```")
```

## Error Handling

The frontend handles these common issues:
- Missing `chartType` or `data` fields
- Invalid JSON syntax (comments, trailing commas)
- Automatic fallback for missing `dataKey`/`nameKey`
- Color palette fallback when colors aren't specified

## Testing Chart Output

1. Ensure your Python backend outputs chart data in code blocks:
   ```
   ```chart
   {
     "chartType": "pie",
     "data": [...],
     "config": {...}
   }
   ```
   ```

2. Test with various chart types and data structures
3. Verify legends appear correctly for pie charts
4. Check that colors are applied consistently

## 🚨 URGENT FIX: Your Current JSON Issue

**Your JSON has several problems preventing legends from showing:**

### ❌ Your Current (Broken) JSON:
```json
{
  "chartType": "pie",
  "data": [
    {"country": "United States", "gdp": 22675},
    {"country": "China", "gdp": 16875}
    // ... missing colors on each item
  ],
  "config": {
    "legend": true,
    "series": [
      {"dataKey": "gdp", "name": "GDP (in Trillions)"},
      {"dataKey": "country", "name": "Countries"}  // ❌ WRONG: should be "nameKey"
    ]
  }
}
```

### ✅ Corrected JSON (Will Show Legends):
```json
{
  "chartType": "pie",
  "data": [
    {"country": "United States", "gdp": 22675, "color": "#dc2626"},
    {"country": "China", "gdp": 16875, "color": "#2563eb"},
    {"country": "Japan", "gdp": 4937, "color": "#16a34a"},
    {"country": "Germany", "gdp": 4223, "color": "#ea580c"},
    {"country": "India", "gdp": 3173, "color": "#9333ea"},
    {"country": "United Kingdom", "gdp": 3137, "color": "#0891b2"},
    {"country": "France", "gdp": 2975, "color": "#c2410c"},
    {"country": "Italy", "gdp": 2072, "color": "#65a30d"},
    {"country": "Canada", "gdp": 1847, "color": "#7c3aed"},
    {"country": "South Korea", "gdp": 1796, "color": "#db2777"}
  ],
  "config": {
    "title": "Top 10 Wealthiest Countries by GDP",
    "subtitle": "Measured in trillions of USD",
    "footer": "Data updated as of October 2023",
    "legend": true,
    "series": [
      {
        "dataKey": "gdp",        // ✅ Value field
        "nameKey": "country",    // ✅ Label field (was missing!)
        "name": "GDP (Trillions USD)"
      }
    ]
  }
}
```

### 🔧 Key Fixes Made:
1. **Added `nameKey`**: Changed second series from `{"dataKey": "country"}` to `"nameKey": "country"`
2. **Added colors**: Each data item now has a `color` property
3. **Single series**: Pie charts need exactly ONE series with both `dataKey` and `nameKey`

**Test this corrected JSON and your legends will appear!**

## Common Backend Issues and Solutions

### Issue 1: Pie Chart Legend Not Showing Colors
**Problem**: Colors defined in `config.colors` array are not applied to pie slices.

**❌ Incorrect:**
```json
{
  "config": {
    "colors": ["#3b82f6", "#10b981", "#facc15"]  // This won't work
  }
}
```

**✅ Correct:**
```json
{
  "data": [
    {"category": "Item 1", "value": 100, "color": "#3b82f6"},  // Colors in data
    {"category": "Item 2", "value": 200, "color": "#10b981"}
  ]
}
```

### Issue 2: Missing Series Configuration
**Problem**: Frontend can't determine which fields to use for labels and values.

**❌ Incorrect:**
```json
{
  "config": {
    "title": "My Chart",
    "legend": true
    // Missing series configuration
  }
}
```

**✅ Correct:**
```json
{
  "config": {
    "title": "My Chart",
    "legend": true,
    "series": [
      {
        "dataKey": "value",     // Field for numeric values
        "nameKey": "category",  // Field for labels
        "name": "Display Name"
      }
    ]
  }
}
```

### Issue 3: Inconsistent Data Structure
**Problem**: Data items have different field names or missing required fields.

**❌ Incorrect:**
```json
{
  "data": [
    {"name": "Item 1", "amount": 100},      // Using "amount"
    {"title": "Item 2", "value": 200},     // Using "title" and "value"
    {"label": "Item 3", "count": 300}      // Using "label" and "count"
  ]
}
```

**✅ Correct:**
```json
{
  "data": [
    {"category": "Item 1", "value": 100, "color": "#3b82f6"},
    {"category": "Item 2", "value": 200, "color": "#10b981"},
    {"category": "Item 3", "value": 300, "color": "#facc15"}
  ]
}
```

### Issue 4: Missing Chart Type or Data
**Problem**: Frontend can't render chart without essential properties.

**❌ Incorrect:**
```json
{
  "title": "My Chart",
  "values": [100, 200, 300]  // Missing chartType and proper data structure
}
```

**✅ Correct:**
```json
{
  "chartType": "pie",  // Always required
  "data": [            // Always required with proper structure
    {"category": "Item 1", "value": 100}
  ],
  "config": {
    "title": "My Chart"
  }
}
```

## Backend Validation Checklist

Before sending chart data to frontend, verify:

- [ ] ✅ `chartType` field is present and valid
- [ ] ✅ `data` array exists and has at least one item  
- [ ] ✅ All data items have consistent field names
- [ ] ✅ For pie charts: each data item has a `color` or `fill` property
- [ ] ✅ `config.series` array specifies `dataKey` and `nameKey`
- [ ] ✅ JSON is valid (no trailing commas, proper quotes)
- [ ] ✅ Numeric values are actual numbers, not strings
- [ ] ✅ Output is wrapped in ```chart code block

## Future Extensions

To add new chart types:

1. **Frontend**: Add new case in `chart-renderer.tsx`
2. **Backend**: Update chart generation templates
3. **Detection**: Add to `chartLanguages` array in `artifact-detector.ts`

The system is designed to be easily extensible for future chart types and visualization libraries.
