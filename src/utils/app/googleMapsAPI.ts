const googleMaps_API_Key = process.env.REACT_APP_GOOGLE_MAPS_API_KEY

export const geocodingReverse = async (lat: number, lon: number) => {
  const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lon}&key=${googleMaps_API_Key}`);
  const data = await response.json();

  console.log('=======geocodingreverseResult==========', data);

  if (data.status === "OK") {
    return data.results[0]?.formatted_address || "Address not found";
  } else {
    console.error("Error fetching geocoding data");
    return "Error fetching geocoding data";
  }
};

export const fetchAllPlacesWithinCircle = async (circleLocation: any, allResults:any = []) => {
  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${circleLocation.center.lat},${circleLocation.center.lon}&radius=${circleLocation.radius}&type=restaurant&key=${googleMaps_API_Key}`;
  console.log('===========url========', url)
  const response = await fetch(url);
  const data = await response.json();

  // if (data.status === 'OK') {
  //   const results:any = data.results;
  //   allResults.push(...results);

  //   // if (data.next_page_token) {
  //   //   // Fetch the next page recursively
  //   //   const nextPageUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?pagetoken=${data.next_page_token}&key=${googleMaps_API_Key}`;
  //   //   await fetchAllPlacesWithinCircle(nextPageUrl, allResults);
  //   // }
  // }

  // console.log('=========allResults.length========', allResults.length)

  return allResults;
};