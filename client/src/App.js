import React, { Component } from 'react';
import btcImg from './btcImg.png';
import './App.css';

class App extends Component {
  state = {
    response: '',
    emailAddress: '',
    priceIsHigherThan: '',
    priceIsLowerThan: '',
    responseToPost: '',
    responseBtcPrice: ''
  };

  // set title to react state after mounting component
  componentDidMount() {
    this.callApi()
      .then(res => this.setState({ response: res.title }))
      .catch(err => console.log(err));
  }

  // get title from server
  callApi = async () => {
    const response = await fetch('/api/title');
    const body = await response.json();

    if (response.status !== 200) throw Error(body.message);

    return body;
  };

  // get bitcoin price from cryptocurrency exchange
  getBtcPrice = async () => {
    const response = await fetch('https://api.coindesk.com/v1/bpi/currentprice.json');
    const body = await response.json()
        .then(res => this.setState({ responseBtcPrice: res.bpi.USD.rate }))
        .catch(err => console.log(err));
    if (response.status !== 200) throw Error(body.message);
    return body;
  };

  // post data (email address and choosen prices) to server => get response about successful request => save response to state => reset form
  handleSubmit = async e => {
    e.preventDefault();
    const response = await fetch('/api/form', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ emailAddress: this.state.emailAddress, priceIsHigherThan: this.state.priceIsHigherThan, priceIsLowerThan: this.state.priceIsLowerThan }),
    });
    const body = await response.text();

    this.setState({ responseToPost: body });
    this.setState({ emailAddress: "" });
    this.setState({ priceIsHigherThan: "" });
    this.setState({ priceIsLowerThan: "" });
  };

  render() {
    this.getBtcPrice();
    return (
      <div className="App">
        <header className="App-header">
          <img src={btcImg} className="App-logo" alt="logo" />
        </header>
        <p className="cryptoTitle" >{this.state.response}</p>
        <p >Current Bitcoin Price: <span className="actualPrice" >{this.state.responseBtcPrice} $</span> </p>
        <div className="formWrapper">
          <form onSubmit={this.handleSubmit}>
            <p>
              <strong>Request for Bitcoin Price Notification</strong>
            </p>
             <div className="inputsWrapper">
              <input
                type="email"
                value={this.state.emailAddress}
                onChange={e => this.setState({ emailAddress: e.target.value })}
                placeholder="Your Email Address"
              />
              <input
                type="text"
                value={this.state.priceIsHigherThan}
                onChange={e => this.setState({ priceIsHigherThan: e.target.value })}
                placeholder="Alert when price is more than"
              />
              <input
                type="text"
                value={this.state.priceIsLowerThan}
                onChange={e => this.setState({ priceIsLowerThan: e.target.value })}
                placeholder="Alert when price is less than"
              />
            </div>
            <button type="submit">Submit</button>
        </form>
        </div>
        <div className="responseMessageToPost">
           {this.state.responseToPost && <p>{this.state.responseToPost}</p>}
        </div>
      </div>
    );
  }
}

export default App;
