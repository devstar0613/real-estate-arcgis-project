import { useEffect, useRef, useState } from 'react';
import { useAuth0 } from "@auth0/auth0-react";
import PopupInfo from '../components/PopupInfo';
import PopupPortal from '../components/PopupPortal';
import SubscriptionRequired from './SubscriptionRequired';
import EmailVerificationRequired from './EmailVerificationRequired';
import '../styles/globals.css';
import '../styles/custom.css';
import 'primeicons/primeicons.css';
import "primereact/resources/themes/lara-light-cyan/theme.css";
import { Button } from 'primereact/button';
import { Divider } from 'primereact/divider';
import { Menu } from 'primereact/menu';
import { Splitter, SplitterPanel } from 'primereact/splitter';
import { Toast } from 'primereact/toast';
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
import Draw from "@arcgis/core/views/draw/Draw"
import GeoJSONLayer from "@arcgis/core/layers/GeoJSONLayer";
import esriConfig from "@arcgis/core/config.js";
import * as api from '../api/index.js'
import {unparse} from 'papaparse';
import { parcel_fields_from_regrid, default_parcelInfo, FCC_fields } from "./Data Fields";
import proj4 from 'proj4';
import { v4 as uuidv4 } from 'uuid';
import useIndexDB from "../hooks/useIndexDB";
import Header from "../components/Header";
import MyDropzone from "../components/MyDropzone/MyDropzone";
import { Dialog } from 'primereact/dialog';
import { InputText } from "primereact/inputtext";
import { InputTextarea } from 'primereact/inputtextarea';
import { Checkbox } from "primereact/checkbox";
import { Card } from 'primereact/card';
const popupRoot = document.createElement('div');

