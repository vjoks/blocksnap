import React, { Component, Link } from 'react';
import Profile from './Profile.jsx';
import Signin from './Signin.jsx';
import {
  isSignInPending,
  isUserSignedIn,
  redirectToSignIn,
  handlePendingSignIn,
  signUserOut,
  putFile
} from 'blockstack';
import {
  getPublicKeyFromPrivate
} from 'blockstack/lib/keys';
import { Switch, Route } from 'react-router-dom';
import { getFile } from 'blockstack/lib/storage';

export default class App extends Component {

  constructor(props) {
  	super(props);
  }

  handleSignIn(e) {
    e.preventDefault();
    const origin = window.location.origin;
    redirectToSignIn(origin, origin + '/manifest.json', ['store_write', 'publish_data']);
  }

  handleSignOut(e) {
    e.preventDefault();
    signUserOut(window.location.origin);
  }

  render() {
    return (
      <div className="site-wrapper">
        <div className="site-wrapper-inner">
          { !isUserSignedIn() ?
            <Signin handleSignIn={ this.handleSignIn } />
            :
            <Switch>
              <Route
                path='/:username?'
                render={
                  routeProps => <Profile handleSignOut={ this.handleSignOut } {...routeProps} />
                }
              />
            </Switch>
          }
        </div>
      </div>
    );
  }

  componentWillMount() {
    if (isSignInPending()) {
      handlePendingSignIn().then((userData) => {
        const privateKey = userData.appPrivateKey;
        const publicKey = getPublicKeyFromPrivate(privateKey);
        const options = { decrypt: false }
        getFile('public_key.txt', options)
          .then( () =>
            {
              console.log(" found public key");
              window.location = window.location.origin;
            }
          )
          .catch(() => {
            console.log(" creating public_key.txt " + publicKey);
            putFile('public_key.txt', publicKey, { encrypt: false }).then(() => {
              window.location = window.location.origin;
            })
          })

      });
    }
  }
}
