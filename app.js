// Inisialisasi peta
const map = L.map('map').setView([41.5454, -8.4265], 12); // Koordinat untuk Braga, Portugal

// Tambahkan base layers
const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
});

const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
});

const topoLayer = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
    attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'
});




satelliteLayer.addTo(map);

let layerBatas;
let layerBatasKota;
let layerJalan;
let layerSungai;
let searchResultLayer = null; 
let currentHighlightLayer = null; 
let layerBangunan;


function styleBatas(feature) {
    return {
        color: '#1B5E20',
        weight: 7,
        opacity: 0.9,
        fillColor: '#388E3C', 
        fillOpacity: 0.25,
        dashArray: '5, 3'
    };
}
function styleBangunan(feature) {
    return {
        color: '#3E2723',
        weight: 1.2,
        opacity: 0.9,
        fillColor: '#6D4C41', 
        fillOpacity: 0.7,
        lineCap: 'square',
        lineJoin: 'miter'
    };
}
function styleBatasKota(feature) {
    return {
        color: '#7B1FA2',
        weight: 4, 
        opacity: 0.95,
        fillColor: '#9C27B0', 
        fillOpacity: 0.3, 
        dashArray: '12, 6, 3, 6' 
    };
}
function styleJalan(feature) {
    return {
        color: '#FF5722',
        weight: 1.2,
        opacity: 1,
        fillColor: '#FF7043', 
        fillOpacity: 0.8,
        lineCap: 'round',
        lineJoin: 'round'
    };
}
function styleSungai(feature) {
    return {
        color: '#0066FF', 
        weight: 2.5, 
        opacity: 1, 
        fillColor: '#1E88E5', 
        fillOpacity: 0.9, 
        lineCap: 'round',
        lineJoin: 'round'
    };
}
function styleSearchResult(feature) {
    return {
        color: '#E65100', 
        weight: 5,
        opacity: 1,
        fillColor: '#FFC107', 
        fillOpacity: 0.6,
        dashArray: '10, 5',
        lineCap: 'round'
    };
}
function convertLineStringToMultiPolygon(geojsonData) {
    if (geojsonData.features) {
        geojsonData.features = geojsonData.features.map(feature => {
            if (feature.geometry.type === "LineString") {
                const coordinates = feature.geometry.coordinates;
                const closedCoordinates = [...coordinates];
                const firstCoord = coordinates[0];
                const lastCoord = coordinates[coordinates.length - 1];
                
            if (firstCoord[0] !== lastCoord[0] || firstCoord[1] !== lastCoord[1]) {
                closedCoordinates.push([...firstCoord]);
            }
                feature.geometry = {
                    type: "MultiPolygon",
                    coordinates: [[closedCoordinates]] 
                };
            }
            return feature;
        });
    }
    return geojsonData;
}
function onEachFeature(feature, layer) {
    if (feature.properties) {
        let popupContent = '<div class="popup-content">';
        for (let prop in feature.properties) {
            popupContent += `<strong>${prop}:</strong> ${feature.properties[prop]}<br>`;
        }
        popupContent += '</div>';
        layer.bindPopup(popupContent);
    }
}


fetch('data/batas_layer.geojson')
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        console.log("Batas data loaded:", data);
        layerBatas = L.geoJSON(data, {
            style: styleBatas,
            onEachFeature: onEachFeature
        }).addTo(map);
        map.fitBounds(layerBatas.getBounds());
    })
    .catch(error => {
        console.error('Error loading Batas GeoJSON:', error);
    });

