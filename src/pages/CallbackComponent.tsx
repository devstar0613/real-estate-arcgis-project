import React, { useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useHistory } from 'react-router-dom';

const CallbackComponent = () => {
  const { isAuthenticated, error, isLoading, getAccessTokenSilently, loginWithRedirect } = useAuth0();
  const history = useHistory();

  useEffect(() => {
    if (isLoading) {
      console.log('Waiting');
      // Maybe display a spinner or loading message
      return;
    }

    if (isAuthenticated) {
      // Optionally, if you need to do something with the token (like storing it)
      const getToken = async () => {
        try {
          const accessToken = await getAccessTokenSilently();
          console.log(accessToken);
          // Store your token or do something else with it
        } catch (e) {
          console.error(e);
        }
      };
      getToken();

      history.push('/');
    }

  }, [isAuthenticated, error, isLoading, getAccessTokenSilently, history]);

  if (error) {
    history.push('/login');
  }
  // While waiting for the callback to complete, you can show a loading message or spinner
  if (isLoading) {
    return <div></div>;
  }

  // If there's no error and it's not loading, it means the callback was successful
  return <div></div>;
};

export default CallbackComponent;
