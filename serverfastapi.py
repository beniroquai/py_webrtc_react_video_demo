import argparse
import logging
import os
import ssl
import uuid
import numpy as np
import fractions
from fastapi import FastAPI, Request, WebSocket, Depends, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from starlette.websockets import WebSocketDisconnect
from starlette.middleware.cors import CORSMiddleware
from av import VideoFrame
from aiortc import MediaStreamTrack, RTCPeerConnection, RTCSessionDescription
from aiortc.contrib.media import MediaBlackhole, MediaRelay
import uvicorn
from pydantic import BaseModel

class AnswerData(BaseModel):
    sdp: str
    type_: str
    
ROOT = os.path.dirname(__file__)

logger = logging.getLogger("pc")
pcs = set()
relay = MediaRelay()

app = FastAPI(debug=True)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class VideoTransformTrack(MediaStreamTrack):
    kind = "video"

    def __init__(self, track, transform):
        super().__init__()
        self.track = track
        self.transform = transform
        self.count = 0

    async def recv(self):
        img = np.random.randint(0, 155, (150, 300, 3)).astype('uint8')
        new_frame = VideoFrame.from_ndarray(img, format="bgr24")
        new_frame.pts = self.count
        self.count += 1
        new_frame.time_base = fractions.Fraction(1, 1000)
        return new_frame

@app.get("/")
async def index():
    return FileResponse(os.path.join(ROOT, "index.html"))

@app.get("/client.js")
async def javascript():
    return FileResponse(os.path.join(ROOT, "client.js"))

@app.post("/request-offer")
async def request_offer():
    pc = RTCPeerConnection()
    pc_id = "PeerConnection(%s)" % uuid.uuid4()
    pcs.add(pc)
    pc.addTrack(VideoTransformTrack(relay, transform="rotate"))

    offer = await pc.createOffer()
    await pc.setLocalDescription(offer)

    return JSONResponse(content={"sdp": pc.localDescription.sdp, "type": pc.localDescription.type})

from fastapi import HTTPException

@app.post("/answer")
async def answer(data: RTCSessionDescription):
    try:
        pc = next(iter(pcs))
        answer = RTCSessionDescription(sdp=data.sdp, type=data.type)
        await pc.setRemoteDescription(answer)
        return JSONResponse(status_code=200)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))




if __name__ == "__main__":
    logging.basicConfig(level=logging.DEBUG)
    
    host = "localhost"
    port = 8080
    cert_file = None
    ssl_context = None


    uvicorn.run(app, host=host, port=port)