fetch('data/batas_kota_layer.geojson')
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        console.log("Batas Kota data loaded:", data);
        const filteredData = {
            ...data,
            features: data.features.filter(feature => {
                const description = feature.properties.description || "";
                return description.includes("admin_level=8") && description.includes("freguesia");
            })
        };
        
        console.log("Filtered freguesias only:", filteredData);
        const convertedData = convertLineStringToMultiPolygon(filteredData);
        console.log("Batas Kota data converted to MultiPolygon:", convertedData);
        layerBatasKota = L.layerGroup();
        
        convertedData.features.forEach((feature, index) => {
            const individualLayer = L.geoJSON(feature, {
                style: styleBatasKota,
                onEachFeature: function(feat, layer) {
                    // Popup content
                    if (feat.properties) {
                        let popupContent = '<div class="popup-content">';
                        popupContent += `<h3>${feat.properties.name || 'Unnamed'}</h3>`;

                    if (feat.properties.description) {
                        const desc = feat.properties.description;
                        const population = desc.match(/population=(\d+)/);
                        if (population) {
                            popupContent += `<p><strong>Populasi:</strong> ${population[1]}</p>`;
                        }
                    }
                        popupContent += `<p><strong>Nama Resmi:</strong> ${feat.properties.description?.match(/official_name=([^\\n]+)/)?.[1] || 'N/A'}</p>`;
                        popupContent += '</div>';
                        layer.bindPopup(popupContent);
                    }
                    
                    const originalStyle = {
                        weight: 5,
                        color: '#7B1FA2',
                        opacity: 0.95,
                        fillColor: '#9C27B0',
                        fillOpacity: 0.3,
                        dashArray: '12, 6, 3, 6'
                    };
                    
       
                    layer.on('mouseover', function(e) {
                        e.target.setStyle({
                            weight: 8,
                            color: '#FF6B35',
                            opacity: 1,
                            fillColor: '#FFE66D',
                            fillOpacity: 0.7,
                            dashArray: '15, 8, 4, 8'
                        });
                        
                   
                        e.target.bringToFront();
                        if (feat.properties && feat.properties.name) {
                            e.target.bindTooltip(feat.properties.name, {
                                permanent: false,
                                direction: 'center',
                                className: 'custom-tooltip'
                            }).openTooltip();
                        }
                    });
                    
                    layer.on('mouseout', function(e) {
                        e.target.setStyle(originalStyle);
                        e.target.closeTooltip();
                    });
                    
                    layer.on('click', function(e) {
                        e.target.openPopup();
                    });
                }
            });
            layerBatasKota.addLayer(individualLayer);
        });
        layerBatasKota.addTo(map);
        
    })
    .catch(error => {
        console.error('Error loading Batas Kota GeoJSON:', error);
    });


fetch('data/jalan_layer.geojson')
    .then(response => response.json())
    .then(data => {
        layerJalan = L.geoJSON(data, {
            style: styleJalan,
            onEachFeature: onEachFeature
        }).addTo(map);
    })
    .catch(error => {
        console.error('Error loading Jalan GeoJSON:', error);
    });

fetch('data/sungai_layerr.geojson')
    .then(response => response.json())
    .then(data => {
        layerSungai = L.geoJSON(data, {
            style: styleSungai,
            onEachFeature: onEachFeature
        }).addTo(map);
    })
    .catch(error => {
        console.error('Error loading Sungai GeoJSON:', error);
    });

    fetch('data/bangunan_layer.geojson')
    .then(response => response.json())
    .then(data => {
        layerBangunan = L.geoJSON(data, { style: styleBangunan, onEachFeature: onEachFeature }).addTo(map);
        tryAddLayerControl();
    })
    .catch(error => {
        console.error('Error loading Sungai GeoJSON:', error);
    });


setTimeout(() => {
    // Add layer control
    const baseMaps = {
        "OpenStreetMap": osmLayer,
        "Satelit": satelliteLayer,
        "Topografi": topoLayer
    };

    const overlayMaps = {
        "Batas Wilayah": layerBatas,
        "Batas Kota": layerBatasKota,
        "Jalan": layerJalan,
        "Sungai": layerSungai,
        "Bangunan": layerBangunan 
    };

    L.control.layers(baseMaps, overlayMaps).addTo(map);
    
    if (layerBatas) layerBatas.bringToBack();
    if (layerBatasKota) layerBatasKota.bringToFront();
    if (layerJalan) layerJalan.bringToFront();
    if (layerSungai) layerSungai.bringToFront();
    if (layerBangunan) layerBangunan.bringToFront();
    
}, 2000);  

document.getElementById('search-button').addEventListener('click', function() {
    searchFeatures();
});
document.getElementById('search-input').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        searchFeatures();
    }
});
document.getElementById('reset-search').addEventListener('click', function() {
    resetSearch();
});


function resetSearch() {
    try {
        console.log("Executing reset search...");
        
        
        if (searchResultLayer) {
            map.removeLayer(searchResultLayer);
            searchResultLayer = null;
        }
        
        // Hapus highlight saat ini jika ada
        if (currentHighlightLayer) {
            map.removeLayer(currentHighlightLayer);
            currentHighlightLayer = null;
        }
        
        // Reset tampilan hasil pencarian
        const searchResultsDiv = document.getElementById('search-results');
        if (searchResultsDiv) {
            searchResultsDiv.style.display = 'none';
            searchResultsDiv.innerHTML = '';
        }
        
        // Reset input pencarian
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.value = '';
        }
        
        console.log("Reset search completed.");
    } catch (error) {
        console.error("Error in resetSearch function:", error);
    }
}