export default function MapComponent() {
  esriConfig.apiKey="AAPKa89f15d6371c4d1b9847721a967562ba43EXsN5-VaBN2W0eTXMa9bejZqyaSsUcMADdNxr4egpLTeesDx6puGoYUbecx32j"
  const { user, isAuthenticated } = useAuth0();
  const [data, setData, removeData] = useIndexDB<any[]>('parcels', []);
  const mapDiv = useRef<HTMLDivElement>(null);
  const [popupData, setPopupData] = useState<AddressCandidate | null>(null);
  const [view, setView] = useState<any>(null);
  const [kmlUrl, setKmlUrl] = useState<string | null>(null);
  const [address, setAddress] = useState<string>('501 5th St, Tybee Island, Georgia, 31328');
  const [parcelLayer, setParcellayer] = useState<FeatureLayer|null>(null);
  const [fccLayer, setFcclayer] = useState<FeatureLayer|null>(null);
  const [displayData, setDisplayData] = useState<any>(default_parcelInfo);
  const [fccData, setFccData] = useState<any>(null);
  const [fetchedParcels, setFetchedParcels] = useState<any>([])
  const [fetchedSecondaryAddresses, setFetchedSecondaryAddresses] = useState<any>([])
  const [fetchParcelFlag, setFetchParcelFlag] = useState<boolean>(false);
  const [fetchSecondaryAddressesFlag, setFetchSecondaryAddressesFlag] = useState<boolean>(false);
  const [fileName, setFileName] = useState<string>('');
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(null)
  const [polygonRings, setPolygonRings] = useState<[number, number][]>([])
  const [isParcelSelected, setIsParcelSelected] = useState<boolean>(true)
  const [isFCCSelected, setIsFCCSelected] = useState<boolean>(false)
  const [isElevationSelected, setIsElevationSelected] = useState<boolean>(false)
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isFCCSelectedRef = useRef<boolean>(false);
  const menuLeft = useRef<any>(null);
  const [showTable, setShowTable] = useState(false);
  const [showLeftMenu, setShowLeftMenu] = useState(true);
  const [visible, setVisible] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[] | null>(null)
  const [job_title, setJob_title] = useState('');
  const [job_instruction, setJob_instruction] = useState('');
  const [checked, setChecked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState('Active')
  const [isEmailVerified, setIsEmailVerified] = useState<boolean | undefined>(true)
  const [polygonRoadLength, setPolygonRoadLength] = useState<any>(0)
  const [totalPoles, setTotalPoles] = useState<any>(0)
  
  let items = [
    {
      label: 'Home View',
      icon: 'pi pi-home',
      command: () => {
        setShowTable(false);
        setShowLeftMenu(true)
          // toast.current.show({ severity: 'success', summary: 'Success', detail: 'File created', life: 3000 });
      }
    },
    {
      label: 'Full Map View',
      icon: 'pi pi-map',
      command: () => {
        setShowTable(false);
        setShowLeftMenu(false);
      }
    },
    {
      label: 'Table View',
      icon: 'pi pi-table',
      command: () => {
        setShowTable(true);
        setShowLeftMenu(false);
      }
    }
  ];
  
  const polygonSymbol = new SimpleFillSymbol({
    color: [100, 0, 0, 0.1],
    outline: {
      color: [255, 0, 0],
      width: 1,
    },
  });

  const getSelectedData = async (mapType:string, point:Point) => {
    let featureLayer: FeatureLayer;
    let featureURL: string = '';
    switch(mapType){
      case 'Parcel_Data':
        featureURL = "https://fs.regrid.com/UMikI7rWkdcPyLwSrqTgKqLQa7minA8uC2aiydrYCyMJmZRVwc0Qq2QSDNtexkZp/rest/services/premium/FeatureServer/0";
        break;
      case 'FCC_Data':
        featureURL = "https://services.arcgis.com/jIL9msH9OI208GCb/ArcGIS/rest/services/Speedtest_by_Ookla_Global_Fixed_and_Mobile_Network_Performance_Map_Tiles/FeatureServer/0";
        break;
      case 'Income_Centroids':
        featureURL = "https://services.arcgis.com/P3ePLMYs2RVChkJx/ArcGIS/rest/services/ACS_10_14_Household_Income_Distribution_Boundaries/FeatureServer/2";
        break;
      case 'Income_Boundaries':
        featureURL = "https://services.arcgis.com/P3ePLMYs2RVChkJx/ArcGIS/rest/services/ACS_10_14_Household_Income_Distribution_Boundaries/FeatureServer/2";
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
    if(mapType === "Parcel_Data"){
      localStorage.setItem('parcelData', JSON.stringify({}));
    }
    if(mapType === "FCC_Data"){
      localStorage.setItem('fccData', JSON.stringify({}));
    }
    if (features.length > 0) {
      const firstFeature = features[0];
      const attributes = firstFeature.attributes;

      if(mapType === "Parcel_Data"){
        setDisplayData(attributes);
        if (typeof window !== 'undefined') {
          localStorage.setItem('parcelData', JSON.stringify(attributes));
          console.log('----->setParcelData', attributes)
        }
      }
      if(mapType === "FCC_Data"){
        setFccData(attributes)
        if (typeof window !== 'undefined') {
          localStorage.setItem('fccData', JSON.stringify(attributes));
          console.log('----->setFCCData', attributes)
        }
      }
      return attributes;
    }
  }
  
  const mapFunction = () => {
    const map = new Map({
      basemap: 'hybrid',
    });

    const trailsRendererForRegrid = {
      type: "unique-value",
      // valueExpression: "IIf(Find('#', $feature.address) > -1 && Find('RD #', $feature.address) < 0 && Find('DR #', $feature.address) < 0, 'yellow', 'default')",
      valueExpression: "IIf($feature.owner == 'CALVIN RATTERREE RENTALS LLC', 'owner', IIf($feature.zoning_description == null || Find('Single', $feature.zoning_description) > -1 || Find('One Family', $feature.zoning_description) > -1 || Find('Single', $feature.zoning_subtype) > -1, 'blue', IIf(Find('Business', $feature.zoning_description) > -1 || Find('Commercial', $feature.zoning_description) > -1 || Find('Industrial', $feature.zoning_description) > -1, 'green', IIf(Find('Conservation', $feature.zoning_description) > -1 || Find('Environment', $feature.zoning_description) > -1 || Find('Marsh', $feature.zoning_description) > -1 || Find('Military', $feature.zoning_description) > -1, 'conservation', 'yellow'))))",
      uniqueValueInfos: [
        {
          value: 'owner',
          symbol: {
            type: "simple-fill",
            color: [255, 0, 255, 0.2],
            outline: {
              color: [255, 0, 255, 0.8],
              width: 1
            }
          }
        },
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
          value: 'blue',
          symbol: {
            type: "simple-fill",
            color: [0, 200, 255, 0.2], // Default color with opacity
            outline: {
              color: [0, 200, 255, 0.8],
              width: 1
            }
          }
        },
        {
          value: 'green',
          symbol: {
            type: "simple-fill",
            color: [0, 255, 0, 0.2], // Green color with opacity
            outline: {
              color: [0, 255, 0, 0.8],
              width: 1
            }
          }
        },
        {
          value: 'conservation',
          symbol: {
            type: "simple-fill",
            color: [200, 200, 200, 0.2], 
            outline: {
              color: [200, 200, 200, 0.8],
              width: 1
            }
          }
        }
      ]
    };
    const parcelURL = "https://fs.regrid.com/UMikI7rWkdcPyLwSrqTgKqLQa7minA8uC2aiydrYCyMJmZRVwc0Qq2QSDNtexkZp/rest/services/premium/FeatureServer/0"
    const parcel_layer = new FeatureLayer({
      url: parcelURL,
      // @ts-ignore
      renderer:trailsRendererForRegrid,
    });
    parcel_layer.popupTemplate = {
      title: "One Discovery",
      content: [{
        type: "fields",
        //@ts-ignore
        fieldInfos: []
      }],
    };
    setParcellayer(parcel_layer);
    // const secondary_URL = "https://fs.regrid.com/UMikI7rWkdcPyLwSrqTgKqLQa7minA8uC2aiydrYCyMJmZRVwc0Qq2QSDNtexkZp/rest/services/premium/FeatureServer/3"
    // const secondary_layer = new FeatureLayer({
    //   url: secondary_URL,
    //   // @ts-ignore
    //   // renderer:trailsRendererForRegrid,
    // });
    // map.add(secondary_layer)

    if(isParcelSelected){
      map.add(parcel_layer);
    }

    const fccURL = "https://services.arcgis.com/jIL9msH9OI208GCb/ArcGIS/rest/services/Speedtest_by_Ookla_Global_Fixed_and_Mobile_Network_Performance_Map_Tiles/FeatureServer/0"
    const fcc_layer = new FeatureLayer({
      url: fccURL,
      opacity: 0.7
    });
    setFcclayer(fcc_layer);

    if(isFCCSelected){
      map.add(fcc_layer)
    }

    if(isElevationSelected){
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
      // setParcellayer(elevationLayer);
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

    const mapView = new MapView({
      container: mapDiv.current!,
      map,
      // center: [-122.335167, 47.608013],
      center: mapCenter || [-80.84348087252627, 32.008940055682096],
      zoom: 14,
      // popupEnabled: true,
      popup: {
        dockEnabled: true,
        // dockOptions: {
        //   buttonEnabled: false,
        //   breakpoint: false,
        //   position: 'bottom-right',
        // },
        collapseEnabled: false,
        visibleElements: {
          closeButton: true,
        },
        viewModel: {
          includeDefaultActions: false,
        },
      },
    });

    document.getElementById('drawPolygonBtn')?.addEventListener('click', () => {
      const draw = new Draw({
        view: mapView
      });

      let action = draw.create("polygon");
      action.on("vertex-add", (evt) => {
        createPolygonGraphic(evt.vertices);
      });
      action.on("vertex-remove", (evt) => {
        createPolygonGraphic(evt.vertices);
      });
    
      // Fires when the pointer moves over the view
      action.on("cursor-update", (evt) => {
        createPolygonGraphic(evt.vertices);
      });
    
      // Add a graphic representing the completed polygon
      // when user double-clicks on the view or presses the "Enter" key
      action.on("draw-complete", (evt) => {
        createPolygonGraphic(evt.vertices, true);
      });
    });

    function createPolygonGraphic(vertices:[number, number][], isCompleted?:boolean){
      mapView.graphics.removeAll();
      let polygon = {
        type: "polygon", // autocasts as Polygon
        rings: vertices,
        spatialReference: mapView.spatialReference
      };

      let graphic = new Graphic({
        geometry: polygon,
        symbol: polygonSymbol
      });
      mapView.graphics.add(graphic);
      if(isCompleted){
        const webMercator = '+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +wktext +no_defs';
        const decimalDegrees = '+proj=longlat +datum=WGS84 +no_defs';
        console.log('=====vertices======', vertices)
        const ringsLatLng = vertices.map(xy => {
          let lnglat = proj4(webMercator, decimalDegrees, [xy[0], xy[1]]);
          return [lnglat[0], lnglat[1]];
        });
        ringsLatLng.push(ringsLatLng[0])
        console.log('=====ringsLatLng======', ringsLatLng)
        //@ts-ignore
        setPolygonRings(ringsLatLng)
      }
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
        mapView.ui.move('zoom', {
          position: 'bottom-right'
        })
        mapView.ui.add(document.getElementById("customTextDiv") as HTMLElement, "top-left");
        setView(mapView);
        mapView.popupEnabled = true;
        mapView.on('click', async (event) => {
          console.log('------------->event.mapPoint',event.mapPoint)
          try {
            const response = await locationToAddress(
              'https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer',
              {
                location: event.mapPoint,
              },
            );

            setAddress(response.address)
            setPopupData(response)
            
            if (typeof window !== 'undefined') {
              localStorage.setItem('Address', response.address);
            }

            await getSelectedData("Parcel_Data", event.mapPoint);
            await getSelectedData("FCC_Data", event.mapPoint);

            // if(!isFCCSelectedRef.current)
            //   await getSelectedData("FCC_Data", event.mapPoint);

            console.log(
              '🚀 ~ file: MapComponent.tsx:240 ~ mapView.on ~ response:',
              response,
            );

            // const locationToElevation = await axios.post('https://api.open-elevation.com/api/v1/lookup', {"locations":[{"latitude": event.mapPoint.latitude, "longitude":event.mapPoint.longitude}]});
            // console.log('---->locationToElevation', locationToElevation.data.results[0].elevation);
            // let elevationResult = locationToElevation.data.results[0].elevation;
            // if (typeof window !== 'undefined') {
            //   localStorage.setItem('Elevation', JSON.stringify(locationToElevation.data.results[0].elevation));
            // }
            // if(mapType == 'Elevation'){
            //   setDisplayData({elevation:elevationResult});
            //   setVisible(true);
            // }
            // await getMapPointData({address:response.address, parcelData:parcelData, incomeData:incomeData, elevation:`${elevationResult}m`})
            // showPopup(event.mapPoint, response.address, mapView);
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
      mapFunction();
    }
  }, [view]);
  
  const changeSelectionHandler = (mapType:string) => {
    switch(mapType){
      case 'Parcel':
        if(isParcelSelected){
          view.map.remove(parcelLayer)
        }else{
          view.map.add(parcelLayer)
        }
        setIsParcelSelected(prevState => !prevState);
        break;
      case 'FCC':
        if(isFCCSelected){
          view.map.remove(fccLayer)
        }else{
          view.map.add(fccLayer)
        }
        setIsFCCSelected(prevState => !prevState);
        break;
      case 'Elevation':
        break;
      default:
    }
    console.log('---------->mapType',mapType)
  }

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
        const uniqueId = uuidv4();
        setFileName(file.name.split('.')[0]);
        const response = await api.getSignedUrl(uniqueId + file.name, 'application/octet-stream')
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
            showSuccess('File uploaded successfully')
            const BUCKET_NAME = 'atlasproai-dashboard'
            const publicUrl = `https://storage.googleapis.com/${BUCKET_NAME}/${uniqueId + file.name}`;
            setKmlUrl(publicUrl)
            
            const fetchKmlData = async () => {
              try {
                const response = await fetch(publicUrl);
                const kmlData = await response.text();
                console.log(kmlData);
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(kmlData, 'text/xml');
                console.log('=======xmlDoc=======', xmlDoc)

                if(xmlDoc.getElementsByTagName('Polygon')[0]){
                  const coordinateString = xmlDoc.getElementsByTagName('coordinates')[0].textContent;
                  if(coordinateString){

                    const coordinatePairs = coordinateString?.trim().split(/\s+/);
                    console.log(coordinatePairs); // You can process the KML data here
              
                    const rings: [number, number][] = [];
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

                    console.log("=========rings=====",rings)
                    setPolygonRings(rings)
                  }
                }
              } catch (error) {
                setPolygonRings([])
                setMapCenter(null)
                console.error('Error fetching KML data:', error);
              }
            };
          
            fetchKmlData();
            // setKmlUrl('https://storage.googleapis.com/atlasproai-dashboard/Tour_de_France.kmz')
          } else {
            showError('Error uploading file')
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
    if(view && polygonRings.length && parcelLayer){
      const polygon_center = polygonRings.reduce((acc, curr) => {
        return { lon: acc.lon + curr[0] / polygonRings.length, lat: acc.lat + curr[1] / polygonRings.length };
      }, { lon: 0, lat: 0 });

      
      const fetchRoadLength = async() => {
        try {
          const formattedData = polygonRings.map(coord => {
            return `(${coord[0].toFixed(4)}, ${coord[1].toFixed(4)})`;
          });
    
          const polygon_data_for_api = `[${formattedData.join(', ')}]`
          console.log('=======formattedData==========', polygon_data_for_api)
          const roadLength = await api.getRoadLength({"polygon": polygon_data_for_api})
          console.log('=======roadLength==========', roadLength)
          if(roadLength.data?.length){
            const poles= Math.floor(roadLength.data.length * 3.28084 / 288);
            setTotalPoles(poles);
            const length = roadLength.data.length / 1609.34;
            setPolygonRoadLength(length.toFixed(1));
          }
        } catch (error) {
          console.error('Error fetching polygon road length:', error);
        }
      }
      fetchRoadLength();

      setMapCenter([polygon_center.lon, polygon_center.lat])
      view.graphics.removeAll();
      
      const polygon = new Polygon({
        hasZ: true,
        hasM: true,
        rings: [polygonRings],
        spatialReference: { wkid: 4326 }
      });

      const polygonGraphic = new Graphic({
        geometry: polygon,
        symbol: polygonSymbol
      });
      view.graphics.add(polygonGraphic)
      view.goTo(polygonGraphic.geometry);
      // view.center= [polygon_center.lon, polygon_center.lat]
      // view.zoom= 15
      
      const fetchParcelData = async () => {
        try {
          console.log('=================start================')
          let queryUrl = "https://fs.regrid.com/UMikI7rWkdcPyLwSrqTgKqLQa7minA8uC2aiydrYCyMJmZRVwc0Qq2QSDNtexkZp/rest/services/premium/FeatureServer/0";

          const queryParcels = new FeatureLayer({
            url: queryUrl
          });
          const fetchAllParcels = async (query:any) => {
            setFetchParcelFlag(false)
            const allParcels = [];
            let hasMore = true;
            let start = 0;

            while (hasMore) {
              query.start = start;
              query.num = 3000;

              const queryResult = await queryParcels.queryFeatures(query);
              const transformedParcels = queryResult.features.map(parcel => parcel.attributes)
              console.log('========progressing Parcels=========',queryResult)
              allParcels.push(...transformedParcels);

              if (queryResult.exceededTransferLimit) {
                start += 3000;
              } else {
                hasMore = false;
              }
            }
            const filteredParcels = allParcels.filter(parcel => parcel.parcelnumb !== null)
            const updatedParcels = filteredParcels.map(parcel => ({
              'Parcel Number': parcel.parcelnumb,
              'Parcel Address': parcel.address,
              'Parcel Address City': parcel.scity,
              'Parcel Address County': parcel.county,
              'Parcel Address State': parcel.state2,
              '5 Digit Parcel Zip Code': parcel.szip5,
              'Owner Name': parcel.owner,
              'Owner Email': "",
              'Owner Phone': "",
              'Second Owner Name': parcel.owner2,
              'Second Owner Email': "",
              'Second Owner Phone': "",
              'Total Addresses Count': parcel.ll_address_count,
              'Latitude': parcel.lat,
              'Longitude': parcel.lon,
              'Parcel Use Code': parcel.usecode,
              'Zoning Code': parcel.zoning,
              'Zoning Description': parcel.zoning_description,
              'Zoning Type': parcel.zoning_type,
              'Zoning Subtype': parcel.zoning_subtype,
              'Structure Year Built': parcel.yearbuilt,
              'Legal Description': parcel.legaldesc,
              'County-Provided Acres': parcel.gisacre,
              'Land Use Code: Activity': parcel.lbcs_activity,
              'Land Use Code Description: Activity': parcel.lbcs_activity_desc,
              'Land Use Code: Site': parcel.lbcs_site,
              'Land Use Code Description: Site': parcel.lbcs_site_desc,
              'Parcel UUID': parcel.ll_uuid
            }));
            // Sorting the updatedParcels array by Total Addresses Count from big to small
            // updatedParcels.sort((a, b) => b['Total Addresses Count'] - a['Total Addresses Count']);
            // updatedParcels.sort((a, b) => a['Owner Name'].localeCompare(b['Owner Name']));
            updatedParcels.sort((a, b) => {
              const ownerNameA = a['Parcel Address'] || '';
              const ownerNameB = b['Parcel Address'] || '';
              return ownerNameA.localeCompare(ownerNameB);
            });
            setFetchedParcels(updatedParcels)
            setData(updatedParcels)
            setFetchParcelFlag(true)
            return updatedParcels;
          };

          const query = queryParcels.createQuery();
          query.geometry = polygon;
          query.spatialRelationship = 'intersects';
          query.returnGeometry = false;
          query.outFields = ["address", "parcelnumb", "scity", "county", "state2", "szip5", "owner", "owner2", "lat", "lon", "usecode", "zoning", "zoning_description",
              "zoning_type", "zoning_subtype", "yearbuilt", "legaldesc", "gisacre", "lbcs_activity", "lbcs_activity_desc", "lbcs_site", "lbcs_site_desc", "ll_address_count", "ll_uuid"];
          // query.outFields = ["address", "owner", "parcelnumb"];
          query.orderByFields = ["id ASC"]
          const allParcels = await fetchAllParcels(query);
          console.log('All parcels:', allParcels, allParcels.length);
          console.log('=================end================')
        } catch (error) {
          console.error('Error fetching Parcel data:', error);
        }
      };
      fetchParcelData();

      // const fetchSecondaryAddressesData = async () => {
      //   try {
      //     console.log('=================start================')
      //     let queryUrl = "https://fs.regrid.com/UMikI7rWkdcPyLwSrqTgKqLQa7minA8uC2aiydrYCyMJmZRVwc0Qq2QSDNtexkZp/rest/services/premium/FeatureServer/3";

      //     const queryParcels = new FeatureLayer({
      //       url: queryUrl
      //     });
      //     const fetchAllSecondaryAddresses = async (query:any) => {
      //       setFetchParcelFlag(false)
      //       const allAddresses = [];
      //       let hasMore = true;
      //       let start = 0;

      //       while (hasMore) {
      //         query.start = start;
      //         query.num = 3000;

      //         const queryResult = await queryParcels.queryFeatures(query);
      //         const transformedParcels = queryResult.features.map(parcel => parcel.attributes)
      //         console.log('========progressing Parcels=========',queryResult)
      //         allAddresses.push(...transformedParcels);

      //         if (queryResult.exceededTransferLimit) {
      //           start += 3000;
      //         } else {
      //           hasMore = false;
      //         }
      //       }
      //       // Sorting the updatedParcels array by Total Addresses Count from big to small
      //       // updatedParcels.sort((a, b) => b['Total Addresses Count'] - a['Total Addresses Count']);
      //       // updatedParcels.sort((a, b) => a['Owner Name'].localeCompare(b['Owner Name']));
      //       // allAddresses.sort((a, b) => {
      //       //   const ownerNameA = a['Owner Name'] || '';
      //       //   const ownerNameB = b['Owner Name'] || '';
      //       //   return ownerNameA.localeCompare(ownerNameB);
      //       // });
      //       // setFetchedParcels(allAddresses)
      //       // setFetchParcelFlag(true)
      //       setFetchedSecondaryAddresses(allAddresses)
      //       setFetchSecondaryAddressesFlag(true)
      //       return allAddresses;
      //     };

      //     const query = queryParcels.createQuery();
      //     query.geometry = polygon;
      //     query.spatialRelationship = 'intersects';
      //     query.returnGeometry = false;
      //     query.outFields = ["*"];
      //     query.orderByFields = ["id ASC"]
      //     const allAddresses = await fetchAllSecondaryAddresses(query);
      //     console.log('All parcels:', allAddresses, allAddresses.length);
      //     console.log('=================end================')
      //   } catch (error) {
      //     console.error('Error fetching Parcel data:', error);
      //   }
      // };
      // fetchSecondaryAddressesData();
    }
  }, [polygonRings]);

  // useEffect(() => {
  //   if(view && kmlUrl){
  //     console.log('kmlUrl==============', kmlUrl)
  //     const kmlLayer = new KMLLayer({
  //       // url: "https://storage.googleapis.com/atlasproai-dashboard/tybee_island.kml",
  //       url: kmlUrl,
  //     });
  //     kmlLayer.load().then(() => {
  //       view.goTo(kmlLayer.fullExtent);
  //     });
  //     view.map.add(kmlLayer);
  //   }
  // },[kmlUrl])

  const handleExportCSV = () => {
    if(fetchParcelFlag){
      const csv = unparse(fetchedParcels);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `parcels_within_${fileName}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }else {
      showInfo('Please upload polygon file or wait for processing!')
    }
  }

  const handleExportPolygon = () => {
    if(polygonRings.length){
      const kmlContent = `
        <?xml version="1.0" encoding="UTF-8"?>
        <kml xmlns="http://www.opengis.net/kml/2.2">
          <Placemark>
            <Polygon>
              <outerBoundaryIs>
                <LinearRing>
                  <coordinates>
                    ${polygonRings.map(([lng, lat]) => `${lng},${lat}`).join('\n')}
                  </coordinates>
                </LinearRing>
              </outerBoundaryIs>
            </Polygon>
          </Placemark>
        </kml>
      `.trim();
  
      const blob = new Blob([kmlContent], { type: 'application/vnd.google-earth.kml+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'polygon.kml';
      a.click();
    }else{
      showInfo('Please draw polygon on the map.')
    }
  }

  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleJobRequest = async () => {
    console.log('=====selectedFiles:======', selectedFiles)
    if(!job_title || !job_instruction || !checked)
      return showInfo('Please complete the form.')
    if(!selectedFiles)
      return showInfo('Please upload kml/kmz files.')
    if(selectedFiles){
      try{
        setIsLoading(true);
        let kml_urls: any = [];
        for(let i=0; i< selectedFiles.length; i++){
          let uniqueId = uuidv4();
          let file= selectedFiles[i]
          setFileName(file.name.split('.')[0]);
          const response = await api.getSignedUrl(uniqueId + file.name, file.type || 'application/octet-stream')
          const signedUrl = response.data
    
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
            } else {
              showError('Error uploading file')
              console.error('Error uploading file:', xhr.statusText);
            }
          };

          xhr.onerror = function () {
            console.error('XHR onerror event');
          };
  
          xhr.send(file);
          const BUCKET_NAME = 'atlasproai-dashboard'
          const publicUrl = `https://storage.googleapis.com/${BUCKET_NAME}/${uniqueId + file.name}`;
          kml_urls.push(publicUrl)
        }
        // const newJobRequest = await axios.post('https://map-file-upload-server.vercel.app/new_job', {email: user?.name, username: user?.email, auth0_sub: user?.sub, job_title, job_instruction, kml_urls: kml_urls}) as any;
        const newJobRequest = await api.newJob({email: user?.name, username: user?.email, auth0_sub: user?.sub, job_title, job_instruction, kml_urls: kml_urls}) as any;

        if(newJobRequest.data.success){
          showSuccess('Your job request was sent correctly!')
          setJob_title('')
          setJob_instruction('')
          setChecked(false)
          setSelectedFiles(null)
          setTimeout(() => {
            setVisible(false);
          }, 3000);
        }
      }catch(error) {
        showError('An error occurred processing job request');
        console.error('Error during file upload:', error);
      }finally{
        setIsLoading(false)
      }
    }else{
      showInfo('Please upload kml/kmz files.')
    }
  }

  const handleRunAIAgent = () => {
    const fetchKmlData = async () => {
      try {
        const url = 'https://storage.googleapis.com/atlasproai-dashboard/run_ai_agent/Right_Section_Roads.kml'
        const response = await fetch(url);
        showSuccess('Successfully processed!')
        const kmlData = await response.text();
        console.log(kmlData);
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(kmlData, 'text/xml');
        console.log('=======xmlDoc=======', xmlDoc)

        if(xmlDoc.getElementsByTagName('Polygon')[0]){
          const coordinateString = xmlDoc.getElementsByTagName('coordinates')[0].textContent;
          if(coordinateString){

            const coordinatePairs = coordinateString?.trim().split(/\s+/);
            console.log(coordinatePairs); // You can process the KML data here

            const rings: [number, number][] = [];
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

            console.log("=========rings=====",rings)
            setPolygonRings(rings)
          }
        }
      } catch (error) {
        setPolygonRings([])
        setMapCenter(null)
        showError('Sorry, something went wrong!')
        console.error("Error fetching KML data for 'Run AI Agent'", error);
      }
    };
  
    fetchKmlData();
  }

  const handleViewMyAssets = async () => {
    const fiber_url = "https://services.arcgis.com/3vStCH7NDoBOZ5zn/arcgis/rest/services/Fiber_Optic_Cable/FeatureServer/0";
    const featureLayer = new FeatureLayer({
      url: fiber_url,
    });

    await view.map.add(featureLayer);
    console.log('======here is view my assets=========');

    // Wait for the feature layer to load before calling goTo()
    await featureLayer.when();

    // Get the full extent of the feature layer
    const fullExtent = featureLayer.fullExtent;

    if (fullExtent) {
      view.goTo(fullExtent);
    } else {
      console.error('Could not get the full extent of the feature layer.');
    }
  }

  const toast = useRef(null);
  const showSuccess = (content: string) => {
    //@ts-ignore
    toast.current.show({severity:'success', summary: 'Success', detail:content, life: 3000});
  }
  const showInfo = (content: string) => {
    //@ts-ignore
    toast.current.show({severity:'info', summary: 'Info', detail:content, life: 3000});
  }
  const showError = (content: string) => {
    //@ts-ignore
    toast.current.show({severity:'error', summary: 'Error', detail:content, life: 3000});
  }

  useEffect(() => {
    isFCCSelectedRef.current = isFCCSelected;
  }, [isFCCSelected]);

  useEffect(() => {
    console.log('===============user:', user);
    setIsEmailVerified(user?.email_verified)
    const fetchUserInfo = async () => {
      try {
        const response = await api.getUserInfo(user?.sub);
        setSubscriptionStatus(response.data.plan);
      } catch (error) {
        console.error('Error fetching user info:', error);
      }
    };

    if (user?.email) {
      fetchUserInfo();
    }
  }, [user]);

  const handleSubscription = async () => {
    try {
      console.log('=====here is to get checkout url======',user?.sub)
      const response= await api.getCheckoutUrl(user?.sub)
      if(response.data.url){
        window.location.href = response.data.url
      }
      console.log('=====get checkout url======', response)

    } catch (error) {
      console.error('Error creating Stripe Checkout Session:', error);
    }
  };

  const formatNumberWithCommas = (number:any) => {
    return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };
  
  return (
    <section id="map-page-container" className="h-screen">
      <Header />
      {isEmailVerified?
        (subscriptionStatus!=='Paused' ? (
          <>
            <Splitter style={{ height: '90%', paddingTop:'1%', paddingBottom:'1%' }} className="map_sub_container">
              <SplitterPanel className="align-items-center justify-content-center left-bar" style={{display: showLeftMenu? 'block': 'none'}} size={17} minSize={10}>
                <div>
                  <div className="left_bar_item" onClick={()=>changeSelectionHandler('Parcel')}>
                    <div className="custom_checkbox_outside">
                      {isParcelSelected && 
                        <div className="custom_checkbox_inside"></div>}
                    </div>
                    <p className="left_bar_letter">Parcel Data</p>
                  </div>
                  <div className="left_bar_item" onClick={()=>changeSelectionHandler('FCC')}>
                    <div className="custom_checkbox_outside">
                      {isFCCSelected && 
                        <div className="custom_checkbox_inside"></div>}
                    </div>
                    <p className="left_bar_letter">FCC Data</p>
                  </div>
                  {/* <div className="left_bar_item">
                    <div className="custom_checkbox_outside">
                    {isElevationSelected &&
                      <div className="custom_checkbox_inside"></div>}
                    </div>
                    <p className="left_bar_letter">Elevation</p>
                  </div> */}
                  <hr style={{marginBottom:'15px'}}/>
                </div>
                <div>
                  <div className="left_bar_item" onClick={handleUploadClick}>
                    <img
                      src="/upload_kml.png"
                      alt="upload kml"
                      className="left_bar_icon"
                    />
                    <p className="left_bar_letter">Upload KML/KMZ</p>
                    <input
                      type="file"
                      accept=".kml,.kmz"
                      ref={fileInputRef}
                      style={{ display: 'none' }}
                      onChange={handleFileUpload}
                    />
                  </div>
                  <div className="left_bar_item" id="drawPolygonBtn">
                    <img
                      src="/draw.png"
                      alt="draw polygon"
                      className="left_bar_icon"
                    />
                    <p className="left_bar_letter">Draw Polygon</p>
                  </div>
                  <div className="left_bar_item" onClick={handleExportPolygon}>
                    <img
                      src="/export_kml.png"
                      alt="export kml"
                      className="left_bar_icon"
                    />
                    <p className="left_bar_letter">Export KML</p>
                  </div>
                  <div className="left_bar_item" onClick={handleExportCSV}>
                    <img
                      src="/export_addresses.png"
                      alt="export addresses"
                      className="left_bar_icon"
                    />
                    <p className="left_bar_letter">Export Addresses</p>
                  </div>
                  {/* <div className="left_bar_item">
                    <img
                      src="/summary_report.png"
                      alt="summary report"
                      className="left_bar_icon"
                    />
                    <p className="left_bar_letter">Summary Report</p>
                  </div> */}
                  <hr style={{marginBottom:'15px'}}/>
                </div>
                <div>
                  <div className="left_bar_item" onClick={()=> {setVisible(true);}}>
                    <img
                      src="/katapult_icon.png"
                      alt="view my assets"
                      className="left_bar_icon"
                    />
                    <p className="left_bar_letter">Job Request</p>
                  </div>
                  {/* <div className="left_bar_item" onClick={handleViewMyAssets}>
                    <img
                      src="/white_network.png"
                      alt="view my assets"
                      className="left_bar_icon"
                    />
                    <p className="left_bar_letter">View My Assets</p>
                  </div>
                  <div className="left_bar_item" onClick={handleRunAIAgent}>
                    <img
                      src="/ai_agent.png"
                      alt="run ai agent"
                      className="left_bar_icon"
                    />
                    <p className="left_bar_letter">Run AI Agent</p>
                  </div>
                  <div className="left_bar_item" onClick={handleSubscription}>
                    <img
                      src="/access_training.png"
                      alt="Access Training"
                      className="left_bar_icon"
                    />
                    <p className="left_bar_letter">Access Training</p>
                  </div> */}
                </div>
              </SplitterPanel>
              <SplitterPanel className="align-items-center justify-content-center middle-bar" style={{display: showLeftMenu? 'block': 'none'}} size={25} minSize={10}>
                <div className="parcel-information">
                  {polygonRings.length >0 && <p style={{color:"white", fontSize:'22px', textAlign:'center', marginBottom:'15px'}}>Polygon Information</p>}
                  {polygonRings.length >0 && 
                    <div style={{marginBottom: '25px'}}>
                      <div style={{display:'flex', fontSize:'14px', color:'white'}}>
                        <div style={{ flex: '60%' }}>
                          <span style={{ fontWeight: '500' }}>Total Roads Distance:</span>&nbsp;
                        </div>
                        <div style={{ flex: '40%' }}>
                          {polygonRoadLength} miles ({formatNumberWithCommas((polygonRoadLength*5280).toFixed(0))} feet)
                        </div>
                      </div>
                      <hr />
                      <div style={{display:'flex', fontSize:'14px', color:'white'}}>
                        <div style={{ flex: '60%' }}>
                          <span style={{ fontWeight: '500' }}>Total Market Passings:</span>&nbsp;
                        </div>
                        <div style={{ flex: '40%' }}>
                          {formatNumberWithCommas(fetchedParcels.length)} premises
                        </div>
                      </div>
                      <hr />
                      <div style={{display:'flex', fontSize:'14px', color:'white'}}>
                        <div style={{ flex: '60%' }}>
                          <span style={{ fontWeight: '500' }}>Est. Total Poles:</span>&nbsp;
                        </div>
                        <div style={{ flex: '40%' }}>
                          {formatNumberWithCommas(totalPoles)} poles
                        </div>
                      </div>
                      <hr />
                    </div>
                  }
                  <p style={{color:"white", fontSize:'22px', textAlign:'center', marginBottom:'15px'}}>Parcel Information</p>
                  {parcel_fields_from_regrid.map((item) => (
                    <div key={item.field}>
                      <div style={{display:'flex', fontSize:'14px', color:'white'}}>
                        <div style={{ flex: '60%' }}>
                          <span style={{ fontWeight: '500' }}>{item.label}:</span>&nbsp;
                        </div>
                        <div style={{ flex: '40%' }}>
                          {item.label === 'Zoning Code Link' ? (
                            <span><a style={{ color: "blue" }} href={displayData[item.field]}>View</a></span>
                          ) : (
                            (item.label.includes('Date')) || (typeof displayData[item.field] === 'string' && displayData[item.field].includes('date')) ? new Date(displayData[item.field]).toISOString().slice(0, 10) : displayData[item.field]
                          )}
                        </div>
                      </div>
                      <hr />
                    </div>
                  ))}
                  {fccData && <p style={{color:"white", fontSize:'22px', textAlign:'center', marginBottom:'15px', marginTop:'25px'}}>FCC Information</p>}
                  {fccData && FCC_fields.map((item) => (
                    <div key={item.field}>
                      <div style={{display:'flex', fontSize:'14px', color:'white'}}>
                        <div style={{ flex: '60%' }}>
                          <span style={{ fontWeight: '500' }}>{item.label}:</span>&nbsp;
                        </div>
                        <div style={{ flex: '40%' }}>
                          {item.field==='Existing Provider'? (fccData['AvgDown']<1000? 'Cable': 'Fiber'): 
                          (['AvgDown', 'AvgUp'].includes(item.field)? fccData[item.field].toFixed(0): fccData[item.field])}
                        </div>
                      </div>
                      <hr />
                    </div>
                  ))}
                </div>
                <div className="chatbot_panel">
                  <div className="chatbot_title">
                    <p>{address}</p>
                  </div>
                  <PopupInfo address={popupData}></PopupInfo>
                </div>
              </SplitterPanel>
              <SplitterPanel className="align-items-center justify-content-center" size={58}>
                <div
                  ref={mapDiv}
                  style={{
                    height: '100%',
                    width: '100%',
                    overflow: 'hidden',
                  }}
                >
                  <div className="flex card justify-content-center" style={{boxShadow:'0 0 0 !important'}} id="customTextDiv">
                    <Menu model={items} popup ref={menuLeft} id="popup_menu_left"style={{marginTop:'5px'}} />
                    <i className="menu-button pi pi-bars" onClick={(event) => {menuLeft.current.toggle(event)}} aria-controls="popup_menu_left" aria-haspopup />
                  </div>
                  {/* <PopupPortal mountNode={popupRoot}>
                    <PopupInfo address={popupData}></PopupInfo>
                  </PopupPortal> */}
                  {/* <pre>{JSON.stringify(displayData, null, 2)}</pre> */}
                </div>
              </SplitterPanel>
              <SplitterPanel className="align-items-center justify-content-center table-bar" style={{display: showTable? 'block': 'none'}} size={42} minSize={10}>
                {/* <DataTable value={fetchedParcels} scrollable stripedRows tableStyle={{ minWidth: '40%', fontSize:'0.8rem' }}>
                  <Column field="Parcel Number" header="Parcel ID"></Column>
                  <Column field="Parcel Address" header="Address"></Column>
                  <Column field="Owner Name" header="Owner"></Column>
                  <Column field="Owner Email" header="Email"></Column>
                  <Column field="Owner Phone" header="Phone Number"></Column>
                  <Column field="Land Use Code: Activity" header="Land Use Code"></Column>
                  <Column field="Land Use Code Description: Activity" header="Land Use Description"></Column>
                </DataTable> */}
                <div style={{textAlign: 'right'}}>
                  <a href='/table' target="_blank">
                    <i className="pi pi-external-link" style={{cursor: 'pointer'}} onClick={() => {}} aria-controls="popup_menu_left" />
                  </a>
                </div>
                <table style={{fontSize: '1rem'}}>
                  <thead>
                    <tr>
                      <th>Parcel ID</th>
                      <th>Address</th>
                      <th>Owner</th>
                      <th>Email</th>
                      <th>Phone Number</th>
                      <th>Land Use Code</th>
                      <th>Land Use Description</th>
                    </tr>
                  </thead>
                  <tr>
                    <td colSpan={7}>
                      <hr style={{marginTop: '12px', marginBottom: '12px'}}/>
                    </td>
                  </tr>
                  <tbody>
                    {fetchedParcels.length> 0 ?
                    fetchedParcels.slice(0,4).map((parcel:any, index:any)=> (
                      <tr key={index}>
                        <td className="limited-text">{parcel['Parcel Number']}</td>
                        <td className="limited-text">{parcel['Parcel Address']}</td>
                        <td className="limited-text">{parcel['Owner Name']}</td>
                        <td className="limited-text">{parcel['Owner Email']}</td>
                        <td className="limited-text">{parcel['Owner Phone']}</td>
                        <td className="limited-text">{parcel['Land Use Code: Activity']}</td>
                        <td className="limited-text">{parcel['Land Use Code Description: Activity']}</td>
                      </tr>
                    )): <tr><td colSpan={7}>No data</td></tr>}
                  </tbody>
                </table>
                <div style={{textAlign: 'center', marginTop: '20vh', fontSize: '1.2rem'}}>
                  <p>This area is to display csv file in table</p>
                  <p>format based on polygon selected.</p>
                </div>
              </SplitterPanel>
            </Splitter>
            <Toast ref={toast} />
            <Dialog header="Job Request to KatapultPro" visible={visible} style={{ width: '500px', background: '#00211D' }} onHide={() => {if (!visible) return; setVisible(false); }}>
              <div className="flex gap-2 flex-column" style={{paddingBottom: '20px'}}>
                <label htmlFor="api">KatapultPro Job Title</label>
                <InputText value={job_title} style={{color: 'black'}} onChange={(e) => setJob_title(e.target.value)} id="api" aria-describedby="api-help" />
              </div>
              <div className="flex gap-2 flex-column" style={{paddingBottom: '20px'}}>
                <label htmlFor="job_instruction">Job Instruction</label>
                <InputTextarea value={job_instruction} style={{color: 'black'}} onChange={(e) => setJob_instruction(e.target.value)} rows={3} cols={50} />
              </div>
              <div>
                <p>Please upload any relevant polygons / KML Files:</p>
                <MyDropzone {...{setSelectedFiles}} {...{selectedFiles}} />
              </div>
              <div className="flex align-items-center" style={{marginTop: '15px'}}>
                <Checkbox inputId="ingredient1" name="pizza" value="Cheese" onChange={e=> setChecked(e?.checked!)} checked={checked} />
                <label htmlFor="ingredient1" className="ml-2">I have revised the job request accuracy laid out above.</label>
              </div>
              <div style={{marginTop: '10px'}}>
                <p style={{fontSize: '12px'}}>
                  Note: Please provide a guest account access to your KatapultPro and email us an API key with writing permission at contact@atlaspro.ai prior to submitting a job request.
                </p>
              </div>
              <div style={{float: 'right', marginTop: '20px'}}>
                <Button loading={isLoading} label="Submit" onClick={handleJobRequest} />
              </div>
            </Dialog>
          </>
        ):(
          <SubscriptionRequired auth0_sub={user?.sub} />
        )
      ):(
        <EmailVerificationRequired email={user?.email} auth0_sub={user?.sub} />
      )}
    </section>
  );
}