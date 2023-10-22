import logo from './logo.svg';
// import './App.css';
import React from 'react';
import { sdpFilterCodec } from './utils';
import {Col, Row} from 'antd'
import 'antd/dist/antd.css';


class MyApp extends React.Component {
  constructor(props) {
    super(props);
    this.localVideoRef = React.createRef()
    this.remoteVideoRef = React.createRef()
    this.state = {}
    console.log('cons')
  }
  componentDidMount() {
    console.log('mount')
    this.start()
  }

  async start() {
    this.pc = this.createPeerConnection();
    var pc = this.pc;

    // request an offer from the server
    var response = await fetch('http://localhost:8080/request-offer', { method: 'POST' });
    var offer = await response.json();
    await pc.setRemoteDescription(new RTCSessionDescription(offer));

    var answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    const data = {
      sdp: answer.sdp,
      type: answer.type
    };
    console.log(data);
    await fetch('http://localhost:8080/answer', {
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST'
    });
}

  async negotiate(pc) {
    var offer = await pc.createOffer()
    await pc.setLocalDescription(offer);
    await new Promise(function (resolve) {
      if (pc.iceGatheringState === 'complete') {
        resolve();
      } else {
        function checkState() {
          if (pc.iceGatheringState === 'complete') {
            pc.removeEventListener('icegatheringstatechange', checkState);
            resolve();
          }
        }
        pc.addEventListener('icegatheringstatechange', checkState);
      }
    });

    var codec;
    var offer = pc.localDescription

    codec = 'default'
    // offer.sdp = sdpFilterCodec('video', codec, offer.sdp);
    var response = await fetch('http://localhost:8080/offer', {
      body: JSON.stringify({
        sdp: offer.sdp,
        type: offer.type,
        video_transform: 'rotate'
      }),
      headers: {
        'Content-Type': 'application/json'
      },
      method: 'POST',
      // mode: 'no-cors'
    });
    var answer = await response.json();
    console.log(answer);
    await pc.setRemoteDescription(answer);
  }

  createPeerConnection() {
    var config = {
      sdpSemantics: 'unified-plan'
    };

    var pc = new RTCPeerConnection(config);

    // connect audio / video
    pc.addEventListener('track', (evt) => {
      if (evt.track.kind == 'video') {
        console.log(evt);
        this.remoteVideoRef.current.srcObject = evt.streams[0];
      }
      else
        ;
      // document.getElementById('audio').srcObject = evt.streams[0];
    });
    return pc;
  }

  render() {
    return (
      <div>
          <Row>
            <Col span={8}>
              <video id="remoteVideo" autoPlay playsInline controls={true} ref={this.remoteVideoRef}></video>
            </Col>
          </Row>
      </div>
    );

  }
}

export default MyApp;