// Fungsi pencarian yang diperbarui - TIDAK MEMANGGIL resetSearch() DI AWAL
function searchFeatures() {
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    const selectedLayer = document.getElementById('layer-select').value;
    const searchResultsDiv = document.getElementById('search-results');
    
    if (!searchTerm) {
        alert('Silakan masukkan kata kunci pencarian');
        return;
    }
    
    let foundFeatures = [];
    const nameProperties = ['name', 'official_name', 'short_name', 'name:en', 'display_name'];
    
    // Fungsi helper untuk mencari dalam layer
    function searchInLayer(layer, searchTerm) {
        const results = [];
        
        if (layer.eachLayer) {
            // Untuk LayerGroup atau FeatureGroup
            layer.eachLayer(function(subLayer) {
                if (subLayer.feature && subLayer.feature.properties) {
                    const props = subLayer.feature.properties;
                    let found = false;
                    let displayName = '';
                    
                    // Cek properti name terlebih dahulu
                    if (props.name && props.name.toString().toLowerCase().indexOf(searchTerm) !== -1) {
                        found = true;
                        displayName = props.name;
                    } else {
                        // Cek properti nama lainnya
                        for (let nameProp of nameProperties) {
                            if (props[nameProp] && 
                                props[nameProp].toString().toLowerCase().indexOf(searchTerm) !== -1) {
                                found = true;
                                displayName = props[nameProp];
                                break;
                            }
                        }
                        
                        // Jika masih tidak ditemukan, cek semua properti yang mengandung 'name'
                        if (!found) {
                            for (let prop in props) {
                                if (prop.toLowerCase().includes('name') && 
                                    props[prop] && 
                                    props[prop].toString().toLowerCase().indexOf(searchTerm) !== -1) {
                                    found = true;
                                    displayName = props[prop];
                                    break;
                                }
                            }
                        }
                    }
                    
                    if (found) {
                        results.push({
                            layer: subLayer,
                            displayName: displayName
                        });
                    }
                } else if (subLayer.eachLayer) {
                    // Untuk nested layer groups
                    results.push(...searchInLayer(subLayer, searchTerm));
                }
            });
        } else if (layer.feature && layer.feature.properties) {
            // Untuk single layer
            const props = layer.feature.properties;
            let found = false;
            let displayName = '';
            
            if (props.name && props.name.toString().toLowerCase().indexOf(searchTerm) !== -1) {
                found = true;
                displayName = props.name;
            }
            
            if (found) {
                results.push({
                    layer: layer,
                    displayName: displayName
                });
            }
        }
        
        return results;
    }
    
    // Pilih layer berdasarkan dropdown
    let selectedLayerObj;
    switch(selectedLayer) {
        case 'batas_kota':
            selectedLayerObj = layerBatasKota;
            break;
        case 'batas':
            selectedLayerObj = layerBatas;
            break;
        case 'jalan':
            selectedLayerObj = layerJalan;
            break;
        case 'sungai':
            selectedLayerObj = layerSungai;
            break;
        case 'bangunan':
            selectedLayerObj = layerBangunan;
            break;
    }
    
    if (selectedLayerObj) {
        foundFeatures = searchInLayer(selectedLayerObj, searchTerm);
    }
    
    // Tampilkan hasil
    if (foundFeatures.length === 0) {
        searchResultsDiv.style.display = 'block';
        searchResultsDiv.innerHTML = `
            <div class="search-header">
                <h4>Hasil Pencarian</h4>
                <div class="search-count">Tidak ditemukan hasil untuk "${searchTerm}"</div>
            </div>
        `;
        return;
    }
    
    // Hapus highlight sebelumnya
    if (currentHighlightLayer) {
        map.removeLayer(currentHighlightLayer);
        currentHighlightLayer = null;
    }
    
    // Tampilkan hasil pencarian
    searchResultsDiv.style.display = 'block';
    searchResultsDiv.innerHTML = `
        <div class="search-header">
            <h4>Hasil Pencarian</h4>
            <div class="search-count">Ditemukan ${foundFeatures.length} hasil:</div>
        </div>
        <ul class="search-result-list">
            ${foundFeatures.map((item, index) => `
                <li class="result-item" data-index="${index}">
                    ${item.displayName}
                </li>
            `).join('')}
        </ul>
        <div class="result-scrollbar">
            <span class="scroll-arrow scroll-up">▲</span>
            <span class="scroll-arrow scroll-down">▼</span>
        </div>
    `;
    
    // Event listeners untuk item hasil
    const resultItems = document.getElementsByClassName('result-item');
    for (let i = 0; i < resultItems.length; i++) {
        resultItems[i].addEventListener('click', function() {
            const featureIndex = parseInt(this.getAttribute('data-index'));
            const selectedFeature = foundFeatures[featureIndex];
            
            if (currentHighlightLayer) {
                map.removeLayer(currentHighlightLayer);
            }
            
            if (selectedFeature && selectedFeature.layer) {
                const layer = selectedFeature.layer;
                const geoJsonFeature = layer.toGeoJSON();
                
                currentHighlightLayer = L.geoJSON(geoJsonFeature, {
                    style: styleSearchResult,
                    onEachFeature: onEachFeature
                }).addTo(map);
                
                // Zoom ke fitur
                if (layer.getBounds) {
                    map.fitBounds(layer.getBounds(), { padding: [50, 50] });
                } else if (layer.getLatLng) {
                    map.setView(layer.getLatLng(), 18);
                }
                
                // Buka popup
                setTimeout(() => {
                    if (currentHighlightLayer) {
                        currentHighlightLayer.eachLayer(l => {
                            if (l.getPopup) l.openPopup();
                        });
                    }
                }, 300);
            }
        });
    }
    
    // Scroll controls
    document.querySelector('.scroll-up')?.addEventListener('click', function() {
        const resultList = document.querySelector('.search-result-list');
        resultList.scrollTop -= 100;
    });
    
    document.querySelector('.scroll-down')?.addEventListener('click', function() {
        const resultList = document.querySelector('.search-result-list');
        resultList.scrollTop += 100;
    });
}

