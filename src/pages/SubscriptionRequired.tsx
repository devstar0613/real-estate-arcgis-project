import React from 'react';
import * as api from '../api/index.js'
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';

const SubscriptionRequired: React.FC<{ auth0_sub: string | undefined }> = ({ auth0_sub }) => {

  const handleSubscription = async () => {
    try {
      console.log('=====here is to get checkout url======',auth0_sub)
      const response= await api.getCheckoutUrl(auth0_sub)
      if(response.data.url){
        window.location.href = response.data.url
      }
      console.log('=====get checkout url======', response)

    } catch (error) {
      console.error('Error creating Stripe Checkout Session:', error);
    }
  };

  return (
    <Card style={{width: '500px', margin: 'auto', marginTop: '20vh'}}>
      <h2 style={{fontSize: '25px'}}>Your trial has ended</h2>
      <p style={{paddingBottom: '30px'}}>Please subscribe to continue using our service.</p>
      <Button label="Subscribe Now" onClick={handleSubscription} />
    </Card>
  );
};

export default SubscriptionRequired;