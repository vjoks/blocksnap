import React, { Component } from 'react';
import {
  isSignInPending,
  loadUserData,
  Person,
  getFile,
  putFile,
  lookupProfile
} from 'blockstack';
import { encryptECIES, decryptECIES } from 'blockstack/lib/encryption';

const avatarFallbackImage = 'https://s3.amazonaws.com/onename/avatar-placeholder.png';

export default class Profile extends Component {
  constructor(props) {
  	super(props);

    const options = { decrypt: false }
    getFile('public_key.txt', options)
          .then( (data) =>
            {
              console.log("  render found public key : " + data);
              this.state.public_key = data;
            }
          );
  	this.state = {
  	  person: {
  	  	name() {
          return 'Anonymous';
        },
  	  	avatarUrl() {
  	  	  return avatarFallbackImage;
  	  	},
      },
      username: "",
      newimage: "",
      images: [],
      imageIndex: 0,
      isLoading: false,
      public_key: ""
  	};
  }

  render() {
    const { handleSignOut } = this.props;
    const { person } = this.state;
    const { username } = this.state;
    const { public_key } = this.state;
  
    return (
      !isSignInPending() && person ?
      <div className="container">
        <div className="row">
          <div className="col-md-offset-3 col-md-6">
            <div className="col-md-12">
              <div className="avatar-section">
                <img
                  src={ person.avatarUrl() ? person.avatarUrl() : avatarFallbackImage }
                  className="img-rounded avatar"
                  id="avatar-image"
                />
                <div className="username">
                  <h1>
                    <span id="heading-name">{ person.name() ? person.name()
                      : 'Nameless Person' }</span>
                  </h1>
                  <span>{username}</span>
                  {this.isLocal() &&
                    <span>
                      |&nbsp;
                      {public_key} &nbsp;|&nbsp;
                      <a onClick={ handleSignOut.bind(this) }>(Logout)</a>
                    </span>
                  }
                </div>
              </div>
            </div>
            {this.isLocal() &&
              <div className="new-image">
                <div className="col-md-12">
                  <input className="input-image"
                    type="file"
                    onChange={e => this.handleNewImageChange(e)}
                  />
                </div>
                <div className="col-md-12 text-right">
                  <button
                    className="btn btn-primary btn-lg"
                    onClick={e => this.handleNewImageSubmit(e)}
                  >
                    Submit
                  </button>
                </div>
                <form className="share-image" onSubmit={e => this.validateUser(e)}>
                  <label target="shareUser">Share with user:</label>
                  <input name="shareUser" type="text" />
                  <label target="imgNum">Image number to share:</label>
                  <input type="number" name="imgNum" min="0" max={this.state.imageIndex} />
                  <input type="submit" value="Check user" />
                </form>

                <form className="retrieve-image" onSubmit={e => this.retrieveFromUser(e)}>
                  <label target="retrieveUser">Retrieve shared image from user:</label>
                  <input name="retrieveUser" type="text" />
                  <input type="submit" value="Retrieve image" />
                </form>
              </div>
            }
            <div className="col-md-12 images" id="imageDivs">
              {this.state.isLoading && <span>Loading...</span>}
              {this.state.images.forEach((image) => { this.drawCanvas(image); })}
            </div>
          </div>
        </div>
      </div> : null
    );
    }

    retrieveFromUser(event) {
      var user = event.target.retrieveUser.value;
      const options = { username: user, decrypt: true };
      getFile('shareImage.img', options)
        .then((file) => {
          var newImage = JSON.parse(file || {});
          this.saveNewImage(newImage);
        })
        .catch((error) => {
          console.log('Did not find shared file from ' + user);
        })
    }

  validateUser(event) {
    var user = event.target.shareUser.value;
    var imgNum = event.target.imgNum.value;
    lookupProfile(user)
        .then((profile) => {
          const options = { username: user, decrypt: false };
          getFile('public_key.txt', options)
            .then((file) => {
              var pkOther = file;
              const cipherObject = encryptECIES(pkOther, JSON.stringify(this.state.images[imgNum]));
              putFile('shareImage.img', cipherObject, { encrypt: false })
                .then((file) => {
                  console.log("Image shared with " + user);
                })
                .catch((error) => {
                  console.log("Failed to share image.")
                });
            })
            .catch((error) => {
              console.log('Could not find public key of ' + user);
            })
        })
        .catch((error) => {
          console.log('Could not find user.');
        })
  }

  componentWillMount() {
    this.setState({
      person: new Person(loadUserData().profile),
      username: loadUserData().username
    });
  }

  drawCanvas(imageData) {
    var img = document.getElementById(imageData.id);
    if (img === null) {
      img = new Image();
      img.id = imageData.id;
      var imageDivs = document.getElementById("imageDivs");
      img.onload = function() {
        imageDivs.appendChild(img);
      }
      img.src = imageData.text;
    }
  }

  encodeImageFileAsURL(element) {
    var oldThis = this;
    var file = element.files[0];
    var reader = new FileReader();
    reader.onloadend = function() {
      oldThis.setState({ newImage: reader.result });
    }
    reader.readAsDataURL(file);
  }

  handleNewImageChange(event) {
    this.encodeImageFileAsURL.call(this, event.target);
  }

  handleNewImageSubmit(event) {
    this.saveNewImage(this.state.newImage);
    this.setState({
      newImage: ""
    });
  }

  saveNewImage(imageText) {
    let images = this.state.images;

    let image = {
      id: this.state.imageIndex++,
      text: imageText.trim(),
      created_at: Date.now()
    }

    images.unshift(image);
    const options = { encrypt: true };
    putFile('images.json', JSON.stringify(images), options)
      .then(() => {
        this.setState({
          images: images
        })
      })
  }

  fetchData() {
    this.setState({ isLoading: true })
    if (this.isLocal()) {
      const options = { decrypt: true }
      getFile('images.json', options)
        .then((file) => {
          var images = JSON.parse(file || '[]')
          this.setState({
            person: new Person(loadUserData().profile),
            username: loadUserData().username,
            imageIndex: images.length,
            images: images,
          })
        })
        .finally(() => {
          this.setState({ isLoading: false })
        })
    } else {
      const username = this.props.match.params.username
 
      lookupProfile(username)
        .then((profile) => {
          this.setState({
            person: new Person(profile),
            username: username
          })
        })
        .catch((error) => {
          console.log('could not resolve profile')
        })
        const options = { username: username, decrypt: false }
        getFile('images.json', options)
          .then((file) => {
            var images = JSON.parse(file || '[]')
            this.setState({
              imageIndex: images.length,
              images: images
            })
          })
          .catch((error) => {
            console.log('could not fetch images')
          })
          .finally(() => {
            this.setState({ isLoading: false })
          })
    }
  }

  componentDidMount() {
    this.fetchData();
  }

  isLocal() {
    return this.props.match.params.username ? false: true
  }
}