if (!L.LatLng.prototype.toBounds) {
    L.LatLng.prototype.toBounds = function(size) {
        size = size || 100;
        const sw = L.latLng(this.lat - 0.001 * size, this.lng - 0.001 * size);
        const ne = L.latLng(this.lat + 0.001 * size, this.lng + 0.001 * size);
        return L.latLngBounds(sw, ne);
    };
}

L.control.scale({
    position: 'bottomright',
    maxWidth: 100,
    metric: true,
    imperial: false,
    updateWhenIdle: true
}).addTo(map);


const osm_minimap = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    minZoom: 0,
    maxZoom: 13
});

// Buat minimap dan tambahkan ke peta utama
const miniMap = new L.Control.MiniMap(osm_minimap, {
    toggleDisplay: true,
    position: 'bottomright',
    width: 150,
    height: 150,
    zoomLevelOffset: -5,
    collapsedWidth: 28,
    collapsedHeight: 28,
    aimingRectOptions: {
        color: '#00693E',  // Warna sesuai dengan tema utama
        weight: 2,
        opacity: 0.7,
        fillOpacity: 0.1
    }
}).addTo(map);

const compassControl = L.control({position: "topleft"});
compassControl.onAdd = function(map) {
    const div = L.DomUtil.create("div", "info compass");
    div.innerHTML = 
        '<svg viewBox="0 0 120 120" width="50" height="50">' +
        // Background circle
        '<circle cx="60" cy="60" r="55" fill="rgba(255,255,255,0.95)" stroke="#333" stroke-width="2"/>' +
        // Inner decorative circles
        '<circle cx="60" cy="60" r="45" fill="none" stroke="#666" stroke-width="1"/>' +
        '<circle cx="60" cy="60" r="38" fill="none" stroke="#999" stroke-width="0.5" stroke-dasharray="1,1"/>' +
        
        // Main compass star (8-pointed)
        // North point (black)
        '<path d="M60,8 L68,55 L60,48 L52,55 Z" fill="#000" stroke="#fff" stroke-width="0.5"/>' +
        // South point (black)  
        '<path d="M60,112 L52,65 L60,72 L68,65 Z" fill="#000" stroke="#fff" stroke-width="0.5"/>' +
        // East point (black)
        '<path d="M112,60 L65,52 L72,60 L65,68 Z" fill="#000" stroke="#fff" stroke-width="0.5"/>' +
        // West point (black)
        '<path d="M8,60 L55,68 L48,60 L55,52 Z" fill="#000" stroke="#fff" stroke-width="0.5"/>' +
        
        // Diagonal points (smaller, gray)
        '<path d="M95,25 L65,55 L60,60 L55,55 L25,25 L35,35 L55,55 L65,55 L85,35 Z" fill="#666" stroke="#fff" stroke-width="0.3"/>' +
        '<path d="M95,95 L65,65 L60,60 L55,65 L25,95 L35,85 L55,65 L65,65 L85,85 Z" fill="#666" stroke="#fff" stroke-width="0.3"/>' +
        
        // Center circle
        '<circle cx="60" cy="60" r="4" fill="#fff" stroke="#333" stroke-width="1.5"/>' +
        '<circle cx="60" cy="60" r="2" fill="#333"/>' +
        
        // Cardinal direction labels
        '<text x="60" y="18" text-anchor="middle" font-family="Arial" font-weight="bold" font-size="10" fill="#000">N</text>' +
        '<text x="60" y="108" text-anchor="middle" font-family="Arial" font-weight="bold" font-size="10" fill="#000">S</text>' +
        '<text x="15" y="65" text-anchor="middle" font-family="Arial" font-weight="bold" font-size="10" fill="#000">W</text>' +
        '<text x="105" y="65" text-anchor="middle" font-family="Arial" font-weight="bold" font-size="10" fill="#000">O</text>' +
        
        // Intercardinal direction labels (smaller)
        '<text x="85" y="30" text-anchor="middle" font-family="Arial" font-weight="normal" font-size="6" fill="#666">NE</text>' +
        '<text x="85" y="95" text-anchor="middle" font-family="Arial" font-weight="normal" font-size="6" fill="#666">SE</text>' +
        '<text x="35" y="95" text-anchor="middle" font-family="Arial" font-weight="normal" font-size="6" fill="#666">SW</text>' +
        '<text x="35" y="30" text-anchor="middle" font-family="Arial" font-weight="normal" font-size="6" fill="#666">NW</text>' +
        '</svg>';
    return div;
};
compassControl.addTo(map);

