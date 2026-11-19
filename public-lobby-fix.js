(() => {
  const iframe = document.getElementById('game');

  function applyFix() {
    if (!iframe || !iframe.contentWindow) return;

    const w = iframe.contentWindow;

    try {
      w.pub = function (lobbyNumber) {
        const status = w.document.getElementById('ts');
        const lobbyId = 'brduck-pub-' + lobbyNumber;

        if (status) status.textContent = 'Entering Public Lobby ' + lobbyNumber + '...';
        if (w.peer) w.peer.destroy();

        w.peer = new w.Peer(lobbyId);

        w.peer.on('open', () => {
          w.myId = lobbyId;
          w.isHost = 1;
          w.hostSetup();

          const room = w.document.getElementById('room');
          if (room) room.textContent = 'PUBLIC LOBBY ' + lobbyNumber + ' (host)';

          w.start();
          w.say('You opened Public Lobby ' + lobbyNumber + '. Others can join it!', '#0ff');
        });

        w.peer.on('error', error => {
          if (error.type === 'unavailable-id') {
            w.joinTo(lobbyId, 'PUBLIC LOBBY ' + lobbyNumber);
          } else if (status) {
            status.textContent = 'Lobby error: ' + error.type;
          }
        });

        w.peer.on('disconnected', () => {
          if (w.peer && !w.peer.destroyed) w.peer.reconnect();
        });
      };

      w.joinTo = function (hostId, label, attempt = 1) {
        if (attempt > 8) {
          const status = w.document.getElementById('ts');
          if (status) status.textContent = 'Could not connect to the lobby. Please try again.';
          return;
        }

        const status = w.document.getElementById('ts');
        if (status) status.textContent = attempt === 1
          ? 'Connecting...'
          : 'Retrying lobby connection (' + attempt + '/8)...';

        if (w.peer) w.peer.destroy();
        w.peer = new w.Peer();

        let settled = false;

        w.peer.on('open', clientId => {
          w.myId = clientId;
          w.isHost = 0;

          const connection = w.peer.connect(hostId, { reliable: true });
          w.peers = [connection];
          w.wire(connection);

          connection.on('open', () => {
            settled = true;
            const room = w.document.getElementById('room');
            if (room) room.textContent = label;
            w.start();
            w.say('Connected: ' + label, '#0ff');
          });

          connection.on('error', () => {
            if (!settled) w.joinTo(hostId, label, attempt + 1);
          });

          connection.on('close', () => {
            if (w.started && !settled) w.joinTo(hostId, label, attempt + 1);
          });
        });

        w.peer.on('error', error => {
          if (error.type === 'peer-unavailable') {
            w.setTimeout(() => w.joinTo(hostId, label, attempt + 1), 750);
          } else if (status) {
            status.textContent = 'Lobby error: ' + error.type;
          }
        });

        w.setTimeout(() => {
          if (!settled && w.peer && !w.peer.destroyed) {
            w.joinTo(hostId, label, attempt + 1);
          }
        }, 5000);
      };

      const hostId = w.location && w.location.hash;
      if (hostId) {
        w.document.getElementById('rid')?.setAttribute('value', hostId.slice(1));
      }

      if (iframe.dataset.fixed !== '1') {
        iframe.dataset.fixed = '1';
        w.postMessage && w.postMessage({ cubertsLobbyFix: true }, '*');
      }
    } catch (error) {
      setTimeout(applyFix, 500);
    }
  }

  iframe.addEventListener('load', () => setTimeout(applyFix, 500));
  setTimeout(applyFix, 1000);
})();
