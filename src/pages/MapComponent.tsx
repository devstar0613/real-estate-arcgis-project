import { useAuth0 } from "@auth0/auth0-react";
import { ChangeEvent, useEffect, useRef, useState } from 'react';
import PopupInfo from '../components/PopupInfo';
import PopupPortal from '../components/PopupPortal';
import { getMapPointData } from '../actions/getMapPointDataAction';
import '../styles/globals.css';
import '../styles/custom.css';
import "primereact/resources/themes/lara-light-cyan/theme.css";
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
import { Divider } from 'primereact/divider';
import { Splitter, SplitterPanel } from 'primereact/splitter';
import { Toast } from 'primereact/toast';
import GeoJSONLayer from "@arcgis/core/layers/GeoJSONLayer";
import {unparse} from 'papaparse';
import { parcel_fields_from_regrid, default_parcelInfo } from "./Data Fields";
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
  const [address, setAddress] = useState<string>('501 5th St, Tybee Island, Georgia, 31328');
  const [parcelLayer, setParcellayer] = useState<FeatureLayer|MapImageLayer|KMLLayer|null>(null);
  const [fccLayer, setFcclayer] = useState<FeatureLayer|null>(null);
  const [displayData, setDisplayData] = useState<any | null>(default_parcelInfo);
  const [fetchedParcels, setFetchedParcels] = useState<any>([])
  const [fetchParcelFlag, setFetchParcelFlag] = useState<boolean>(false);
  const [fileName, setFileName] = useState<string>('');
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(null)
  const [polygonRings, setPolygonRings] = useState<[number, number][]>([])
  const [visible, setVisible] = useState(false);
  const [isParcelSelected, setIsParcelSelected] = useState<boolean>(true)
  const [isFCCSelected, setIsFCCSelected] = useState<boolean>(false)
  const [isElevationSelected, setIsElevationSelected] = useState<boolean>(false)
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories = [
    { name: 'Accounting', key: 'A' },
    { name: 'Marketing', key: 'M' },
    { name: 'Production', key: 'P' },
    { name: 'Research', key: 'R' }
  ];
  const [selectedCategories, setSelectedCategories] = useState([categories[1]]);

  const onCategoryChange = (e:any) => {
    let _selectedCategories = [...selectedCategories];

    if (e.checked)
        _selectedCategories.push(e.value);
    else
        _selectedCategories = _selectedCategories.filter(category => category.key !== e.value.key);

    setSelectedCategories(_selectedCategories);
  };

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
    }
  }
  
  const mapFunction = () => {
    const map = new Map({
      basemap: 'hybrid',
    });

    // if(parcelLayer != null)
    //   map.remove(parcelLayer);
    // let featureLayer: FeatureLayer;

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
    setParcellayer(parcel_layer);

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
      setParcellayer(elevationLayer);
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

    if(kmlUrl){
      console.log('kmlUrl==============', kmlUrl)
      const kmlLayer = new KMLLayer({
        // url: "https://storage.googleapis.com/atlasproai-dashboard/tybee_island.kml",
        url: kmlUrl,
      });
      map.add(kmlLayer);
    }

    if(polygonRings.length){
      const polygon = new Polygon({
        hasZ: true,
        hasM: true,
        rings: [polygonRings],
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

              const queryResult = await parcel_layer.queryFeatures(query);
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
              'Land Use Code Description: Site': parcel.lbcs_site_desc
            }));
            // Sorting the updatedParcels array by Total Addresses Count from big to small
            // updatedParcels.sort((a, b) => b['Total Addresses Count'] - a['Total Addresses Count']);
            // updatedParcels.sort((a, b) => a['Owner Name'].localeCompare(b['Owner Name']));
            updatedParcels.sort((a, b) => {
              const ownerNameA = a['Owner Name'] || '';
              const ownerNameB = b['Owner Name'] || '';
              return ownerNameA.localeCompare(ownerNameB);
            });
            setFetchedParcels(updatedParcels)
            setFetchParcelFlag(true)
            return updatedParcels;
          };

          const query = queryParcels.createQuery();
          query.geometry = polygon;
          query.spatialRelationship = 'intersects';
          query.returnGeometry = false;
          query.outFields = ["address", "parcelnumb", "scity", "county", "state2", "szip5", "owner", "owner2", "lat", "lon", "usecode", "zoning", "zoning_description",
              "zoning_type", "zoning_subtype", "yearbuilt", "legaldesc", "gisacre", "lbcs_activity", "lbcs_activity_desc", "lbcs_site", "lbcs_site_desc", "ll_address_count"];
          // query.outFields = ["address", "owner", "parcelnumb"];
          query.orderByFields = ["id ASC"]
          const allParcels = await fetchAllParcels(query);
          console.log('All parcels:', allParcels, allParcels.length);
          console.log('=================end================')
        } catch (error) {
          console.error('Error fetching KML data:', error);
        }
      };
      
      fetchParcelData();
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

            setAddress(response.address)
            
            if (typeof window !== 'undefined') {
              localStorage.setItem('Address', response.address);
            }

            const parcelData = await getSelectedData("Parcel_View", event.mapPoint, 1);
            // const incomeData = await getSelectedData("Income_Boundaries", event.mapPoint, 2);

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
            setPopupData(response)
            // showPopup(event.mapPoint, response.address, mapView);
            // mapView.openPopup({
            //   title: response.address,
            //   location: event.mapPoint,
            //   content: (() => {
            //     setPopupData(response);
            //     return popupRoot;
            //   })(),
            // });
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
        setFileName(file.name.split('.')[0]);
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
            showSuccess('File uploaded successfully')
            const BUCKET_NAME = 'atlasproai-dashboard'
            const publicUrl = `https://storage.googleapis.com/${BUCKET_NAME}/${file.name}`;
            setKmlUrl(publicUrl)
            
            const fetchKmlData = async () => {
              try {
                const response = await fetch(publicUrl);
                const kmlData = await response.text();
                // console.log(kmlData);
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(kmlData, 'text/xml');

                if(xmlDoc.getElementsByTagName('Polygon')[0]){
                  const coordinateString = xmlDoc.getElementsByTagName('coordinates')[0].textContent;
                  if(coordinateString){

                    const coordinatePairs = coordinateString?.trim().split(' ');
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

                    const polygon_center = rings.reduce((acc, curr) => {
                      return { lon: acc.lon + curr[0] / rings.length, lat: acc.lat + curr[1] / rings.length };
                    }, { lon: 0, lat: 0 });

                    console.log(polygon_center)
                    console.log("=========rings=====",rings)

                    setPolygonRings(rings)
                    setMapCenter([polygon_center.lon, polygon_center.lat])
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
    if (polygonRings.length) {
      mapFunction();
    }
  }, [polygonRings]);

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
      // console.log("=============fetchedParcels=============",fetchedParcels)
    }else {
      showInfo('Please upload polygon file or wait for processing!')
    }
  }

  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

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

  return (
    <section id="map-page-container" className="h-screen">
      <header
        className="flex items-center justify-between map_sub_container bg-light-green"
        style={{ height: '10%' }}
      >
        <div className="flex items-center">
          <a href="#">
            <img
              // src="https://www.dropbox.com/scl/fi/ensej1l64crnkpsmy2kbi/atlaspro-light-logo-1.png?rlkey=t18h2pq0lez222klradjj8fy9&raw=1"
              src="atlaspro_logo.png"
              alt="Atlas Pro Intelligence Logo"
              className="mx-auto" // Adjust the class as needed for styling
              width="100%"
              style={{ maxWidth: '130px' }}
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
          <div style={{cursor:'pointer'}}>
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
      <Splitter style={{ height: '90%', paddingTop:'1%', paddingBottom:'1%' }} className="map_sub_container">
        <SplitterPanel className="align-items-center justify-content-center left-bar" size={17} minSize={10}>
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
            <div className="left_bar_item">
              <div className="custom_checkbox_outside">
              {isElevationSelected &&
                <div className="custom_checkbox_inside"></div>}
              </div>
              <p className="left_bar_letter">Elevation</p>
            </div>
            <hr style={{marginBottom:'15px'}}/>
          </div>
          <div>
            <div className="left_bar_item" onClick={handleUploadClick}>
              <img
                src="upload_kml.png"
                alt="upload kml"
                className="left_bar_icon"
              />
              <p className="left_bar_letter">Upload KML</p>
              <input
                type="file"
                accept=".kml,.kmz"
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={handleFileUpload}
              />
            </div>
            <div className="left_bar_item">
              <img
                src="draw.png"
                alt="draw polygon"
                className="left_bar_icon"
              />
              <p className="left_bar_letter">Draw Polygon</p>
            </div>
            <div className="left_bar_item" onClick={handleExportCSV}>
              <img
                src="export_addresses.png"
                alt="export addresses"
                className="left_bar_icon"
              />
              <p className="left_bar_letter">Export Addresses</p>
            </div>
            <div className="left_bar_item">
              <img
                src="summary_report.png"
                alt="summary report"
                className="left_bar_icon"
              />
              <p className="left_bar_letter">Summary Report</p>
            </div>
            <hr style={{marginBottom:'15px'}}/>
          </div>
          <div>
            <div className="left_bar_item">
              <img
                src="ai_agent.png"
                alt="run ai agent"
                className="left_bar_icon"
              />
              <p className="left_bar_letter">Run AI Agent</p>
            </div>
            <div className="left_bar_item">
              <img
                src="access_training.png"
                alt="Access Training"
                className="left_bar_icon"
              />
              <p className="left_bar_letter">Access Training</p>
            </div>
          </div>
        </SplitterPanel>
        <SplitterPanel className="align-items-center justify-content-center middle-bar" size={25} minSize={10}>
          <div className="parcel-information">
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
            {/* <PopupPortal mountNode={popupRoot}>
              <PopupInfo address={popupData}></PopupInfo>
            </PopupPortal> */}
            {/* <pre>{JSON.stringify(displayData, null, 2)}</pre> */}
          </div>
        </SplitterPanel>
      </Splitter>
      <Toast ref={toast} />
    </section>
  );
}