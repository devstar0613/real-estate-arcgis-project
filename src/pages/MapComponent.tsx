import { useAuth0 } from "@auth0/auth0-react";
import { ChangeEvent, useEffect, useRef, useState } from 'react';
import PopupInfo from '../components/PopupInfo';
import PopupPortal from '../components/PopupPortal';
import { getMapPointData } from '../actions/getMapPointDataAction';
import '../styles/globals.css';
import '../styles/custom.css';
import axios from 'axios';
import Graphic from '@arcgis/core/Graphic';
import Map from '@arcgis/core/Map';
import PopupTemplate from '@arcgis/core/PopupTemplate';
import Point from '@arcgis/core/geometry/Point';
import { locationToAddress } from '@arcgis/core/rest/locator';
import AddressCandidate from '@arcgis/core/rest/support/AddressCandidate.js';
import SimpleMarkerSymbol from '@arcgis/core/symbols/SimpleMarkerSymbol';
import MapView from '@arcgis/core/views/MapView';
import Search from '@arcgis/core/widgets/Search';
import KMLLayer from "@arcgis/core/layers/KMLLayer.js";
import SimpleFillSymbol from "@arcgis/core/symbols/SimpleFillSymbol.js";
import FeatureLayer from '@arcgis/core/layers/FeatureLayer';
import MapImageLayer from '@arcgis/core/layers/MapImageLayer'
import Polygon from "@arcgis/core/geometry/Polygon.js";
import { Sidebar } from 'primereact/sidebar';
import GeoJSONLayer from "@arcgis/core/layers/GeoJSONLayer";

const popupRoot = document.createElement('div');

