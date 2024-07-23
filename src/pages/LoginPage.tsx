import React, { useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useHistory } from 'react-router-dom';

export default function LoginPage() {
  const { loginWithRedirect } = useAuth0();
  const history = useHistory();

  // useEffect will run the loginWithRedirect function as soon as the component is mounted
  // useEffect(() => {
  //   console.log('in login');

  //   const fn = async () => {
  //     await loginWithRedirect();
  //   };
  //   fn();
  // }, [loginWithRedirect]); // The empty array as a second argument ensures this effect only runs once when the component mounts.

  useEffect(() => {
    return history.push('/')
  })

  return (
    <div></div>
  );
};
