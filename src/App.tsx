import { withAuthenticationRequired } from '@auth0/auth0-react';
import React, { useEffect } from 'react';
import './styles/globals.css';
import './styles/custom.css';
import MapComponent  from './pages/MapComponent';
import CallbackComponent from './pages/CallbackComponent';
import LoginPage from './pages/LoginPage';
import TablePage from './pages/TablePage';
import JobRequestsPage from './pages/JobRequestsPage'
// import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';

import {BrowserRouter as Router ,Switch, Route } from 'react-router-dom';

function App() {
  useEffect(() => {
    console.log('in App');

  }, []); // The empty array as a second argument ensures this effect only runs once when the component mounts.

  const ProtectedComponent = () => {
    const Cp = withAuthenticationRequired(MapComponent);
    return <Cp/>
  }

  return (
    <Router>
      <Switch>
        {/* <Route path="/" component={MapComponent} /> */}
        <Route path='/admin/jobrequests' component={withAuthenticationRequired(JobRequestsPage)}/>
        <Route path='/table' component={withAuthenticationRequired(TablePage)}/>
        <Route path='/login' component={LoginPage}/>
        <Route path="/callback" component={CallbackComponent} />
        <Route path="/" component={ProtectedComponent} />
      </Switch>
    </Router>
  );
}

export default App;