export default function MapComponent() {
  const { logout } = useAuth0();

  const handleLogout = () => {
    logout({
      logoutParams: {
        returnTo: 'https://www.atlaspro.ai',
      },
    });
  };

  const mapDiv = useRef<HTMLDivElement>(null);
  const [popupData, setPopupData] = useState<AddressCandidate | null>(null);
  const [view, setView] = useState<any>(null);
  const [avatarFlag, setAvatarFlag] = useState<any>(0);
  const [kmlUrl, setKmlUrl] = useState<string | null>(null);
  const [selectedMap, setSelectedMap] = useState<string>('Satellite');
  const [addedLayer, setAddedLayer] = useState<FeatureLayer|MapImageLayer|KMLLayer|null>(null);
  const [displayData, setDisplayData] = useState<any | null>(null);

  const [visible, setVisible] = useState(false);

  const getSelectedData = async (mapType:string, point:Point, callType:number) => {
    let featureLayer: FeatureLayer;
    let featureURL: string = '';
    switch(mapType){
      case 'Parcel_View':
        featureURL = "https://fs.regrid.com/UMikI7rWkdcPyLwSrqTgKqLQa7minA8uC2aiydrYCyMJmZRVwc0Qq2QSDNtexkZp/rest/services/premium/FeatureServer/0";
        break;
      case 'Income_Centroids':
        featureURL = "https://services.arcgis.com/P3ePLMYs2RVChkJx/ArcGIS/rest/services/ACS_10_14_Household_Income_Distribution_Boundaries/FeatureServer/2";
        break;
      case 'Income_Boundaries':
        featureURL = "https://services.arcgis.com/P3ePLMYs2RVChkJx/ArcGIS/rest/services/ACS_10_14_Household_Income_Distribution_Boundaries/FeatureServer/2";
        break;
      case 'Client_Data':
        featureURL = "https://services6.arcgis.com/f0Sebh8k8T7kZDhr/arcgis/rest/services/Tybee_Island_parcel_SHP/FeatureServer/0"
        break;
      default:
        featureURL = ''
    }
    featureLayer = new FeatureLayer({
      url: featureURL
    });
    const query = featureLayer.createQuery();
    query.geometry = point;
    query.spatialRelationship = 'intersects';
    query.returnGeometry = true;
    query.outFields = ['*'];
    const queryResult = await featureLayer.queryFeatures(query);
    console.log('------->queryResult attributes',queryResult); // Example: Display the attributes in the console

    const features = queryResult.features;
    if(callType == 2){
      if(mapType == "Parcel_View" || mapType == "Client_Data"){
        localStorage.setItem('parcelData', JSON.stringify({}));
      }
      if(mapType == "Income_Boundaries"){
        localStorage.setItem('incomeData', JSON.stringify({}));
      }
    }
    if (features.length > 0) {
      const firstFeature = features[0];
      const attributes = firstFeature.attributes;
      if(callType == 1){
        setDisplayData(attributes);
        setVisible(true);
      }
      if(callType == 2){
        if(mapType == "Parcel_View"){
          if (typeof window !== 'undefined') {
            localStorage.setItem('parcelData', JSON.stringify(attributes));
            console.log('----->setParcelData', attributes)
          }
        }
        if(mapType == "Income_Boundaries"){
          if (typeof window !== 'undefined') {
            localStorage.setItem('incomeData', JSON.stringify(attributes));
            console.log('----->setIncomeData', attributes)
          }
        }
      }
      return attributes;
      console.log('------->parcel attributes',attributes); // Example: Display the attributes in the console
    }
  }
  
  const mapFunction = (mapType:string) => {
    const map = new Map({
      basemap: 'hybrid',
    });

    if(addedLayer != null)
      map.remove(addedLayer);
    let featureURL: string = '';
    let featureLayer: FeatureLayer;
    let isFeatureLayer: number = 0;

    switch(mapType){
      case 'Parcel_View':
        featureURL = "https://fs.regrid.com/UMikI7rWkdcPyLwSrqTgKqLQa7minA8uC2aiydrYCyMJmZRVwc0Qq2QSDNtexkZp/rest/services/premium/FeatureServer/0";
        break;
      case 'Income_Centroids':
        featureURL = "https://services.arcgis.com/P3ePLMYs2RVChkJx/ArcGIS/rest/services/ACS_Household_Income_Distribution_Centroids/FeatureServer/2";
        break;
      case 'Income_Boundaries':
        featureURL = "https://services.arcgis.com/P3ePLMYs2RVChkJx/ArcGIS/rest/services/ACS_10_14_Household_Income_Distribution_Boundaries/FeatureServer/2";
        break;
      case 'Client_Data':
        featureURL = "https://services6.arcgis.com/f0Sebh8k8T7kZDhr/arcgis/rest/services/Tybee_Island_parcel_SHP/FeatureServer/0"
        break;
      default:
        featureURL = ''
    }
    
    // const trailsRenderer = {
    //   type: "simple",
    //   symbol: {
    //     type: "simple-fill",
    //     color: [0, 0, 200, 0.2],
    //     style: "solid",
    //     outline: {
    //       color: [0, 200, 255, 0.8],
    //       type: "simple-line",
    //       style: "solid",
    //       width: '1px'
    //     }
    //   }
    // };
    const trailsRendererForRegrid = {
      type: "unique-value",
      valueExpression: "IIf(Find('#', $feature.address) > -1, 'yellow', 'default')",
      uniqueValueInfos: [
        {
          value: 'yellow',
          symbol: {
            type: "simple-fill",
            color: [255, 255, 0, 0.2], // Yellow color with opacity
            outline: {
              color: [255, 255, 0, 0.8], // Black outline
              width: 1
            }
          }
        },
        {
          value: 'default',
          symbol: {
            type: "simple-fill",
            color: [0, 0, 200, 0.2], // Default color with opacity
            outline: {
              color: [0, 200, 255, 0.8],
              width: 1
            }
          }
        },
        {
          value: 'selected',
          symbol: {
            type: "simple-fill",
            color: [0, 255, 0, 0.2], // Green color with opacity
            outline: {
              color: [0, 255, 0, 0.8],
              width: 1
            }
          }
        }
      ]
    };
    if(mapType == 'Parcel_View' || mapType == 'Income_Centroids' || mapType == 'Income_Boundaries'){
      if(mapType == 'Parcel_View') {
        featureLayer = new FeatureLayer({
          url: featureURL,
          // @ts-ignore
          renderer:trailsRendererForRegrid,
          opacity: 1
        });
      }
      else {
        featureLayer = new FeatureLayer({
          url: featureURL,
          opacity: 0.8
        });
      }
      map.add(featureLayer);
      setAddedLayer(featureLayer);
      // featureLayer.popupEnabled = true;
      isFeatureLayer = 1;
    }

    if(mapType == "Elevation") {
      const elevationLayer = new MapImageLayer({
        url: "https://services.arcgisonline.com/ArcGIS/rest/services/USA_Topo_Maps/MapServer",  //Elevation Map
        sublayers: [
          {
            id: 0,
            visible: true
          }
        ],
        opacity: 0.8
      });
      map.add(elevationLayer);
      setAddedLayer(elevationLayer);
    }

    const mapView = new MapView({
      container: mapDiv.current!,
      map,
      // seattle coordinates
      // center: [-122.335167, 47.608013],
      center: [-80.84348087252627, 32.008940055682096],
      zoom: 13,
      // popupEnabled: true,
      popup: {
        dockEnabled: true,
        dockOptions: {
          buttonEnabled: false,
          breakpoint: false,
          position: 'bottom-right',
        },
        collapseEnabled: false,
        visibleElements: {
          closeButton: false,
        },
        viewModel: {
          includeDefaultActions: false,
        },
      },
    });
    
    if(mapType == 'Parcel_View' && kmlUrl){
      const kmlLayer = new KMLLayer({
        // url: "https://storage.googleapis.com/atlasproai-dashboard/tybee_island.kml",
        url: kmlUrl,
      });
      map.add(kmlLayer);
      // const jsonLayer = new GeoJSONLayer({
      //   url: 'https://storage.googleapis.com/atlasproai-dashboard/pr_gurabo.json',
      // });
      // map.add(jsonLayer);
      
      // const featureLayer = new FeatureLayer({
      //   url: "https://services6.arcgis.com/f0Sebh8k8T7kZDhr/arcgis/rest/services/Tybee_Island_parcel_SHP/FeatureServer/0",
      //   // @ts-ignore
      //   // renderer:trailsRenderer,
      //   opacity: 0.1
      // })
      // map.add(featureLayer);

      // Function to calculate the center point and radius of the circle in meters
      const calculateCircleFromPolygon = (polygonData: string[]) => {
        // Convert polygon data to an array of [longitude, latitude] pairs
        const coordinates = polygonData.map(coord => {
          const [lon, lat] = coord.split(',').map(parseFloat);
          return { lon, lat };
        });

        // Calculate the center point of the polygon
        const center = coordinates.reduce((acc, curr) => {
          return { lon: acc.lon + curr.lon / coordinates.length, lat: acc.lat + curr.lat / coordinates.length };
        }, { lon: 0, lat: 0 });

        // Function to convert degrees to radians
        const degreesToRadians = (degrees: number) => {
          return degrees * (Math.PI / 180);
        };

        // Function to calculate the distance in meters between two points given their latitude and longitude
        const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
          const R = 6371000; // Radius of the Earth in meters
          const phi1 = degreesToRadians(lat1);
          const phi2 = degreesToRadians(lat2);
          const deltaPhi = degreesToRadians(lat2 - lat1);
          const deltaLambda = degreesToRadians(lon2 - lon1);

          const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
                    Math.cos(phi1) * Math.cos(phi2) *
                    Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

          return R * c;
        };

        // Calculate the radius of the circle as the distance from the center to the farthest point in the polygon
        const radius = Math.max(...coordinates.map(coord => {
          return haversineDistance(center.lat, center.lon, coord.lat, coord.lon);
        }));

        return { center, radius };
      };

      const fetchKmlData = async () => {
        try {
          const response = await fetch(kmlUrl);
          const kmlData = await response.text();
          // console.log(kmlData);
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(kmlData, 'text/xml');

          if(xmlDoc.getElementsByTagName('Polygon')[0]){
            const coordinateString = xmlDoc.getElementsByTagName('coordinates')[0].textContent;
            if(coordinateString){

              const coordinatePairs = coordinateString?.trim().split(' ');
              console.log(coordinatePairs); // You can process the KML data here
         
              const rings: any[][] = [];
              // Loop through the coordinate pairs and create a ring
              for (const coordinatePair of coordinatePairs) {
                const [lon, lat] = coordinatePair.split(',');
    
                // Create a point from the lon/lat values
                const point = new Point({
                  longitude: parseFloat(lon),
                  latitude: parseFloat(lat),
                });
    
                // Add the point to the ring
                rings.push([point.x, point.y]);
              }
    
              const polygon = new Polygon({
                hasZ: true,
                hasM: true,
                rings: rings,
                spatialReference: { wkid: 4326 }
              });
    
              const markerSymbol = new SimpleFillSymbol({
                color: [100, 0, 0, 0.1],
                outline: {
                  color: [255, 0, 0],
                  width: 1,
                },
              });
    
              const polygonGraphic = new Graphic({
                geometry: polygon,
                symbol: markerSymbol
              });
              mapView.graphics.add(polygonGraphic)

              // const circleLocation = calculateCircleFromPolygon(coordinatePairs);
              // console.log("===========circleLocation==========", circleLocation)
              // const centerAddress = await geocodingReverse(circleLocation.center.lat, circleLocation.center.lon)
              // const response = await axios.post('https://map-file-upload-server.vercel.app/getAllPlacesWithinCircle',{
              // // const response = await axios.post('http://localhost:5000/getAllPlacesWithinCircle',{
              //   circleLocation: circleLocation,
              // })
              // fetchAllPlacesWithinCircle(circleLocation)

              // const centerPoint = new Point({
              //   x: circleLocation.center.lon,
              //   y: circleLocation.center.lat,
              //   spatialReference: { wkid: 4326 } // Assuming the coordinates are in WGS84
              // });
              
              // const circleGeometry = new Circle({
              //   center: centerPoint,
              //   radius: circleLocation.radius
              // });
              // const circleGraphic = new Graphic({
              //   geometry: circleGeometry,
              //   symbol: markerSymbol
              // });
              // mapView.graphics.add(circleGraphic)
            }
          }
        } catch (error) {
          console.error('Error fetching KML data:', error);
        }
      };
    
      fetchKmlData();
    }

    const searchWidget = new Search({
      view: mapView,
      container: 'searchWidget',
    });

    mapView
      .when(() => {
        mapView.ui.add(searchWidget, {
          position: 'top-right',
        });
        setView(mapView);
        mapView.popupEnabled = false;
        mapView.on('click', async (event) => {
          console.log('------------->event.mapPoint',event.mapPoint)
          try {
            const response = await locationToAddress(
              'https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer',
              {
                location: event.mapPoint,
              },
            );
            
            if (typeof window !== 'undefined') {
              localStorage.setItem('Address', response.address);
            }

            const parcelData = await getSelectedData("Parcel_View", event.mapPoint, 2);
            const incomeData = await getSelectedData("Income_Boundaries", event.mapPoint, 2);

            console.log(
              '🚀 ~ file: MapComponent.tsx:240 ~ mapView.on ~ response:',
              response,
            );

            if(isFeatureLayer == 1){
              if (response.address) {
                getSelectedData(mapType,event.mapPoint,1);
              }
            }
            await getMapPointData({address:response.address, parcelData:parcelData, incomeData:incomeData, elevation:'10m'})

            const locationToElevation = await axios.post('https://api.open-elevation.com/api/v1/lookup', {"locations":[{"latitude": event.mapPoint.latitude, "longitude":event.mapPoint.longitude}]});
            console.log('---->locationToElevation', locationToElevation.data.results[0].elevation);
            let elevationResult = locationToElevation.data.results[0].elevation;
            if (typeof window !== 'undefined') {
              localStorage.setItem('Elevation', JSON.stringify(locationToElevation.data.results[0].elevation));
            }
            if(mapType == 'Elevation'){
              setDisplayData({elevation:elevationResult});
              setVisible(true);
            }
            await getMapPointData({address:response.address, parcelData:parcelData, incomeData:incomeData, elevation:`${elevationResult}m`})
            // showPopup(event.mapPoint, response.address, mapView);
            mapView.openPopup({
              title: response.address,
              location: event.mapPoint,
              content: (() => {
                setPopupData(response);
                return popupRoot;
              })(),
            });
          } catch (error) {
            console.error('Error fetching address:', error);
          }
        });
      })
      .catch((error) => {
        console.log(
          '🚀 ~ file: MapComponent.tsx:235 ~ mapView.when ~ error:',
          error,
        );
      });
  }
  
  useEffect(() => {
    if (!view) {
      mapFunction('Satellite');
    }
  }, [view]);
  
  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      const dropdown = document.querySelector('.avatar_dropdown');
      const avatar = document.querySelector('.avatar_image');

      if (avatar && dropdown && !avatar.contains(event.target as Node) && !dropdown.contains(event.target as Node)) {
        setAvatarFlag(0);
      }
    };

    document.addEventListener('click', handleDocumentClick);

    return () => {
      document.removeEventListener('click', handleDocumentClick);
    };
  }, []);
  
  const changeSelectionHandler = (mapType:string) => {
    console.log('---------->mapType',mapType)
    setSelectedMap(mapType);
    mapFunction(mapType);
  }

  const handleAvatarClick = () => {
    setAvatarFlag((prevFlag: number) => (prevFlag === 0 ? 1 : 0));
  };
  // console.log('🚀 ~ file: MapComponent.tsx:240 ~ showPopup ~ view:', view);

  const showPopup = (point: Point, address: string, mapView: MapView) => {
    console.log(
      '🚀 ~ file: MapComponent.tsx:305 ~ showPopup ~ address:',
      address,
    );
    mapView.popup.close();
    mapView.graphics.removeAll();

    const popupTemplate = new PopupTemplate({
      title: '{address}',
      content: `<div class="popup-content">
      <h3>Location Details</h3>
      <p>Latitude: {latitude}</p>
      <p>Longitude: {longitude}</p>
      <!-- Your chatbox HTML/CSS content here -->
      <div class="chatbox">
        <div class="chatbox-messages">
          <!-- Chat messages go here -->
        </div>
        <input type="text" placeholder="Type a message...">
        <button>Send</button>
      </div>
    </div>`,
    });

    const markerSymbol = new SimpleMarkerSymbol({
      color: [226, 119, 40],
      outline: {
        color: [255, 255, 255],
        width: 1,
      },
    });

    const graphic = new Graphic({
      geometry: new Point({
        longitude: point.longitude,
        latitude: point.latitude,
        spatialReference: mapView.spatialReference,
      }),
      symbol: markerSymbol,
      popupTemplate,
      attributes: {
        address,
        latitude: point.latitude,
        longitude: point.longitude,
      },
    });

    // mapView.graphics.removeAll();
    mapView.graphics.add(graphic);
    mapView.openPopup({
      location: point,
      features: [graphic],
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if(event.target.files){
      const file = event.target.files[0];

      if (file) {
        const response = await axios.get('https://map-file-upload-server.vercel.app/getSignedUrl',{
          params:{
            file: file.name,
            // type: file.type
            type: 'application/octet-stream'
          }
        })
        const signedUrl = response.data

        console.log('=========response=========', response)

        const xhr = new XMLHttpRequest();
        xhr.open('PUT', signedUrl, true);
        // xhr.setRequestHeader('Content-Type', file.type); // Set this to match the actual file type
        xhr.setRequestHeader('Content-Type', 'application/octet-stream');
        xhr.upload.onprogress = (e: ProgressEvent) => {
          if (e.lengthComputable) {
            const progress = (e.loaded / e.total) * 100;
            console.log(progress);
          }
        };
        
        xhr.onload = function () {
          if (xhr.status === 200) {
            console.log('File uploaded successfully');
            const BUCKET_NAME = 'atlasproai-dashboard'
            const publicUrl = `https://storage.googleapis.com/${BUCKET_NAME}/${file.name}`;
            setKmlUrl(publicUrl)
            // setKmlUrl('https://storage.googleapis.com/atlasproai-dashboard/Tour_de_France.kmz')
          } else {
            console.error('Error uploading file:', xhr.statusText);
          }
        };

        xhr.onerror = function () {
          console.error('XHR onerror event');
        };

        xhr.send(file); // Send the file blob
      }
    }
  };

  useEffect(() => {
    if (kmlUrl) {
      mapFunction('Parcel_View');
    }
  }, [kmlUrl]);

  return (
    <section id="map-page-container" className="w-full h-screen">
      <header
        className="flex items-center justify-between w-full p-4 bg-light-green"
        style={{ height: '10%' }}
      >
        <div className="flex items-center">
          <a href="#">
            <img
              src="https://www.dropbox.com/scl/fi/ensej1l64crnkpsmy2kbi/atlaspro-light-logo-1.png?rlkey=t18h2pq0lez222klradjj8fy9&raw=1"
              alt="Atlas Pro Intelligence Logo"
              className="mx-auto" // Adjust the class as needed for styling
              width="100%"
              style={{ maxWidth: '150px' }}
            />
          </a>
        </div>
        <div className="flex items-center">
          {/* <a href={`https://app.atlaspro.ai/${localStorage.getItem('Address')}`} style={{marginLeft:'10px',marginRight:'10px'}}>
            <img
              src="wand.png"
              alt="Magical Wand Image"
              className="mx-auto" // Adjust the class as needed for styling
              width="40px"
              // style={{ maxWidth: '150px' }}
            />
          </a> */}
          <div style={{marginLeft:'10px',marginRight:'20px', marginTop:'5px', cursor:'pointer'}}>
            <img
              // src="https://www.dropbox.com/scl/fi/0tssi4mzfom6e3y7p0n0f/Pngtree-user-icon_4479727.png?rlkey=b7q7n33exi2m4b7jkmdh4bf6m&raw=1"
              src="settings.png"
              alt="Atlas Pro Intelligence Logo"
              className="mx-auto avatar_image" // Adjust the class as needed for styling
              width="30px"
              onClick={handleAvatarClick}
            />
            {avatarFlag == 1 &&
              <div className="avatar_dropdown">
                <p className="logout_button" style={{marginLeft:'20px', marginTop:'5px'}} onClick={handleLogout}>Log out</p> 
              </div>}
          </div>
          {/* <button
            className="items-center gap-3 p-3 text-white transition-colors duration-200 rounded-md cursor-pointer select-none hover:text-white/30"
            onClick={handleLogout}
          >
            Logout
          </button> */}
        </div>
      </header>
      <div style={{display:"flex", marginBottom:'-15px', justifyContent:"space-between"}}>
        <div style={{display:"flex"}}>
          <div style={{marginTop:'10px'}}>
            <label htmlFor="mapSelector" style={{color:'white', marginLeft:'90px'}}>Select map:&nbsp;&nbsp;</label>
            <select
              id="mapSelector"
              value={selectedMap}
              onChange={(e)=>changeSelectionHandler(e.target.value)}
            >
              <option value="Satellite">Satellite Map</option>
              <option value="Parcel_View">Parcel Viewer Map | Client Data</option>
              <option value="Income_Centroids">Income Distribution with Centroids</option>
              <option value="Income_Boundaries">Income Distribution with Boundaries</option>
              <option value="Elevation">Elevation Map</option>
            </select>
          </div>
          {selectedMap=="Parcel_View" && 
            <div style={{marginLeft:'40px'}}>
              <input type="file" accept=".kml,.kmz" style={{marginTop:'6px', color:"white", width:"250px"}} onChange={handleFileUpload} />
            </div>
          }
        </div>
        {selectedMap == "Parcel_View" && 
          <div style={{display:"flex", marginRight:'90px', marginTop:'5px'}}>
            <div style={{marginBottom:'-2px'}}>
              <a href={kmlUrl?'https://storage.googleapis.com/atlasproai-dashboard/addresses_within_polygon.csv':'#'}>
                <img
                  src="top_export.png"
                  alt="Atlas Pro Intelligence Logo"
                  className="mx-auto" // Adjust the class as needed for styling
                  width="33px"
                  style={{cursor:'pointer'}}
                />
              </a>
            </div>
            <div style={{marginLeft:'20px',marginTop:'2px'}}>
              <img
                src="right_arrow_download.png"
                alt="Atlas Pro Intelligence Logo"
                className="mx-auto" // Adjust the class as needed for styling
                width="28px"
                style={{cursor:'pointer'}}
              />
            </div>
          </div>
        }
      </div>
      <div
        ref={mapDiv}
        style={{
          height: '87%',
          width: '90%',
          margin: 'auto',
          paddingLeft: '150px',
          overflow: 'hidden',
          padding: '20px 0px',
        }}
      >
        <PopupPortal mountNode={popupRoot}>
          <PopupInfo address={popupData}></PopupInfo>
        </PopupPortal>
        <Sidebar visible={visible} onHide={() => setVisible(false)}>
          <p style={{fontSize:'25px', marginBottom:'30px', fontWeight:'500'}}>Information</p>
          
          {/* {displayData && selectedMap == "Parcel_View" &&
            <div style={{lineHeight:'30px', marginLeft:'15px', fontWeight:'400'}}>
              <p><span style={{fontWeight:'500'}}>Area Code:</span>&nbsp; {displayData.FIPS_NR}</p>
              <p><span style={{fontWeight:'500'}}>County Name:</span>&nbsp; {displayData.COUNTY_NM}</p>
              <p><span style={{fontWeight:'500'}}>Parcel Identification Number:</span>&nbsp; {displayData.PARCEL_ID_NR}</p>
              <p><span style={{fontWeight:'500'}}>Original Parcel ID:</span>&nbsp; {displayData.ORIG_PARCEL_ID}</p>
              <p><span style={{fontWeight:'500'}}>Property Address:</span>&nbsp; {displayData.SITUS_ADDRESS}</p>
              <p><span style={{fontWeight:'500'}}>Sub-address:</span>&nbsp; {displayData.SUB_ADDRESS}</p>
              <p><span style={{fontWeight:'500'}}>City Name:</span>&nbsp; {displayData.SITUS_CITY_NM}</p>
              <p><span style={{fontWeight:'500'}}>ZIP Code:</span>&nbsp; {displayData.SITUS_ZIP_NR}</p>
              <p><span style={{fontWeight:'500'}}>Land Use Code:</span>&nbsp; {displayData.LANDUSE_CD}</p>
              <p><span style={{fontWeight:'500'}}>Land Value:</span>&nbsp; {displayData.VALUE_LAND}</p>
              <p><span style={{fontWeight:'500'}}>Building Value:</span>&nbsp; {displayData.VALUE_BLDG}</p>
              <p><span style={{fontWeight:'500'}}>Parcel Data Link:</span>&nbsp; <span><a style={{color:"blue"}} href={displayData.DATA_LINK}>View</a></span></p>
              <p><span style={{fontWeight:'500'}}>Total Area:</span>&nbsp; {displayData.Shape__Area}</p>
              <p><span style={{fontWeight:'500'}}>Boundary Length:</span>&nbsp; {displayData.Shape__Length}</p>
            </div>
          } */}

          {displayData && (selectedMap == "Income_Centroids" || selectedMap == "Income_Boundaries") &&
            <div style={{lineHeight:'30px', marginLeft:'15px', fontWeight:'400'}}>
              <p><span style={{fontWeight:'500'}}>Name:</span>&nbsp; {displayData.NAME}</p>
              <p><span style={{fontWeight:'500'}}>Area Code:</span>&nbsp; {displayData.GEOID}</p>
              <p><span style={{fontWeight:'500'}}>Area of Land (Square Meters):</span>&nbsp; {displayData.ALAND}</p>
              <p><span style={{fontWeight:'500'}}>Area of Water (Square Meters):</span>&nbsp; {displayData.AWATER}</p>
              <p><span style={{fontWeight:'500'}}>Total households:</span>&nbsp; {displayData.B19001_001E}</p>
              <p><span style={{fontWeight:'500'}}>Total households- Margin of Error:</span>&nbsp; {displayData.B19001_001M}</p>
              <p><span style={{fontWeight:'500'}}>&nbsp;less than $10000 (12months):</span>&nbsp; {displayData.B19001_002E}</p>
              <p><span style={{fontWeight:'500'}}>&nbsp;less than $10000 - MoE:</span>&nbsp; {displayData.B19001_002M}</p>
              <p><span style={{fontWeight:'500'}}>$10,000 to $14,999:</span>&nbsp; {displayData.B19001_003E}</p>
              <p><span style={{fontWeight:'500'}}>$10,000 to $14,999 - MoE:</span>&nbsp; {displayData.B19001_003M}</p>
              <p><span style={{fontWeight:'500'}}>$15,000 to $19,999:</span>&nbsp; {displayData.B19001_004E}</p>
              <p><span style={{fontWeight:'500'}}>$15,000 to $19,999 - MoE:</span>&nbsp; {displayData.B19001_004M}</p>
              <p><span style={{fontWeight:'500'}}>$20,000 to $24,999:</span>&nbsp; {displayData.B19001_005E}</p>
              <p><span style={{fontWeight:'500'}}>$20,000 to $24,999 - MoE:</span>&nbsp; {displayData.B19001_005M}</p>
              <p><span style={{fontWeight:'500'}}>$25,000 to $29,999:</span>&nbsp; {displayData.B19001_006E}</p>
              <p><span style={{fontWeight:'500'}}>$25,000 to $29,999 - MoE:</span>&nbsp; {displayData.B19001_006M}</p>
              <p><span style={{fontWeight:'500'}}>$30,000 to $34,999:</span>&nbsp; {displayData.B19001_007E}</p>
              <p><span style={{fontWeight:'500'}}>$30,000 to $34,999 - MoE:</span>&nbsp; {displayData.B19001_007M}</p>
              <p><span style={{fontWeight:'500'}}>$35,000 to $39,999:</span>&nbsp; {displayData.B19001_008E}</p>
              <p><span style={{fontWeight:'500'}}>$35,000 to $39,999 - MoE:</span>&nbsp; {displayData.B19001_008M}</p>
              <p><span style={{fontWeight:'500'}}>$40,000 to $44,999:</span>&nbsp; {displayData.B19001_009E}</p>
              <p><span style={{fontWeight:'500'}}>$40,000 to $44,999 - MoE:</span>&nbsp; {displayData.B19001_009M}</p>
              <p><span style={{fontWeight:'500'}}>$45,000 to $49,999:</span>&nbsp; {displayData.B19001_010E}</p>
              <p><span style={{fontWeight:'500'}}>$45,000 to $49,999 - MoE:</span>&nbsp; {displayData.B19001_010M}</p>
              <p><span style={{fontWeight:'500'}}>$50,000 to $59,999:</span>&nbsp; {displayData.B19001_011E}</p>
              <p><span style={{fontWeight:'500'}}>$50,000 to $59,999 - MoE:</span>&nbsp; {displayData.B19001_011M}</p>
              <p><span style={{fontWeight:'500'}}>$60,000 to $74,999:</span>&nbsp; {displayData.B19001_012E}</p>
              <p><span style={{fontWeight:'500'}}>$60,000 to $74,999 - MoE:</span>&nbsp; {displayData.B19001_012M}</p>
              <p><span style={{fontWeight:'500'}}>$75,000 to $99,999:</span>&nbsp; {displayData.B19001_013E}</p>
              <p><span style={{fontWeight:'500'}}>$75,000 to $99,999 - MoE:</span>&nbsp; {displayData.B19001_013M}</p>
              <p><span style={{fontWeight:'500'}}>$100,000 to $124,999:</span>&nbsp; {displayData.B19001_014E}</p>
              <p><span style={{fontWeight:'500'}}>$100,000 to $124,999 - MoE:</span>&nbsp; {displayData.B19001_014M}</p>
              <p><span style={{fontWeight:'500'}}>$125,000 to $149,999:</span>&nbsp; {displayData.B19001_015E}</p>
              <p><span style={{fontWeight:'500'}}>$125,000 to $149,999 - MoE:</span>&nbsp; {displayData.B19001_015M}</p>
              <p><span style={{fontWeight:'500'}}>$150,000 to $199,999:</span>&nbsp; {displayData.B19001_016E}</p>
              <p><span style={{fontWeight:'500'}}>$150,000 to $199,999 - MoE:</span>&nbsp; {displayData.B19001_016M}</p>
              <p><span style={{fontWeight:'500'}}>$200,000 or more:</span>&nbsp; {displayData.B19001_017E}</p>
              <p><span style={{fontWeight:'500'}}>$200,000 or more - MoE:</span>&nbsp; {displayData.B19001_017M}</p>
              <p><span style={{fontWeight:'500'}}>less than $75,000:</span>&nbsp; {displayData.B19001_calc_numLT75E}</p>
              <p><span style={{fontWeight:'500'}}>less than $75,000 - MoE:</span>&nbsp; {displayData.B19001_calc_numLT75M}</p>
              <p><span style={{fontWeight:'500'}}>less than $75,000(%):</span>&nbsp; {parseFloat(displayData.B19001_calc_pctLT75E.toFixed(2))}</p>
              <p><span style={{fontWeight:'500'}}>less than $75,000 - MoE(%):</span>&nbsp; {parseFloat(displayData.B19001_calc_pctLT75M.toFixed(2))}</p>
              <p><span style={{fontWeight:'500'}}>$75,000 to $99,999(%):</span>&nbsp; {parseFloat(displayData.B19001_calc_pct7599E.toFixed(2))}</p>
              <p><span style={{fontWeight:'500'}}>$75,000 to $99,999 - MoE(%):</span>&nbsp; {parseFloat(displayData.B19001_calc_pct7599M.toFixed(2))}</p>
              <p><span style={{fontWeight:'500'}}>at least $100,000:</span>&nbsp; {displayData.B19001_calc_numGE100E}</p>
              <p><span style={{fontWeight:'500'}}>at least $100,000 - MoE:</span>&nbsp; {displayData.B19001_calc_numGE100M}</p>
              <p><span style={{fontWeight:'500'}}>at least $100,000(%):</span>&nbsp; {parseFloat(displayData.B19001_calc_pctGE100E.toFixed(2))}</p>
              <p><span style={{fontWeight:'500'}}>at least $100,000 - MoE(%):</span>&nbsp; {parseFloat(displayData.B19001_calc_pctGE100M.toFixed(2))}</p>
              {/* <p><span style={{fontWeight:'500'}}>Shape__Area:</span>&nbsp; {displayData.Shape__Area}</p>
              <p><span style={{fontWeight:'500'}}>Shape__Length:</span>&nbsp; {displayData.Shape__Length}</p> */}
              {/* <p><span style={{fontWeight:'500'}}>State:</span>&nbsp; {displayData.State}</p>
              <p><span style={{fontWeight:'500'}}>County:</span>&nbsp; {displayData.County}</p> */}
            </div>
          }

          {displayData && selectedMap == "Elevation" &&
            <div style={{lineHeight:'30px', marginLeft:'15px', fontWeight:'400'}}>
              <p><span style={{fontWeight:'500'}}>Elevation:</span>&nbsp; {displayData.elevation} (m)</p>
            </div>
          }

          <pre>{JSON.stringify(displayData, null, 2)}</pre>
        </Sidebar>
      </div>
    </section>
  );
}