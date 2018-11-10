import React, { Component } from 'react';
import {
  isSignInPending,
  loadUserData,
  Person,
  getFile,
  putFile,
  lookupProfile
} from 'blockstack';

const avatarFallbackImage = 'https://s3.amazonaws.com/onename/avatar-placeholder.png';

export default class Profile extends Component {
  constructor(props) {
  	super(props);

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
      isLoading: false
  	};
  }

  render() {
    const { handleSignOut } = this.props;
    const { person } = this.state;
    const { username } = this.state;
  
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
                      &nbsp;|&nbsp;
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
                <div className="col-md-12">
                  {this.state.newImage}
                </div>
                <div className="col-md-12 text-right">
                  <button
                    className="btn btn-primary btn-lg"
                    onClick={e => this.handleNewImageSubmit(e)}
                  >
                    Submit
                  </button>
                </div>
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

  componentWillMount() {
    this.setState({
      person: new Person(loadUserData().profile),
      username: loadUserData().username
    });
  }

  drawCanvas(imageData) {
    var img = new Image();
    var imageDivs = document.getElementById("imageDivs");
    img.onload = function() {
      var canvas = document.getElementById("canvas" + imageData.id);
      if (!canvas) {
        canvas = document.createElement("canvas");
        canvas.id = "canvas" + imageData.id;
        imageDivs.appendChild(canvas);
      }
      var context = canvas.getContext('2d');
      context.drawImage(img, 0, 0);
    }
    img.src = imageData.text;
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
    const options = { encrypt: false };
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
      const options = { decrypt: false }
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
