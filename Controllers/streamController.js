const axios = require('axios');
const ngrok = require('ngrok');
const http = require('http');
const io = require('socket.io');

const downloadNgrok = require('ngrok/download');

downloadNgrok((error) => {
  if (error) {
    console.error('Error downloading ngrok:', error);
  } else {
    console.log('ngrok binary downloaded and unpacked successfully');
  }
});

let assignedPort;
let socketServer;
let activeTunnels = []; // Array to store the active ngrok tunnels

const handleStream = async (req, res) => {
  const url = req.body.url;

  try {
    const server = http.createServer((req, serverResponse) => {
      const requestChunk = async () => {
        try {
          const response = await axios.get(url, {
            responseType: 'stream',
          });

          response.data.on('data', (chunk) => {
            serverResponse.write(chunk);
          });

          response.data.on('end', () => {
            requestChunk(); // Request the next chunk when the current one ends
          });

          response.data.on('error', (error) => {
            console.error('Stream encountered an error:', error);
          });
        } catch (error) {
          console.error('Error fetching chunk:', error);
        }
      };

      requestChunk(); // Start requesting the first chunk

      serverResponse.on('close', () => {
        console.log('Connection closed by the client');
       
      });
    });

    server.listen(0, () => {
      assignedPort = server.address().port;
      console.log(`Server is running on port ${assignedPort}`);
      console.log(`http://localhost:${assignedPort}`);

      // Start the server and expose it with ngrok
      const startNgrok = async () => {
        // Check the number of active tunnels
        if (activeTunnels.length >= 3) {
          // Close the oldest connection
          const oldestTunnelUrl = activeTunnels.shift();
          ngrok.disconnect(oldestTunnelUrl);
          console.log(`Closed the oldest tunnel: ${oldestTunnelUrl}`);
        }

        // Ensure that the assignedPort is populated before calling ngrok.connect()
        if (assignedPort) {
          try {
            const ngrokUrl = await ngrok.connect({
              authtoken: '2KVGmlxJUHWrgTXlIU9wtesvpM3_39DmFsdbs5eBcQsustWvy',
              addr: assignedPort, // Use the available port
              region: 'in', 
            });

            // Add the ngrok URL to the active tunnels array
            activeTunnels.push(ngrokUrl);

            console.log('ngrok connected:', ngrokUrl);

            // Close ngrok connection when Node.js exits
            process.on('exit', () => {
              ngrok.kill();
            });

            const startSocketServer = async (port) => {
              if (socketServer) {
                socketServer.close();
              }

              socketServer = http.createServer();
              const responseio = io(socketServer, {
                cors: {
                  origin: '*',
                  methods: ['GET', 'POST'],
                },
              });

              responseio.on('connection', (socket) => {
                console.log('A user connected');
                socket.send(ngrokUrl); // Send the ngrok URL to the client

                socket.on('error', console.error);
              });

              socketServer.listen(port, () => {
                console.log(`Socket server listening on port ${port}`);
              });

              // Close the socket server when it's no longer needed
              socketServer.on('close', () => {
                console.log(`Socket server on port ${port} closed`);
              });
            };

            startSocketServer(8080);
          } catch (error) {
            console.error('Error starting ngrok:', error);
          }
        } else {
          console.error('Assigned port is not available');
        }
      };

      startNgrok();
    });
  } catch (error) {
    console.error('Error handling stream:', error);
    res.statusCode = 500;
    res.end('Internal Server Error');
  }
};

module.exports = { handleStream };
