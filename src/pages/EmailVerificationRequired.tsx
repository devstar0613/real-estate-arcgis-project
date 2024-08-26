import React, { useState, useRef } from 'react';
import * as api from '../api/index.js'
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { Toast } from 'primereact/toast';

const EmailVerificationRequired: React.FC<{ email: string | undefined, auth0_sub: string | undefined }> = ({ email, auth0_sub }) => {
  const [isLoading, setIsLoading] = useState(false);
  const toast = useRef(null);
  const showSuccess = () => {
    //@ts-ignore
    toast.current.show({severity:'success', summary: 'Success', detail:'We sent verification email again', life: 3000});
  }
  const showInfo = (content: string) => {
    //@ts-ignore
    toast.current.show({severity:'info', summary: 'Info', detail:content, life: 3000});
  }
  const showError = () => {
    //@ts-ignore
    toast.current.show({severity:'error', summary: 'Error', detail: 'Something went wrong. Please try again.', life: 3000});
  }
  const resendEmail = async () => {
    try {
      setIsLoading(true);
      const identity_id = auth0_sub?.substring(auth0_sub.indexOf('|') + 1);
      const parts = auth0_sub?.split('|');
      let data = {
        user_id: auth0_sub,
        identity: {
          user_id: identity_id,
          provider: parts?.[0]
        }
      }
      const response = await api.sendVerificationEmail(data);
      showSuccess();
    }catch (error) {
      showError();
      console.error('Error sending verification email:', error);
    }finally {
      setIsLoading(false)
    }
  };

  return (
    <>
      <Card style={{width: '500px', margin: 'auto', marginTop: '20vh', textAlign: 'center'}}>
        <h2 style={{fontSize: '25px', fontWeight: 'bold', paddingBottom: '10px'}}>Please verify your email</h2>
        <p style={{}}>You're almost there! We sent an email to</p>
        <p style={{fontSize: '17px', fontWeight: 'bold', paddingBottom: '20px'}}>{email}</p>
        <p style={{paddingBottom: '20px'}}>Just click on the link in that email to complete your signup. If you don't see it, you may need to 
          <span style={{fontWeight:'bold'}}> check your spam</span> folder</p>
        <p style={{paddingBottom: '20px'}}>Still can't find the email? No problem.</p>
        <Button loading={isLoading} label="Resend Verification Email" onClick={resendEmail} />
      </Card>
      <Toast ref={toast} />
    </>
  );
};

export default EmailVerificationRequired;