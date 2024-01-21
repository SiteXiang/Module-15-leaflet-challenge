// Create a map and set the center and zoom level
var myMap = L.map("map", {
  center: [37.8, -96],
  zoom: 4,
});

// Add a standard OpenStreetMap tile layer
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors",
}).addTo(myMap);

// Define a function to determine the size of earthquake markers
function markerSize(magnitude) {
  return magnitude * 5;
}

// Define a function to determine the color of earthquake markers based on depth
function markerColor(depth) {
  return depth > 90
    ? "#ff0000"
    : depth > 70
    ? "#ff6600"
    : depth > 50
    ? "#ff9900"
    : depth > 30
    ? "#ffcc00"
    : depth > 10
    ? "#ffff00"
    : "#ccff33";
}

// Create the base layers
var street = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
});

var topo = L.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", {
  attribution:
    'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)',
});

// Create a baseMaps object
var baseMaps = {
  "Street Map": street,
  "Topographic Map": topo,
};

// Create an overlay object to hold our overlays
var overlayMaps = {};

// Create a legend control
var legend = L.control({ position: "bottomright" });

legend.onAdd = function (map) {
  var div = L.DomUtil.create("div", "info legend"),
    depthRanges = [-10, 10, 30, 50, 70, 90],
    labels = [],
    from,
    to;

  for (var i = 0; i < depthRanges.length; i++) {
    from = depthRanges[i];
    to = depthRanges[i + 1];

    labels.push(
      '<i style="background:' +
        markerColor(from + 1) +
        '"></i> ' +
        from +
        (to ? "&ndash;" + to : "+") +
        " km"
    );
  }

  div.innerHTML = labels.join("<br>");
  return div;
};

// Add the legend to the map
legend.addTo(myMap);

// Use jQuery to get GeoJSON data
$.getJSON("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_week.geojson", function (geoJsonData) {
  var earthquakes = L.geoJSON(geoJsonData, {
    pointToLayer: function (feature, latlng) {
      return L.circleMarker(latlng, {
        radius: markerSize(feature.properties.mag),
        fillColor: markerColor(feature.geometry.coordinates[2]),
        color: "#000",
        weight: 1,
        opacity: 1,
        fillOpacity: 0.8,
      });
    },
    onEachFeature: function (feature, layer) {
      layer.bindPopup(
        "Location: " +
          feature.properties.place +
          "<br>Magnitude: " +
          feature.properties.mag +
          "<br>Depth: " +
          feature.geometry.coordinates[2] +
          " km"
      );
    },
  });

  overlayMaps.Earthquakes = earthquakes;

  // Create a layer control, combining earthquakes and tectonic plates into one box
  var layerControl = L.control.layers(baseMaps, overlayMaps, { collapsed: false });
  layerControl.addTo(myMap);
  layerControl.setPosition("topright"); // Set the position of the layer control to the top right

  // Define the URLs for the new GeoJSON layers
  let orogensUrl =
    "https://raw.githubusercontent.com/fraxen/tectonicplates/master/GeoJSON/PB2002_orogens.json";
  let boundariesUrl =
    "https://raw.githubusercontent.com/fraxen/tectonicplates/master/GeoJSON/PB2002_boundaries.json";
  let platesUrl =
    "https://raw.githubusercontent.com/fraxen/tectonicplates/master/GeoJSON/PB2002_plates.json";

  // Use Promise.all to fetch all GeoJSON data
  Promise.all([
    fetch(orogensUrl).then((response) => response.json()),
    fetch(boundariesUrl).then((response) => response.json()),
    fetch(platesUrl).then((response) => response.json()),
  ]).then(function ([orogensData, boundariesData, platesData]) {
    let orogensLayer = L.geoJSON(orogensData, {
      style: function (feature) {
        return {
          color: "green",
          weight: 2,
        };
      },
    });

    let boundariesLayer = L.geoJSON(boundariesData, {
      style: function (feature) {
        return {
          color: "red",
          weight: 2,
        };
      },
    });

    let platesLayer = L.geoJSON(platesData, {
      style: function (feature) {
        return {
          color: "blue",
          weight: 2,
        };
      },
    });

    var plateLayers = L.layerGroup([orogensLayer, boundariesLayer, platesLayer]);

    overlayMaps["Tectonic Plates"] = plateLayers;

    // Update the layer control, adding the tectonic plates layer to the same box
    layerControl.addOverlay(plateLayers, "Tectonic Plates");
  });
});