// CSS untuk kompas yang diperbaiki
const compassStyle = document.createElement('style');
compassStyle.textContent = `
.compass {
    background: transparent;
    border-radius: 50%;
    padding: 2px;
    margin-top: 10px !important;
    cursor: default;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
}
.compass svg {
    display: block;
    filter: drop-shadow(0px 1px 3px rgba(0,0,0,0.3));
}
.compass:hover {
    transform: scale(1.05);
    transition: transform 0.2s ease;
}

/* Custom tooltip styling */
.custom-tooltip {
    background: rgba(255, 107, 53, 0.95) !important;
    border: 2px solid #FF6B35 !important;
    border-radius: 8px !important;
    color: white !important;
    font-weight: bold !important;
    font-size: 14px !important;
    padding: 8px 12px !important;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3) !important;
    text-align: center !important;
}

.custom-tooltip::before {
    border-top-color: #FF6B35 !important;
}

/* Popup styling yang lebih bagus */
.popup-content {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    max-width: 250px;
    padding: 10px;
}

.popup-content strong {
    color: #7B1FA2;
    font-weight: 600;
}

/* Hover transition yang smooth */
.leaflet-interactive {
    transition: all 0.3s ease !important;
}
`;
document.head.appendChild(compassStyle);


// Tambahkan legend control ke peta
// Tambahkan legend control ke peta
const legend = L.control({position: 'bottomleft'});

legend.onAdd = function (map) {
    const div = L.DomUtil.create('div', 'info legend');
    div.innerHTML = `
        <h4><center>Legenda</center></h4>
        <div class="legend-item">
            <i style="background:#1B5E20; opacity:0.9"></i>
            <span>Batas Wilayah</span>
        </div>
        <div class="legend-item">
            <i style="background:#7B1FA2; opacity:0.9"></i>
            <span>Batas Kota</span>
        </div>
        <div class="legend-item">
            <i style="background:#FF5722; opacity:0.9"></i>
            <span>Jalan</span>
        </div>
        <div class="legend-item">
            <i style="background:#0066FF; opacity:0.9"></i>
            <span>Sungai</span>
        </div>
        <div class="legend-item">
            <i style="background:#3E2723; opacity:0.9"></i>
            <span>Bangunan</span>
        </div>
    `;
    return div;
};

legend.addTo(map);

// Geser legenda setelah ditambahkan
setTimeout(() => {
    const legendElement = document.querySelector('.leaflet-bottom.leaflet-left .legend');
    if (legendElement) {
        legendElement.style.marginLeft = '30px';
    }
}, 100);